# CaseMate MVP — AI/LLM 개발 토탈 자습서 v.1

> **2026-02-26 작성** · 최종 취합 기준 (CaseMate-Legal-AI/llm-rag-legal-agent main)
> "이 프로젝트의 모든 기술적 결정과 구현을 설명할 수 있는 수준"을 목표로 작성

---

## 목차

| # | 섹션 | 핵심 질문 |
|---|------|----------|
| 1 | [프로젝트 전체 그림](#1-프로젝트-전체-그림) | 이 앱이 뭐고, 뭘 하는 건가? |
| 2 | [기술 스택과 선택 이유](#2-기술-스택과-선택-이유) | 왜 이 기술을 골랐나? |
| 3 | [AI 이론 기초](#3-ai-이론-기초) | RAG, 벡터검색, 임베딩이 뭔가? |
| 4 | [데이터베이스 모델 전체 해부](#4-데이터베이스-모델-전체-해부) | 테이블이 어떻게 연결되나? |
| 5 | [기능 ①: 사건 분석 + 캐싱 전략](#5-기능-①-사건-분석--캐싱-전략) | description_hash가 뭔가? |
| 6 | [기능 ②: 법령 검색 (2단계 파이프라인)](#6-기능-②-법령-검색) | GPT가 먼저 쟁점을 추출한다? |
| 7 | [기능 ③: 판례 검색 (하이브리드 RAG)](#7-기능-③-판례-검색-하이브리드-rag) | Dense+Sparse+RRF란? |
| 8 | [기능 ④: 유사 판례 추천](#8-기능-④-유사-판례-추천) | 청크 단위 유사도란? |
| 9 | [기능 ⑤: 판례 요약](#9-기능-⑤-판례-요약) | 구조화된 4단계 요약이란? |
| 10 | [기능 ⑥: 판례 비교 분석 (RAG 기반)](#10-기능-⑥-판례-비교-분석) | IRAC 프레임워크란? |
| 11 | [기능 ⑦: 증거 처리 (OCR/STT/VLM)](#11-기능-⑦-증거-처리) | 왜 VLM-only로 갔나? |
| 12 | [기능 ⑧: 타임라인 자동 생성](#12-기능-⑧-타임라인-자동-생성) | 증거↔이벤트 자동 매칭? |
| 13 | [기능 ⑨: 인물관계도 자동 생성](#13-기능-⑨-인물관계도-자동-생성) | 3단계 데이터 소스 우선순위? |
| 14 | [기능 ⑩: 법률 문서 AI 초안](#14-기능-⑩-법률-문서-ai-초안) | 3-Stage RAG Generation이란? |
| 15 | [기능 ⑪: 홈 에이전트 (LangGraph 5-Node)](#15-기능-⑪-홈-에이전트) | 멀티홉 에이전트란? |
| 16 | [SSE 스트리밍 & 프론트엔드 아키텍처](#16-sse-스트리밍--프론트엔드-아키텍처) | 실시간 이벤트 7종이란? |
| 17 | [벡터 DB (Qdrant) 심화](#17-벡터-db-qdrant-심화) | Prefetch + RRF 파이프라인? |
| 18 | [GPT 모델 비용 최적화](#18-gpt-모델-비용-최적화) | 왜 모델을 3개로 나눠 쓰나? |
| 19 | [캐싱과 데이터 의존성 관리](#19-캐싱과-데이터-의존성-관리) | 재분석 시 뭐가 무효화되나? |
| 20 | [보안 · 인증 · 배포](#20-보안--인증--배포) | JWT, IDOR, Docker, Vercel? |
| 21 | [팀원별 기여 분석: DaHee05 심층 해부](#21-dahee05-심층-해부) | 왜 이렇게 설계했나? |
| 22 | [팀원별 기여 분석: hdju 심층 해부](#22-hdju-심층-해부) | VLM-only 결정의 이유? |
| 23 | [팀원별 기여 분석: dayforged 심층 해부](#23-dayforged-심층-해부) | 에이전트 설계 철학? |
| 24 | [AI 디자인 패턴 총정리](#24-ai-디자인-패턴-총정리) | 프로젝트에 적용된 패턴 12가지 |
| 25 | [시행착오와 기술적 도전](#25-시행착오와-기술적-도전) | 뭘 시도했고 왜 바꿨나? |
| 26 | [API 엔드포인트 전체 목록](#26-api-엔드포인트-전체-목록) | 모든 API 한눈에 |
| 27 | [프론트엔드 컴포넌트 구조](#27-프론트엔드-컴포넌트-구조) | 페이지별 상세 해부 |
| 28 | [용어 사전](#28-용어-사전) | 모르는 단어 찾기 |

---

## 1. 프로젝트 전체 그림

### 이 앱이 뭔가요?

**CaseMate** = 변호사·법무사를 위한 "AI 법률 비서" 웹 서비스.

사건을 등록하면 AI가:
- 사건 내용을 분석해서 요약·사실관계·쟁점 정리
- 관련 법 조문을 찾아주고
- 비슷한 판례를 30만+ DB에서 검색·비교 분석
- 타임라인과 인물관계도를 자동 생성
- 법률 문서(고소장, 소장 등) 초안까지 작성

**일반 ChatGPT와 다른 점**: DB에 저장된 사건·증거·판례를 **직접 조회**해서 답변. 데이터 근거 답변 (Self-RAG).

### 팀 구성

| 팀원 | 담당 | 핵심 기여 |
|------|------|----------|
| **dayforged** | 홈 에이전트, 사건분석, 초안작성, 프론트엔드 UI/UX | LangGraph 5-Node + 11도구, 캐싱 전략, 보안 강화 |
| **DaHee05** | 판례 검색/비교분석, 홈 에이전트, AWS 배포 | 하이브리드 RAG, 서비스 분리, 배포 파이프라인 |
| **hdju** | 타임라인, 관계도, 증거 관리/분석 | VLM 파이프라인, 문서 생성, 멀티모달 처리 |

### 11개 AI 기능 전체 맵

```
┌─────────────────────────────────────────────────────────┐
│                    홈 에이전트 (⑪)                       │
│         LangGraph 5-Node · 11개 도구 · SSE 스트리밍       │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ ① 사건분석│ │ ② 법령검색│ │ ③ 판례검색│ │ ④ 유사판례│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ ⑤ 판례요약│ │ ⑥ 판례비교│ │ ⑦ 증거처리│ │ ⑧ 타임라인│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ ⑨ 관계도 │ │ ⑩ 문서초안│ │ ⑪ RAG통합 │               │
│  └──────────┘ └──────────┘ └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택과 선택 이유

| 영역 | 기술 | 왜 이걸 골랐나? |
|------|------|---------------|
| **Backend** | FastAPI + Python 3.11 | 비동기 SSE 스트리밍 네이티브 지원, 타입 힌트 |
| **Frontend** | React 19 + TypeScript + Vite | 최신 React 생태계, 빠른 HMR, 타입 안전성 |
| **UI** | Tailwind CSS + Radix UI (shadcn/ui) | 접근성(a11y) 내장, 커스텀 쉬움 |
| **AI Agent** | LangGraph + LangChain | StateGraph로 멀티홉 흐름 제어, 도구 오케스트레이션 |
| **LLM** | GPT-4o (Generator) + GPT-4o-mini (Router/Agent) | 비용 최적화: 분류는 경량, 생성은 고품질 |
| **Vector DB** | Qdrant | Dense+Sparse 동시 지원, Prefetch+RRF 내장 |
| **임베딩** | KURE v1 (한국어 법률) + FastEmbed BM25 | 한국어 도메인 특화 + 키워드 정확도 |
| **DB** | PostgreSQL (Supabase) | 관리형 + Row Level Security + Storage |
| **실시간** | SSE (Server-Sent Events) | WebSocket보다 단순, 단방향 스트리밍에 최적 |
| **시각화** | React Flow + dagre | 인물관계도 그래프 레이아웃 |
| **에디터** | Tiptap | 법률 문서 서식 유지, 커스텀 Extension 지원 |

---

## 3. AI 이론 기초

### RAG (Retrieval-Augmented Generation)

```
사용자 질문 → [검색(Retrieval)] → 관련 문서 → [생성(Generation)] → 근거 있는 답변
```

**왜 필요한가?**: GPT 단독은 "아는 척 지어내기(Hallucination)" 위험. 실제 판례/법조문을 검색해서 넘겨주면 환각 대폭 감소.

### 벡터 임베딩

텍스트를 숫자 벡터(배열)로 변환. 의미가 비슷하면 벡터도 가까움.

```
"사기죄 구성요건" → [0.12, -0.45, 0.78, ...]  (1024차원)
"사기범죄 성립요건" → [0.11, -0.44, 0.79, ...]  ← 거의 같은 벡터!
"오늘 날씨 좋다"   → [0.89, 0.23, -0.56, ...]  ← 완전 다른 벡터
```

### Dense vs Sparse 검색

| 방식 | 원리 | 강점 | 약점 |
|------|------|------|------|
| **Dense** (의미 검색) | 임베딩 벡터 코사인 유사도 | "명예훼손" = "비방" 연결 | "형법 제307조" 정확 매칭 못함 |
| **Sparse** (키워드 검색) | BM25 토큰 빈도 | "형법 제307조" 정확 매칭 | 동의어 인식 못함 |
| **Hybrid** (둘 다) | Dense + Sparse 결합 | 양쪽 장점 | 가중치 튜닝 필요 |

### RRF (Reciprocal Rank Fusion)

두 검색 결과의 순위를 결합하는 공식:

```
최종점수 = 1/(Dense순위 + k) + 1/(Sparse순위 + k)
```

Dense에서 3위 + Sparse에서 1위인 문서 → 두 점수를 합산하면 상위로 올라옴.

---

## 4. 데이터베이스 모델 전체 해부

### 핵심 테이블 관계도

```
User ──┬── LawFirm (firm_id로 격리)
       │
       └── Case ──┬── CaseAnalysis (1:1, 분석 결과 캐시)
                  │   ├── summary, facts, claims
                  │   ├── crime_names, legal_keywords (JSON)
                  │   ├── description_hash (SHA256 → stale 감지)
                  │   └── analyzed_at (타임스탬프)
                  │
                  ├── CaseEvidenceMapping ── Evidence
                  │                          └── EvidenceAnalysis
                  │
                  ├── TimeLine (자동 생성, CaseAnalysis 의존)
                  │
                  ├── CasePerson ── CaseRelationship (관계도)
                  │
                  ├── CaseDocumentDraft (초안 캐시)
                  │   └── description_hash (원문 변경 감지)
                  │
                  └── SimilarPrecedent (비교 분석 캐시)
                      └── case_id + case_number (최대 10건)
```

### CaseAnalysis — 가장 중요한 테이블

```python
class CaseAnalysis:
    case_id          # FK → Case (UNIQUE, 사건당 1개)
    summary          # AI 요약 (TEXT)
    facts            # 사실관계 (TEXT, Markdown)
    claims           # 청구사항/쟁점 (TEXT, Markdown)
    crime_names      # ["명예훼손죄", "모욕죄"] (JSON)
    legal_keywords   # ["허위사실 적시", "공연성"] (JSON)
    legal_laws       # ["형법 제307조", "정보통신망법 제70조"] (JSON)
    legal_search_results  # 법령 검색 전체 결과 (JSON, 캐시)
    description_hash # SHA256(case.description) → 원문 변경 감지
    analyzed_at      # 분석 실행 시점
```

**왜 이렇게 설계했나?**:
- `description_hash`: 사건 설명문이 바뀌면 분석이 stale. 해시로 즉시 감지
- `legal_search_results`: 법령 검색은 비용이 큼(GPT+Qdrant). 결과를 통째로 캐싱
- `crime_names` vs `legal_keywords` 분리: 문서 생성에서 "적용 범죄"와 "법적 쟁점"은 다르게 사용

---

## 5. 기능 ①: 사건 분석 + 캐싱 전략

> 파일: `backend/app/api/v1/case_api.py:478-792`

### 분석 흐름

```
POST /cases/{id}/analyze
  ↓
1. 사건 description + 증거 내용 취합
  ↓
2. GPT-4o에 시스템 프롬프트 + 사건 내용 전송
  ↓
3. 구조화된 응답 파싱:
   { summary, facts, claims, crime_names, legal_keywords, legal_laws }
  ↓
4. SHA256(description) 해시 저장
  ↓
5. CaseAnalysis 테이블에 INSERT/UPDATE
  ↓
6. [Background Task] 자동 후속 작업:
   ├── 기존 타임라인 삭제 → 재생성
   ├── 기존 관계도 삭제 → 재생성
   └── 증거 재분석 (사건 맥락 반영)
```

### Stale 감지 메커니즘

```python
# GET /cases/{id} 시 stale 체크
current_hash = hashlib.sha256(case.description.encode()).hexdigest()
analysis_stale = (stored_hash != current_hash)
# → 프론트에 analysis_stale=true 전달 → "재분석 필요" 알림
```

**왜 타임스탬프가 아니라 해시인가?**
- 타임스탬프: "3시에 수정, 2시에 분석" → stale 판정 O
- 그런데: "3시에 수정했는데 내용은 안 바뀜" → 타임스탬프는 false positive
- 해시: 내용이 진짜 바뀌었을 때만 stale → 불필요한 재분석 방지

---

## 6. 기능 ②: 법령 검색

> 파일: `backend/app/services/search_laws_service.py`

### 2단계 파이프라인

```
사건 분석 결과 (summary + facts + claims + case_type)
  ↓
[Stage 1: GPT-4o-mini로 법적 쟁점 추출]
  → { crime_names: ["명예훼손"], keywords: ["허위사실"], laws: ["형법 제307조"] }
  ↓
[Stage 2: Qdrant 하이브리드 검색]
  → laws_hybrid 컬렉션에서 Dense+Sparse+RRF
  ↓
[후처리: 중복 제거]
  → 같은 조문의 여러 청크 → 부모 조문당 최대 2개
```

**왜 2단계인가?**: 사건 설명문 그대로 검색하면 노이즈가 많음. GPT가 먼저 "이 사건에 적용될 법률 쟁점"을 추출하고, 그걸로 검색하면 정확도 대폭 향상.

---

## 7. 기능 ③: 판례 검색 (하이브리드 RAG)

> 파일: `backend/app/services/precedent_search_service.py`
> 담당: DaHee05

### 검색 파이프라인 상세

```
사용자 쿼리: "직장내 괴롭힘 판례"
  ↓
[1. 동의어 확장]
  "괴롭힘" → ["괴롭힘", "직장내괴롭힘", "갑질", "왕따"]
  ↓
[2. 병렬 임베딩 생성]
  ├── Dense: KURE v1 임베딩 (1024차원)
  └── Sparse: FastEmbed BM25 토큰화
  ↓
[3. Qdrant Prefetch + RRF]
  ├── Dense 검색 → 내부 limit × 3 건
  ├── Sparse 검색 → 내부 limit × 3 건
  └── RRF 결합 → 최종 점수
  ↓
[4. 필터링]
  court_type, case_type, period (날짜 범위)
  ↓
[5. Python 후처리]
  ├── 섹션 가중치 (판시사항 1.3배, 판결요지 1.3배)
  ├── 키워드 부스팅 (전체 구문 매칭 3.0배)
  ├── 불용어 제거
  └── 같은 판례번호 청크 병합
  ↓
최종 정렬된 결과 반환
```

### 동의어 사전 (SYNONYM_MAP)

DaHee가 구축한 100+ 매핑. **왜 필요한가?**

법률 용어와 일상 용어 간 갭이 매우 큼:

```python
SYNONYM_MAP = {
    "카카오톡": ["정보통신망", "온라인", "메신저"],
    "악플": ["모욕", "비방", "명예훼손"],
    "갑질": ["괴롭힘", "직장내괴롭힘"],
    "왕따": ["따돌림", "괴롭힘", "집단따돌림"],
    "몰카": ["촬영", "카메라등이용촬영", "불법촬영"],
    ...
}
```

일반 사용자가 "카톡으로 협박받았어요"라고 검색하면, 벡터 검색만으로는 "정보통신망을 이용한 협박" 판례를 못 찾을 수 있음. 동의어 확장으로 해결.

### 섹션 가중치

판례는 여러 섹션으로 구성됨:
- 【판시사항】→ 법원의 핵심 판단 (가장 중요) → **1.3배**
- 【판결요지】→ 판결 요약 (중요) → **1.3배**
- 【사건명】→ 사건 제목 → **1.2배**
- 나머지 → 1.0배

---

## 8. 기능 ④: 유사 판례 추천

> 파일: `backend/app/services/precedent_similar_service.py`
> 담당: DaHee05

### 아키텍처 변천사 (중요!)

**v0 (초기)**: `similar_search_service.py` — Dense+Sparse 가중치 결합 (0.4:0.6)
- **문제**: 배치 쿼리에서 점수 불일치, 가중치 튜닝 어려움

**v1 (리팩토링)**: 3개 서비스로 분리
- `PrecedentEmbeddingService` — 임베딩만 담당 (Single Responsibility)
- `PrecedentRepository` — Qdrant/PostgreSQL 데이터 접근만 담당
- `PrecedentSimilarService` — 검색 오케스트레이션만 담당

**왜 분리했나?** (DaHee의 설계 결정):
1. 임베딩 로직은 검색뿐 아니라 데이터 적재에도 재사용
2. Qdrant 접근은 검색/상세조회/배치조회 등 여러 패턴
3. 각각 독립 테스트·교체 가능 (예: KURE → OpenAI 전환)

### 스레드 안전 싱글톤 패턴

```python
_sparse_model = None
_sparse_lock = threading.Lock()

def get_sparse_model():
    global _sparse_model
    if _sparse_model is None:
        with _sparse_lock:              # 동시 접근 방지
            if _sparse_model is None:   # Double-check locking
                _sparse_model = SparseTextEmbedding(...)
    return _sparse_model
```

**왜 이렇게?**: FastAPI는 멀티스레드. 2개 요청이 동시에 오면 모델이 2번 로딩될 수 있음. Lock으로 방지.

### LRU 캐시

```python
@lru_cache(maxsize=500)
def create_dense_embedding(text: str) -> List[float]:
    return openai.embeddings.create(input=text, ...)
```

같은 쿼리가 반복되면 API 호출 없이 캐시에서 반환. ~3MB 메모리로 500개 쿼리 커버.

---

## 9. 기능 ⑤: 판례 요약

> 파일: `backend/app/services/precedent_summary_service.py`, `backend/app/prompts/summary_prompt.py`
> 담당: DaHee05

### 구조화된 4단계 요약

```
[결과 요약] → "원고 승소" / "피고인 무죄" 등 한 줄
[사실관계] → 음슴체(~했음, ~였음)로 시간순 정리
[법리 분석] → 법원의 핵심 판단 근거
[실무 포인트] → ~습니다 체로 실무 적용 시사점
```

**왜 음슴체/습니다체를 분리했나?**
- 사실관계는 객관적 서술 → "~했음" (간결, 감정 배제)
- 실무 포인트는 전문적 조언 → "~습니다" (예의, 신뢰감)

### 캐싱

`precedent_summaries` 테이블에 case_number별 저장. 같은 판례 재요약 시 GPT 호출 없이 반환.

---

## 10. 기능 ⑥: 판례 비교 분석

> 파일: `backend/app/services/comparison_service.py`, `backend/app/prompts/comparison_prompt.py`
> 담당: DaHee05

### RAG 기반 비교 흐름

```
현재 사건 (사실관계 + 청구내용)
  +
유사 판례 (전문 또는 요약)
  ↓
[비교 분석 프롬프트]
  ├── 현재 사건 개요
  ├── 유사 판례 요약
  ├── 유사점 분석 (법적 쟁점, 사실관계)
  ├── 차이점 분석 (결과에 영향을 줄 부분)
  └── 전략적 시사점 (입증 방법, 주의사항)
  ↓
결과를 similar_precedents 테이블에 캐싱
```

**왜 단순 비교가 아니라 "전략적 시사점"까지?**

변호사에게 필요한 건:
- ❌ "이 판례와 이런 점이 비슷합니다" (그건 자기가 읽으면 됨)
- ✅ "이 판례에서 원고가 이런 증거로 승소했으니, 우리도 유사한 증거를 확보하세요"

**캐싱**: `case_id + target_case_number` 조합으로 캐싱. 같은 비교 반복 시 GPT 재호출 방지. 최대 10건 유지 (오래된 것부터 삭제).

---

## 11. 기능 ⑦: 증거 처리

> 파일: `backend/app/services/evidence_processor.py`
> 담당: hdju

### VLM-Only 결정의 배경

**초기 (v0)**: 하이브리드 접근
- PDF → PyMuPDF 텍스트 추출 (무료) → 실패 시 Vision API
- 이미지 → EasyOCR → Vision API fallback

**최종 (v1)**: GPT-4o Vision 전면 채택
- **왜?**: 법률 증거의 정확도가 생명. OCR 오인식 한 글자로 사건이 달라질 수 있음
- **트레이드오프**: API 비용 ↑ but 정확도 >>> 비용

### 처리 파이프라인

```
파일 업로드
  ↓
[파일 타입 판별] MIME + 확장자
  ↓
├── AUDIO → Whisper STT (한국어 고정)
│   비용: 저렴 ($0.006/분)
│
├── PDF → PyMuPDF 텍스트 추출 (무료)
│   → 페이지당 20자 미만? → 이미지 PDF로 판단 → Vision API
│   → 텍스트 충분? → 그대로 사용 (비용 $0)
│
├── IMAGE → 전처리 + Vision API
│   전처리: Grayscale → 대비 2.0배 → 선명도 1.5배 → 이진화
│   → low detail ($0.00255) 또는 high detail ($0.01275/타일)
│
└── UNKNOWN → 원본 저장 (처리 불가)
```

### 문서 유형 분류

Vision API가 텍스트 추출과 함께 문서 유형도 판단:
- 카카오톡/메신저 대화
- 문자메세지
- 계약서
- 영수증
- 법원 문서
- 신분증
- 금융 문서

**왜 유형까지?**: 타임라인 생성 시 "카카오톡 대화의 날짜"와 "계약서의 날짜"는 법적 무게가 다름.

---

## 12. 기능 ⑧: 타임라인 자동 생성

> 파일: `backend/app/services/timeline_service.py`
> 담당: hdju

### 데이터 의존성

```
CaseAnalysis.summary + facts (필수)
  +
Evidence (선택, 증거 내용 보강)
  ↓
GPT-4o-mini (temperature=0.3, 결정적 출력)
  ↓
JSON 배열: [{date, time, title, description, type, actor, order_index}]
```

### 증거 ↔ 이벤트 자동 매칭

타임라인 이벤트 저장 시, 증거 파일명과 매칭:

```python
for event in timeline_events:
    # evidence 테이블에서 파일명 유사한 것 찾아서 evidence_id 연결
    matched = find_evidence_by_filename(event.title)
    if matched:
        event.evidence_id = matched.id
```

### Fallback 메커니즘

CaseAnalysis가 없으면?
→ 증거 텍스트만으로 요약을 임시 생성 → 그걸로 타임라인 생성
→ 품질은 낮지만 블로킹 없음

---

## 13. 기능 ⑨: 인물관계도 자동 생성

> 파일: `backend/app/services/relationship_service.py`
> 담당: hdju

### 3단계 데이터 소스 우선순위

1. **CaseAnalysis** (최우선) — 분석된 사실관계에서 인물 추출
2. **Timeline** (차선) — 타임라인 이벤트에서 등장인물 추출
3. **Case.description** (최후) — 원문에서 직접 추출

### 자동 레이아웃

```python
# 3열 그리드, 250px/180px 간격
for i, person in enumerate(persons):
    person.position_x = (i % 3) * 250
    person.position_y = (i // 3) * 180
```

프론트엔드에서는 React Flow + dagre 알고리즘으로 추가 레이아웃.

---

## 14. 기능 ⑩: 법률 문서 AI 초안

> 파일: `backend/app/api/v1/document_api.py`
> 담당: hdju (+ dayforged 일부)

### 3-Stage RAG Generation

```
[Stage 1: 데이터 수집]
  Case + CaseAnalysis + Evidence + Timeline 전부 취합
  ↓
[Stage 2: 섹션 생성 (재사용 가능)]
  POST /generate-sections → { crime_facts, complaint_reason }
  결과를 CaseDocumentDraft 테이블에 캐싱
  ↓
[Stage 3: 전체 문서 생성]
  POST /generate → HTML(고소장) 또는 Markdown(소장/내용증명)
```

### 문서 유형별 생성 전략

| 유형 | 형식 | 특징 |
|------|------|------|
| 고소장 | HTML 템플릿 | 법적 서식 보존, 가/나/다/라 구조 |
| 소장 | Markdown | 자유 형식, 청구 원인 중심 |
| 내용증명 | Markdown | 간결한 요구 사항 |

### 캐시 무효화

`description_hash`로 원문 변경 감지. 해시 불일치 시 재생성.

```python
class CaseDocumentDraft:
    case_id          # FK → Case
    document_type    # "criminal_complaint" 등
    content          # JSON (섹션별)
    description_hash # SHA256 → 원문 변경 시 재생성
```

---

## 15. 기능 ⑪: 홈 에이전트

> 파일: `backend/app/home_agent/` 전체
> 담당: dayforged (+ DaHee05)

### LangGraph 5-Node StateGraph

```
START → Router ─┬── [general] → Generator → END
                │
                └── [simple/complex] → Agent ─┬── [tool_calls] → Tools ─┐
                                              │                         │
                                              │   ← ← ← (멀티홉 루프) ← ┘
                                              │
                                              ├── [simple, 답변 완료] → END
                                              └── [complex, 답변 완료] → Generator → END
```

### 각 노드 상세

#### Router (분류기)
- **모델**: GPT-4o-mini (temperature=0, structured output)
- **분류 기준**:
  - `general`: 인사, 잡담 → "안녕하세요!" 류
  - `simple`: ~해줘, ~찾아줘 → 단일 도구로 해결
  - `complex`: ~뭐야?, ~비교해줘 → 멀티홉 필요
- **파일**: `nodes.py:76-92`, `prompts.py:3-35`

#### Agent (도구 선택기, ReAct 루프)
- **모델**: GPT-4o-mini (temperature=0.3)
- **역할**: 어떤 도구를 호출할지 결정
- **가드레일**:
  - `_guard_repeated_tool_calls()` — 같은 case_id로 같은 도구 중복 호출 방지
  - `_strip_tool_data_for_agent()` — Agent에게 요약만 보여줌 (전체 데이터 X)
- **파일**: `nodes.py:95-109`, `tools.py:전체`

#### Tools (도구 실행)
- LangGraph ToolNode가 자동으로 tool_calls 실행
- `handle_tool_errors=True`로 에러 시에도 그래프 계속 진행

#### Generator (최종 답변 생성기)
- **모델**: GPT-4o (temperature=0.4)
- **Self-RAG**: 인용 검증
  - LLM이 "대법원 2007도8155에 따르면..."이라고 답변
  - → 도구 결과에 실제로 그 판례가 있는지 검증
  - → 없으면 [미확인] 표시
- **파일**: `nodes.py:112-139`, `prompts.py:94-142`

### 11개 도구 전체

| # | 도구명 | 입력 | 출력 | 의존성 |
|---|--------|------|------|--------|
| 1 | `list_cases` | search_query | 사건 목록 | — |
| 2 | `analyze_case` | case_id | 분석 결과 (캐시) | — |
| 3 | `generate_timeline` | case_id | 타임라인 | analyze_case |
| 4 | `generate_relationship` | case_id | 관계도 | analyze_case |
| 5 | `search_precedents` | query, limit | 판례 목록 | — |
| 6 | `summarize_precedent` | case_number | 판례 요약 | — |
| 7 | `compare_precedent` | case_id, target_case_number | 비교 분석 | — |
| 8 | `search_laws` | query, limit | 법조문 목록 | — |
| 9 | `get_case_evidence` | case_id | 증거 목록 + signed URL | — |
| 10 | `get_case_similar_precedents` | case_id | 저장된 유사 판례 | analyze_case |
| 11 | `rag_search` | query, keyword | 판례+법령 통합 검색 | — |

### 도구 반환 형식

모든 도구가 동일한 구조:

```json
{
  "text": "## 검색 결과 (5건)\n1. 대법원 2020도1234...",  // LLM용 마크다운
  "data": [{ "case_number": "2020도1234", ... }]          // 프론트용 구조화 데이터
}
```

**왜 text와 data를 분리?**
- Agent/Generator는 `text`만 봄 → 토큰 절약
- 프론트엔드는 `data`로 UI 렌더링 → 구조화된 표시

### 멀티홉 예시

질문: "김철수 사건 분석하고 유사 판례 찾아서 비교해줘"

```
Router: "complex" (분석+검색+비교 = 다단계)
  ↓
Agent: list_cases("김철수") → 사건 #42 찾음
  ↓ Tools 실행
Agent: analyze_case(42) → 분석 결과 확인
  ↓ Tools 실행
Agent: search_precedents("명예훼손 허위사실") → 판례 3건 찾음
  ↓ Tools 실행
Agent: compare_precedent(42, "2020도1234") → 비교 분석 완료
  ↓ Tools 실행
Agent: "정보 충분, 답변 생성"
  ↓
Generator: 도구 4개 결과를 종합 → 최종 답변 + 인용 검증
```

### 비용 최적화: 단일 도구 + complex → Generator 직행

```python
def route_after_tools(state):
    if route == "complex" and tool_count == 1:
        return "generator"   # Agent 재호출 스킵 → LLM 1회 절약
    return "agent"            # 멀티홉 계속
```

**의도**: complex 라우트여도 도구 1개만 필요한 경우, Agent를 다시 거칠 이유 없음.

---

## 16. SSE 스트리밍 & 프론트엔드 아키텍처

> 파일: `backend/app/api/v1/agent_api.py`, `frontend/src/hooks/useAgentSSE.ts`

### SSE 이벤트 7종

```
event: status        → { step: "routing|thinking|executing|generating", message: "라우팅 중..." }
event: tool_start    → { id, tool, input, message }
event: tool_end      → { id, tool, result (3000자 제한), structured, summary }
event: token         → { content: "답변 텍스트 조각" }
event: citations     → { sources: [{ type: "precedent", id: "2020도1234" }] }
event: suggestions   → { items: [{ text: "후속 질문", type: "question" }] }
event: done          → {}
event: error         → { message: "서버가 혼잡합니다..." }
```

### 프론트엔드 3채널 수신

`useAgentSSE` 훅이 SSE 이벤트를 3개 상태 채널로 분배:

```
SSE 이벤트 스트림
  ↓
├── steps: StepEvent[]          → Agent 진행 상태 표시 (왼쪽)
├── toolResults: ToolResult[]   → 도구 결과 패널 (오른쪽)
└── streamingText: string       → 실시간 텍스트 (가운데)
```

### 메시지 생명주기

```
1. 사용자 입력 → addUserMessage()
2. agent.send() → SSE 연결 시작
3. status/tool_start/tool_end → steps[], toolResults[] 업데이트
4. token → streamingText에 누적
5. done → finalizeAssistantMessage()
   → steps + toolResults + streamingText → ChatMessage로 확정
6. messages[] 배열에 추가 (불변)
```

### ChatContext 전역 상태

```typescript
// frontend/src/contexts/chat-context.tsx
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  steps?: StepEvent[]           // 이 메시지의 Agent 단계
  toolResults?: ToolResult[]    // 이 메시지의 도구 결과
  suggestions?: SuggestionItem[] // 후속 질문
  citations?: CitationSource[]  // 인용 출처
}
```

### 인용 필터링

SSE `citations` 이벤트 수신 시, `toolResults`에서 인용되지 않은 결과를 숨김:

```typescript
// useAgentSSE.ts — filterToolResultsByCitations()
// rag_search 결과에서 인용된 판례/법령만 남기고 나머지 제거
```

**왜?**: 검색 결과 5건 중 Generator가 실제 인용한 2건만 보여줘야 사용자 혼란 방지.

---

## 17. 벡터 DB (Qdrant) 심화

### 컬렉션 구성

| 컬렉션 | 내용 | 임베딩 |
|--------|------|--------|
| `precedents_kure` | 30만+ 판례 청크 | KURE v1 (1024D) + BM25 |
| `laws_hybrid` | 법령 조문 청크 | OpenAI (1536D) + BM25 |

### Prefetch + RRF 검색 흐름

```python
# Qdrant API 1회 호출로 Dense+Sparse+RRF 처리
client.query_points(
    collection="precedents_kure",
    prefetch=[
        Prefetch(query=dense_vector, using="dense", limit=internal_limit),
        Prefetch(query=sparse_vector, using="sparse", limit=internal_limit),
    ],
    query=FusionQuery(fusion=Fusion.RRF),  # RRF 결합
    query_filter=qdrant_filter,
    limit=final_limit,
)
```

### 양자화 (Quantization)

```python
class QuantizationConfig:
    ENABLED = True
    RESCORE = True          # 원본 벡터로 재순위
    OVERSAMPLING = 20.0     # 후보 20배 확보 후 정밀 순위
```

**왜?**: 30만+ 문서 × 1024차원 = 메모리 1.2GB+. 양자화로 메모리 75% 절약, RESCORE로 정확도 보정.

---

## 18. GPT 모델 비용 최적화

### 3-모델 전략

| 노드 | 모델 | 비용 | 이유 |
|------|------|------|------|
| Router | gpt-4o-mini | ~$0.00015/요청 | 3가지 분류만 → 경량으로 충분 |
| Agent | gpt-4o-mini | ~$0.0003/요청 | 도구 선택도 복잡하지 않음 |
| Generator | gpt-4o | ~$0.01/요청 | 최종 답변 품질이 핵심 |

### LLM 싱글톤 캐시

```python
_agent_base_llm = None  # 한 번만 초기화

def _get_agent_llm(tools):
    global _agent_base_llm
    if _agent_base_llm is None:
        _agent_base_llm = ChatOpenAI(model="gpt-4o-mini", ...)
    return _agent_base_llm.bind_tools(tools)  # 도구만 매 요청 바인딩
```

**왜?**: ChatOpenAI 초기화 시 스키마 파싱, 토크나이저 로딩 등 오버헤드. base는 캐시하고 `bind_tools()`만 per-request.

### 도구 결과 토큰 절약

```
Agent에게 보내는 메시지:
  "[5건 검색됨] 판례번호: 2020도1234, 2019가합5678, ..."  ← 50토큰

Generator에게 보내는 메시지:
  { structured: {...full data...} }  ← 구조화 데이터 (text 필드 제거)
```

---

## 19. 캐싱과 데이터 의존성 관리

### 3계층 캐시

| 계층 | 대상 | 캐시 키 | 무효화 조건 |
|------|------|---------|------------|
| **Tier 1** | 사건 분석 | case_id | description_hash 불일치 |
| **Tier 2** | 법령 검색 결과 | case_id | Tier 1 무효화 시 연쇄 |
| **Tier 3** | 타임라인/관계도 | case_id | 재분석 시 삭제→재생성 |

### 의존성 그래프

```
case.description (원문)
    ↓ [변경 시 hash 불일치]
analyze_case → CaseAnalysis (summary, facts, claims)
    ↓ [재분석 시 Background Task로]
    ├── 타임라인 삭제 → 재생성
    ├── 관계도 삭제 → 재생성
    ├── 증거 재분석 (사건 맥락 반영)
    └── 법령 검색 캐시 무효화
```

---

## 20. 보안 · 인증 · 배포

### JWT 인증

```python
# 모든 API에 적용
current_user = Depends(get_current_user)
# JWT 페이로드: { sub: email, user_id, firm_id }
# 알고리즘: HS256, 만료: 24시간
```

### IDOR 방지

```python
# 19개 엔드포인트에 적용
if case.law_firm_id != current_user.firm_id:
    raise HTTPException(403, "권한 없음")
```

**IDOR란?**: Insecure Direct Object Reference. URL에 case_id=42 넣으면 남의 사건 볼 수 있는 취약점. firm_id 검증으로 차단.

### 배포 아키텍처 (DaHee 구축)

```
[Frontend: Vercel (Seoul icn1)]
  ↓ HTTPS
[Backend: AWS Lightsail]
  ├── Caddy (리버스 프록시 + 자동 HTTPS)
  ├── FastAPI (docker container)
  └── Qdrant (docker container)
  ↓
[Supabase (PostgreSQL + Storage)]
```

**왜 pre-built Docker image?**
```yaml
# 초기: 소스에서 빌드 (5분, 2GB)
backend:
  build: context: ./backend

# 최종: 미리 빌드된 이미지 (5초, 200MB)
backend:
  image: dahee05/law-db-backend:latest
```

Lightsail 2GB 인스턴스에서 빌드하면 메모리 부족. pre-built로 해결.

---

## 21. DaHee05 심층 해부

### 핵심 기여: 검색 파이프라인 4개 + 서비스 아키텍처

#### 1) VectorDB 기초 설계

**무엇을**: Qdrant 컬렉션 스키마, Dense+Sparse 듀얼 임베딩 구조 설계
**왜**: 한국어 법률 문서는 50-100KB. 단일 벡터로는 세밀한 구분 불가. 듀얼 임베딩 + 섹션별 청킹으로 해결.
**결과**: 【판시사항】,【판결요지】등 섹션 단위 검색 가능

#### 2) 하이브리드 검색 → 3-서비스 분리 리팩토링

**초기 구조** (1파일 639줄):
```
similar_search_service.py
  ├── Dense 임베딩 생성
  ├── Sparse 임베딩 생성
  ├── Qdrant 검색
  ├── 가중치 결합 (0.4:0.6)
  └── 결과 정렬
```

**리팩토링 후** (3파일, 각 100-460줄):
```
PrecedentEmbeddingService (임베딩 생성 전담)
  ├── Dense: OpenAI/KURE
  ├── Sparse: BM25/FastEmbed
  ├── LRU 캐시 (500건)
  └── ThreadPoolExecutor (병렬 생성)

PrecedentRepository (데이터 접근 전담)
  ├── Qdrant 검색/상세조회
  ├── PostgreSQL 메타데이터 배치 조회
  ├── 청크 병합 (case_number 기준)
  └── Fallback: Qdrant 미스 → Law API

PrecedentSearchService (검색 오케스트레이션)
  ├── 동의어 확장 (양방향)
  ├── 섹션 가중치 적용
  ├── 키워드 부스팅
  └── 결과 정렬/필터링
```

**DaHee가 왜 이렇게 나눴나?**:
1. **테스트 용이성**: 임베딩 서비스만 독립 테스트 가능
2. **교체 용이성**: KURE → OpenAI 전환 시 EmbeddingService만 변경
3. **재사용성**: 데이터 적재 스크립트에서도 EmbeddingService 사용
4. **배치 최적화**: Repository에서 N개 쿼리 → 1개 배치 쿼리로 변환

#### 3) 비교 분석 서비스

**핵심 인사이트**: DaHee가 만든 comparison_prompt는 단순 "유사점/차이점"이 아님.

```
[전략 포인트 프롬프트]
- 유사 판례의 승소/패소 논리 중 활용할 부분
- 유사 판례에서 배울 수 있는 입증 방법
- 주의해야 할 점 (다른 부분 때문에 달라질 수 있는 결과)
```

→ 변호사가 실제 전략 수립에 쓸 수 있는 수준. "학술적 비교"가 아닌 "실무적 전략".

#### 4) Chat Orchestrator → 홈 에이전트 기반

DaHee가 만든 `chat_orchestrator_service.py` (991줄)의 의도 분류 로직이 홈 에이전트의 Router 노드 설계에 영향:

```python
# DaHee의 의도 분류 Decision Tree
Step 0: 질문형 vs 명령형 (최우선!)
  "있어?" / "뭐야?" → general_question
  "찾아줘" / "검색해줘" → 다음 Step
Step 1: 핵심 키워드
  "판례" + "찾아" → precedent_search
  "사건 등록" → case_create
Step 2: 행위 키워드
  "분석" → case_analyze
  "비교" → precedent_compare
```

이 패턴이 홈 에이전트의 ROUTER_SYSTEM_PROMPT에 반영됨.

#### 5) 배포 파이프라인

```
DaHee의 배포 작업:
  ├── docker-compose.lightsail.yml (Caddy + Backend + Qdrant)
  ├── Caddyfile (자동 HTTPS, 리버스 프록시)
  ├── frontend/vercel.json (Seoul 리전, 보안 헤더)
  ├── pre-built Docker image (빌드 시간 5분 → 5초)
  └── requirements.txt 최적화 (2GB → 200MB)
```

#### 6) Build Error 수정 (최근)

**markdown-message.tsx 수정**:
```typescript
// 문제: React.isValidElement 후 child.props.children 타입 불안전
// 해결: { children?: React.ReactNode } 타입 캐스팅
```

**agent-loading-overlay.tsx 수정**:
```typescript
// 문제: findLastIndex()는 ES2022 → ES2020 타겟에서 미지원
// 해결: 수동 역순 루프로 폴리필
for (let i = displaySteps.length - 1; i >= 0; i--) {
  if (s.status === "in_progress" || s.status === "done") return i;
}
```

**왜 이게 중요한가?**: Vercel 빌드 시 TypeScript strict 모드에서 타입 에러가 배포 차단. ES 타겟 호환성도 실제 배포 시 자주 겪는 문제.

---

## 22. hdju 심층 해부

### 핵심 기여: 시각화 2개 + 멀티모달 처리 + 문서 생성

#### VLM-Only 결정의 기술적 근거

| 방식 | 정확도 | 비용 | 선택 |
|------|--------|------|------|
| EasyOCR | 85-90% | 무료 | ❌ 법률 문서에 부족 |
| Tesseract | 80-85% | 무료 | ❌ 한국어 약함 |
| GPT-4o Vision | 97%+ | $0.01/이미지 | ✅ 선택 |

**판단**: 법률 증거에서 "고소인"이 "고소인"으로 오인식되면 사건이 달라짐. 정확도 최우선.

#### 이미지 전처리 파이프라인

```python
# Grayscale → 대비 2.0배 → 선명도 1.5배 → 이진화
img = ImageEnhance.Contrast(img.convert('L')).enhance(2.0)
img = ImageEnhance.Sharpness(img).enhance(1.5)
img = img.point(lambda x: 0 if x < 128 else 255, '1')
```

**왜?**: 스캔/사진 품질이 들쭉날쭉. 전처리로 Vision API 입력 품질 균일화.

#### 문서 생성의 법률 전문성

고소장 프롬프트에서:
- "~사료됩니다" (추정적 표현) vs "~이다" (단정적) 구분
- 증거 참조: "증 제N호증" 형식 강제
- 범죄사실 구조: 가/나/다/라 순서 강제

---

## 23. dayforged 심층 해부

### 핵심 기여: 에이전트 + 캐싱 + 보안 + 프론트 전반

#### 에이전트 설계 철학

1. **Hallucination Zero**: Self-RAG로 인용 검증. 도구 결과에 없는 정보는 절대 답변에 포함 안 됨
2. **비용 의식**: Router/Agent는 gpt-4o-mini, Generator만 gpt-4o. 단일도구+complex는 Agent 재호출 스킵
3. **투명성**: SSE 7종 이벤트로 도구 실행 과정을 실시간 공개
4. **안정성**: orphaned tool_calls 자동 복구, RateLimitError 30초 재시도

#### 메시지 위생 처리 (Message Sanitization)

LangGraph에서 가장 골치 아픈 문제: OpenAI가 tool_call을 보냈는데 네트워크 끊김 → ToolMessage 없음 → 다음 호출 시 BadRequestError.

```python
def _sanitize_messages(messages):
    # 1. orphaned tool_calls 탐지 (ToolMessage 없는 AIMessage.tool_calls)
    # 2. 가짜 ToolMessage 생성 {"error": "네트워크 오류로 실행 불가"}
    # 3. 정상 메시지 히스토리 복원
```

#### 보안 강화 (25+ API)

```
P0 (최우선):
  - JWT 인증 25+ 엔드포인트 적용
  - IDOR 방지 19개 엔드포인트
  - 에러 메시지 51곳 sanitize (PII 노출 차단)

P1 (안정성):
  - DB Session context manager 전환 (6곳)
  - 파일 업로드 제한 (50MB, 확장자 화이트리스트)
  - 비밀번호 검증 (8자+영문+숫자)
```

#### 프론트엔드 핵심 구현

1. **ChatContext**: 전역 상태로 채팅 메시지·에이전트 상태 관리
2. **useAgentSSE**: SSE 파싱 + 3채널 분배 + abort 지원
3. **apiFetch**: JWT 자동 첨부 + 중앙화된 API 클라이언트
4. **홈 페이지**: 2모드(랜딩/채팅), 리사이즈 가능 결과 패널
5. **도구 렌더러**: 11개 도구별 맞춤 UI 컴포넌트

---

## 24. AI 디자인 패턴 총정리

| # | 패턴 | 적용 위치 | 설명 |
|---|------|----------|------|
| 1 | **RAG** | 판례검색, 법령검색, 비교분석 | 검색 → 증강 → 생성 |
| 2 | **Self-RAG** | Generator 노드 | 생성 후 인용 검증 |
| 3 | **ReAct** | Agent 노드 | 추론(Reason) → 행동(Act) 루프 |
| 4 | **Multi-hop Reasoning** | 홈 에이전트 | Agent → Tools → Agent (반복) |
| 5 | **Hybrid Search** | 판례/법령 검색 | Dense + Sparse + RRF |
| 6 | **Query Expansion** | 판례 검색 | 동의어 확장 (카톡→정보통신망) |
| 7 | **Semantic Caching** | 사건분석, 비교분석 | description_hash 기반 캐시 |
| 8 | **Data Dependency Graph** | 분석→타임라인→관계도 | 상위 변경 시 하위 무효화 |
| 9 | **Cost-Optimized Routing** | Router/Agent/Generator | 경량 모델 → 고급 모델 |
| 10 | **Structured Output** | Router, 도구 반환값 | JSON 스키마 강제 |
| 11 | **Singleton + Per-Request** | LLM 인스턴스 | base 캐시 + tools 바인딩 |
| 12 | **Graceful Degradation** | 타임라인 fallback | CaseAnalysis 없으면 증거로 대체 |

---

## 25. 시행착오와 기술적 도전

### 1) 하이브리드 검색 가중치 (DaHee)

- **시도**: Dense:Sparse = 0.4:0.6 고정 가중치
- **문제**: 쿼리 유형별 최적 가중치가 다름
- **해결**: RRF로 전환 → 순위 기반 결합이라 가중치 튜닝 불필요

### 2) Agent 무한루프 (dayforged)

- **시도**: Agent → Tools → Agent 무제한 반복
- **문제**: 도구 결과가 불만족스러우면 같은 도구 반복 호출
- **해결**: `_guard_repeated_tool_calls()` + `recursion_limit: 20`

### 3) VLM 비용 폭발 (hdju)

- **시도**: 모든 이미지에 high detail Vision API
- **문제**: 고해상도 이미지 → 수십 타일 → $0.13/이미지
- **해결**: 품질 점수 기반 low/high 자동 선택

### 4) SSE 파싱 깨짐 (dayforged)

- **시도**: `event: data\n` 단일 라인 파싱
- **문제**: JSON에 줄바꿈 있으면 파싱 실패
- **해결**: 버퍼 기반 파싱 + `\n\n` 구분자

### 5) findLastIndex ES2020 호환 (DaHee)

- **시도**: `Array.findLastIndex()` 사용
- **문제**: ES2022 메서드 → Vercel 빌드 실패
- **해결**: 수동 역순 루프 폴리필

---

## 26. API 엔드포인트 전체 목록

### Case API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/cases` | 사건 생성 |
| GET | `/api/v1/cases` | 사건 목록 (firm_id 필터) |
| GET | `/api/v1/cases/{id}` | 사건 상세 + stale 체크 |
| PUT | `/api/v1/cases/{id}` | 사건 수정 |
| DELETE | `/api/v1/cases/{id}` | 사건 소프트 삭제 (availability='c') |
| POST | `/api/v1/cases/{id}/analyze` | AI 사건 분석 실행 |
| PUT | `/api/v1/cases/{id}/summary` | 분석 결과 수동 수정 |

### Evidence API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/evidence/upload` | 증거 업로드 + OCR/STT |
| GET | `/api/v1/evidence/{id}` | 증거 상세 |
| POST | `/api/v1/evidence/{id}/starred` | 즐겨찾기 |
| GET | `/api/v1/cases/{id}/evidence` | 사건별 증거 목록 |
| POST | `/api/v1/cases/{id}/evidence` | 증거-사건 연결 |

### Search API (판례)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/search/cases` | 하이브리드 판례 검색 |
| GET | `/api/v1/search/cases/recent` | 최근 판례 |
| GET | `/api/v1/search/cases/{case_number}` | 판례 상세 |
| POST | `/api/v1/search/summarize` | 판례 요약 생성/조회 |
| POST | `/api/v1/search/similar` | 유사 판례 검색 |
| POST | `/api/v1/search/compare` | 판례 비교 분석 |

### Search Laws API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/search-laws` | 법령 하이브리드 검색 |
| GET | `/api/v1/search-laws/{law_name}/{article}` | 특정 조문 조회 |

### Timeline / Relationship API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/timeline/{case_id}` | 타임라인 조회 (자동 생성) |
| POST/PUT/DELETE | `/api/v1/timeline/{case_id}` | 타임라인 CRUD |
| GET | `/api/v1/relationship/{case_id}` | 관계도 조회 (자동 생성) |
| POST | `/api/v1/relationship/{case_id}/generate` | 관계도 재생성 |

### Agent API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/agent/chat` | SSE 스트리밍 대화 |

### Auth API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/signup` | 회원가입 |
| POST | `/api/v1/login` | 로그인 (JWT 발급) |
| GET | `/api/v1/me` | 현재 사용자 정보 |

---

## 27. 프론트엔드 컴포넌트 구조

### 라우팅

```
/login          → AuthPage
/ (protected)   → MainLayout
  ├── /         → HomePage (채팅 인터페이스)
  ├── /dashboard → DashboardPage
  ├── /cases    → CasesPage
  ├── /cases/:id → CaseDetailPage
  ├── /precedents → PrecedentsPage
  ├── /precedents/:id → PrecedentDetailPage
  ├── /evidence/upload → EvidenceUploadPage
  ├── /evidence/:id → EvidenceDetailPage
  └── /new-case → NewCasePage
```

### 홈 에이전트 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `agent-steps-list.tsx` | Agent 진행 단계 (4.5rem 고정, 스크롤) |
| `agent-results-panel.tsx` | 도구 결과 탭 패널 (11개 렌더러 디스패치) |
| `markdown-message.tsx` | 법률 참조 자동 링크 (판례번호, 법조문) |
| `suggestion-chips.tsx` | 후속 질문/액션 버튼 |
| `floating-chat-bubble.tsx` | 비홈 페이지 채팅 바로가기 |

### 도구별 렌더러

| 도구 | 렌더러 | 특징 |
|------|--------|------|
| list_cases | CaseListRenderer | 상태별 색상 뱃지 |
| analyze_case | CaseAnalysisRenderer | 요약/사실/쟁점 3섹션 + 키워드 태그 |
| search_precedents | PrecedentListRenderer | 판례 카드 + 법원/날짜 메타 |
| compare_precedent | ComparisonRenderer | 유사점(초록)/차이점(빨강)/전략(노랑) |
| generate_timeline | TimelineRenderer | 수직 타임라인 + 유형별 색상 |
| generate_relationship | RelationshipRenderer | 인물 카드 + 관계 화살표 |
| search_laws | LawListRenderer | 조문 카드 + 접기/펼치기 |
| get_case_evidence | EvidenceListRenderer | 위험도 뱃지 + signed URL 미리보기 |

---

## 28. 용어 사전

| 용어 | 설명 |
|------|------|
| **RAG** | Retrieval-Augmented Generation. 검색 결과를 LLM에 넘겨서 근거 있는 답변 생성 |
| **Self-RAG** | LLM이 자기 답변의 인용을 검증하는 패턴 |
| **ReAct** | Reasoning + Acting. 추론과 도구 실행을 번갈아 하는 에이전트 패턴 |
| **멀티홉** | 여러 도구를 순차적으로 호출해서 복합 질문에 답하는 것 |
| **RRF** | Reciprocal Rank Fusion. 여러 검색 결과의 순위를 결합하는 알고리즘 |
| **Dense 검색** | 벡터 임베딩 기반 의미 검색 |
| **Sparse 검색** | BM25 기반 키워드 검색 |
| **Prefetch** | Qdrant에서 Dense/Sparse 각각 먼저 검색한 후 결합하는 방식 |
| **Hallucination** | LLM이 사실이 아닌 내용을 그럴듯하게 생성하는 현상 |
| **StateGraph** | LangGraph의 상태 기반 그래프. 노드(처리)와 엣지(분기)로 구성 |
| **SSE** | Server-Sent Events. 서버→클라이언트 단방향 실시간 스트리밍 |
| **IDOR** | Insecure Direct Object Reference. URL 파라미터 조작으로 남의 데이터 접근 |
| **description_hash** | 사건 설명문의 SHA256 해시. 원문 변경 감지용 |
| **stale** | 캐시된 데이터가 원본보다 오래되어 유효하지 않은 상태 |
| **KURE** | Korean Understanding and Reasoning Embedding. 한국어 법률 특화 임베딩 모델 |
| **BM25** | Best Matching 25. 전통적 키워드 검색 알고리즘 |
| **ToolNode** | LangGraph에서 도구를 실행하는 내장 노드 |
| **bind_tools** | LLM에 사용 가능한 도구 목록을 바인딩하는 메서드 |
| **orphaned tool_call** | ToolMessage가 없는 고아 tool_call. LangGraph 크래시 원인 |
| **firm_id** | 법무법인 ID. 테넌트 격리(데이터 분리)의 핵심 |
| **Signed URL** | 시간 제한이 있는 임시 파일 접근 URL (Supabase Storage) |

---

> **v.1 작성 완료** — 2026-02-26 · dayforged 기준
> 이 문서는 프로젝트의 모든 기술적 결정, 구현 세부사항, 팀원별 기여를 포함합니다.
