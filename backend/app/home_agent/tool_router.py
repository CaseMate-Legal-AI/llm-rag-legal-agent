"""
규칙 기반 도구 라우팅

7개 규칙으로 명확한 패턴은 LLM 없이 바로 도구 결정:
1. search_laws - 법조문 번호 (형법 제307조)
2. summarize_precedent - 판례번호 (2024도1234)
3. generate_timeline - "타임라인" 키워드
4. generate_relationship - "관계도" 키워드
5. get_case_evidence - "증거" 키워드
6. get_case_similar_precedents - "유사 판례" 키워드
7. navigate_to_document_editor - 문서 타입 (고소장/소장/...)

나머지는 LLM(Router/Agent)이 판단.
"""

import re
import logging
from typing import NamedTuple

logger = logging.getLogger(__name__)


# ── 규칙 정의 ────────────────────────────────────────────────

# 단순 규칙: 패턴 매칭 → 바로 도구 호출
SIMPLE_RULES = {
    "search_laws": {
        "pattern": re.compile(
            r"(형법|민법|상법|헌법|형사소송법|민사소송법|행정법|"
            r"근로기준법|국세기본법|부가가치세법|소득세법|"
            r"민사집행법|가사소송법|행정소송법|국가배상법|"
            r"도로교통법|특정범죄가중처벌|성폭력범죄의처벌|"
            r"아동학대범죄의처벌|정보통신망이용촉진|개인정보보호법)"
            r"\s*제?\s*(\d+)조"
        ),
        "param_extractor": lambda m, q: {"query": f"{m.group(1)} 제{m.group(2)}조"},
    },
    "summarize_precedent": {
        "pattern": re.compile(
            r"(\d{2,4})\s*(도|다|고|나|노|구합|가합|카|마|스|무|초|고단|고합|노단)\s*(\d+)"
        ),
        "param_extractor": lambda m, q: {"case_number": f"{m.group(1)}{m.group(2)}{m.group(3)}"},
    },
}

# 체인 규칙: 키워드 매칭 → 선행 작업 체인 실행
CHAIN_RULES = {
    "generate_timeline": {
        "keywords": ["타임라인", "timeline", "시간순", "연대기"],
        "chain": ["list_cases", "analyze_case", "generate_timeline"],
        "param_key": "case_id",  # 사건 ID 필요
    },
    "generate_relationship": {
        "keywords": ["관계도", "인물관계", "인물도", "관계 분석"],
        "chain": ["list_cases", "analyze_case", "generate_relationship"],
        "param_key": "case_id",
    },
    "get_case_evidence": {
        # "증거" 단독은 일반 법률 질문일 수 있으므로, "사건"과 함께 언급될 때만 매칭
        "keywords": ["사건 증거", "사건의 증거", "등록된 증거", "증거 목록 보여", "증거 현황 보여", "증거자료 보여"],
        "chain": ["list_cases", "get_case_evidence"],  # analyze 불필요
        "param_key": "case_id",
    },
    "get_case_similar_precedents": {
        # "유사 판례" 단독은 일반 검색일 수 있으므로, "사건"과 함께 언급될 때만 매칭
        "keywords": ["사건 유사 판례", "사건의 유사 판례", "사건 관련 판례", "저장된 유사 판례", "저장한 판례"],
        "chain": ["list_cases", "get_case_similar_precedents"],  # analyze 불필요
        "param_key": "case_id",
    },
    "navigate_to_document_editor": {
        "keywords": ["고소장", "소장", "내용증명", "준비서면", "합의서", "법률의견서", "법률 의견서"],
        "chain": ["list_cases", "navigate_to_document_editor"],
        "param_key": "case_id",
        "extract_doc_type": True,  # document_type 파라미터 추출 필요
    },
}

# 자동 사건 선택 키워드 (첫 번째 사건 자동 선택)
AUTO_SELECT_KEYWORDS = [
    "최근 사건", "최신 사건", "마지막 사건", "새 사건", "이번 사건",
    "새로 수임한 사건", "방금 등록한 사건", "작업하던 사건", "아까 그 사건",
]


# ── 결과 타입 ────────────────────────────────────────────────

class RuleMatchResult(NamedTuple):
    matched: bool
    rule_type: str  # "simple", "chain", "none"
    tool_name: str | None
    params: dict
    chain: list[str] | None  # 체인 규칙일 때 실행할 도구 순서
    needs_case_selection: bool  # 사건 선택 필요 여부
    auto_select_first: bool  # 첫 번째 사건 자동 선택
    ask_question: str | None  # 사건 미특정 시 역질문


# ── 매칭 함수 ────────────────────────────────────────────────

def match_rule(query: str, state: dict = None) -> RuleMatchResult:
    """
    쿼리를 규칙과 매칭하여 결과 반환.

    Args:
        query: 사용자 쿼리
        state: 현재 상태 (이전 대화에서 case_id 추출용)

    Returns:
        RuleMatchResult
    """
    query_lower = query.lower().strip()

    # 1. 단순 규칙 체크 (패턴 매칭)
    for tool_name, rule in SIMPLE_RULES.items():
        match = rule["pattern"].search(query)
        if match:
            params = rule["param_extractor"](match, query)
            logger.info(f"[ToolRouter] 단순 규칙 매칭: {tool_name}, params={params}")
            return RuleMatchResult(
                matched=True,
                rule_type="simple",
                tool_name=tool_name,
                params=params,
                chain=None,
                needs_case_selection=False,
                auto_select_first=False,
                ask_question=None,
            )

    # 2. 체인 규칙 체크 (키워드 매칭)
    for tool_name, rule in CHAIN_RULES.items():
        if any(kw in query_lower for kw in rule["keywords"]):
            # 사건 컨텍스트 확인
            case_context = _extract_case_context(query, state)

            params = {}
            chain = rule["chain"].copy()

            # 문서 타입 추출 (navigate_to_document_editor)
            if rule.get("extract_doc_type"):
                doc_type = _extract_document_type(query)
                if doc_type:
                    params["document_type"] = doc_type

            # 사건이 특정된 경우
            if case_context["case_id"]:
                params["case_id"] = case_context["case_id"]
                # list_cases 스킵 (이미 사건 ID 있음)
                if "list_cases" in chain:
                    chain.remove("list_cases")
                # 분석 완료 확인
                if case_context["already_analyzed"] and "analyze_case" in chain:
                    chain.remove("analyze_case")

                logger.info(f"[ToolRouter] 체인 규칙 매칭: {tool_name}, chain={chain}, params={params}")
                return RuleMatchResult(
                    matched=True,
                    rule_type="chain",
                    tool_name=tool_name,
                    params=params,
                    chain=chain,
                    needs_case_selection=False,
                    auto_select_first=False,
                    ask_question=None,
                )

            # 자동 선택 키워드 확인
            if case_context["auto_select_first"]:
                logger.info(f"[ToolRouter] 체인 규칙 매칭 (자동선택): {tool_name}")
                return RuleMatchResult(
                    matched=True,
                    rule_type="chain",
                    tool_name=tool_name,
                    params=params,
                    chain=chain,
                    needs_case_selection=True,
                    auto_select_first=True,
                    ask_question=None,
                )

            # 사건명으로 검색 필요
            if case_context["case_name"]:
                params["search_query"] = case_context["case_name"]
                logger.info(f"[ToolRouter] 체인 규칙 매칭 (사건명 검색): {tool_name}, search={case_context['case_name']}")
                return RuleMatchResult(
                    matched=True,
                    rule_type="chain",
                    tool_name=tool_name,
                    params=params,
                    chain=chain,
                    needs_case_selection=True,
                    auto_select_first=False,
                    ask_question=None,
                )

            # 사건 미특정 → 역질문
            question = _get_case_question(tool_name)
            logger.info(f"[ToolRouter] 체인 규칙 매칭 (역질문 필요): {tool_name}")
            return RuleMatchResult(
                matched=True,
                rule_type="chain",
                tool_name=tool_name,
                params=params,
                chain=chain,
                needs_case_selection=True,
                auto_select_first=False,
                ask_question=question,
            )

    # 매칭 없음 → LLM 판단
    return RuleMatchResult(
        matched=False,
        rule_type="none",
        tool_name=None,
        params={},
        chain=None,
        needs_case_selection=False,
        auto_select_first=False,
        ask_question=None,
    )


# ── 헬퍼 함수 ────────────────────────────────────────────────

def _extract_case_context(query: str, state: dict = None) -> dict:
    """쿼리와 상태에서 사건 컨텍스트 추출"""
    result = {
        "case_id": None,
        "case_name": None,
        "auto_select_first": False,
        "already_analyzed": False,
    }

    # 1. 이전 대화에서 case_id 추출 (우선)
    # "아까 그 사건" 등은 이전 대화의 사건을 의미하므로 먼저 체크
    if state and "messages" in state:
        recent_case_id = _get_recent_case_id(state["messages"])
        if recent_case_id:
            result["case_id"] = recent_case_id
            result["already_analyzed"] = _check_already_analyzed(state["messages"], recent_case_id)
            logger.info(f"[ToolRouter] 이전 대화에서 case_id 추출: {recent_case_id}")
            return result

    # 2. 자동 선택 키워드 체크 (이전 대화에 case_id 없을 때만)
    if any(kw in query for kw in AUTO_SELECT_KEYWORDS):
        result["auto_select_first"] = True
        return result

    # 3. 쿼리에서 사건명/의뢰인명 추출
    # "김철수 사건", "홍길동 건", "ABC 사건" 등
    case_name_patterns = [
        r"([가-힣]{2,4})\s*사건",  # 홍길동 사건
        r"([가-힣]{2,4})\s*건",    # 홍길동 건
        r"([A-Za-z가-힣0-9]+)\s*사건",  # ABC 사건
    ]
    for pattern in case_name_patterns:
        match = re.search(pattern, query)
        if match:
            result["case_name"] = match.group(1)
            return result

    return result


def _get_recent_case_id(messages: list) -> int | None:
    """최근 대화에서 사용된 case_id 추출"""
    # 역순으로 탐색하여 가장 최근 case_id 찾기
    for msg in reversed(messages):
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                case_id = tc.get("args", {}).get("case_id")
                if case_id is not None:
                    return case_id
    return None


def _check_already_analyzed(messages: list, case_id: int) -> bool:
    """해당 case_id가 이미 분석됐는지 확인

    AIMessage의 tool_calls에서 analyze_case(case_id=X) 호출 여부 확인
    """
    from langchain_core.messages import AIMessage

    for msg in messages:
        if isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                if tc.get("name") == "analyze_case":
                    called_case_id = tc.get("args", {}).get("case_id")
                    if called_case_id == case_id:
                        logger.info(f"[ToolRouter] case_id={case_id} 이미 분석됨")
                        return True
    return False


def _extract_document_type(query: str) -> str | None:
    """쿼리에서 문서 타입 추출"""
    doc_types = {
        "고소장": "고소장",
        "소장": "소장",
        "내용증명": "내용증명",
        "준비서면": "준비서면",
        "합의서": "합의서",
        "법률의견서": "법률의견서",
        "법률 의견서": "법률의견서",
    }
    for keyword, doc_type in doc_types.items():
        if keyword in query:
            return doc_type
    return None


def _get_case_question(tool_name: str) -> str:
    """도구별 역질문 생성"""
    questions = {
        "generate_timeline": "어떤 사건의 타임라인을 만들까요? 사건명이나 의뢰인명을 말씀해주세요.",
        "generate_relationship": "어떤 사건의 관계도를 만들까요? 사건명이나 의뢰인명을 말씀해주세요.",
        "get_case_evidence": "어떤 사건의 증거를 조회할까요? 사건명이나 의뢰인명을 말씀해주세요.",
        "get_case_similar_precedents": "어떤 사건의 유사 판례를 찾을까요? 사건명이나 의뢰인명을 말씀해주세요.",
        "navigate_to_document_editor": "어떤 사건의 문서를 작성할까요? 사건명이나 의뢰인명을 말씀해주세요.",
    }
    return questions.get(tool_name, "어떤 사건을 선택할까요?")
