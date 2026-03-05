"""
조건부 StateGraph 정의

규칙 매칭:        Router → rule_executor → generator → END (LLM 0~1회)
규칙 역질문:      Router → rule_ask → END
General (일반):   Router → general → END (gpt-4o-mini 1회)
Simple (명령형):  Router → Agent → Tools → Agent → END
Complex (질문형): Router → Agent → Tools → Agent → ... → Generator → END (멀티홉)

Self-RAG: Generator에서 인용 검증 (환각 방지)
"""

import logging
from typing import Annotated, TypedDict
from functools import partial

from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.home_agent.nodes import (
    router_node,
    general_node,
    agent_node,
    generator_node,
    fallback_rag_node,
    rule_ask_node,
    rule_executor_node,
    route_after_router,
    route_after_agent,
    route_after_tools,
)

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    route: str | None
    keyword: str | None  # Router에서 추출한 검색 키워드
    cited_sources: list[dict]  # 실제 인용된 출처 목록
    rule_match: dict | None  # 규칙 매칭 결과 (tool_router.RuleMatchResult)


def build_graph(tools: list, checkpointer=None):
    """도구 목록을 받아 컴파일된 그래프를 반환

    흐름:
    - 규칙 매칭: Router → rule_executor → generator → END (LLM 0~1회)
    - 규칙 역질문: Router → rule_ask → END
    - General: Router → general → END (gpt-4o-mini 1회)
    - Simple/Complex: Router → agent → tools → ... → generator → END
    """

    graph = StateGraph(AgentState)

    # 노드 등록
    graph.add_node("router", router_node)
    graph.add_node("general", general_node)
    graph.add_node("agent", partial(agent_node, tools=tools))
    graph.add_node("tools", ToolNode(tools, handle_tool_errors=True))
    graph.add_node("fallback_rag", partial(fallback_rag_node, tools=tools))
    graph.add_node("generator", generator_node)

    # 규칙 기반 노드
    graph.add_node("rule_ask", rule_ask_node)
    graph.add_node("rule_executor", partial(rule_executor_node, tools=tools))

    # 엣지: START → Router
    graph.add_edge(START, "router")

    # 조건부 엣지: Router → (규칙/general/agent)
    graph.add_conditional_edges("router", route_after_router, {
        "general": "general",
        "agent": "agent",
        "rule_executor": "rule_executor",
        "rule_ask": "rule_ask",
    })

    # 엣지: General → END
    graph.add_edge("general", END)

    # 엣지: Rule Ask → END (역질문 후 종료)
    graph.add_edge("rule_ask", END)

    # 엣지: Rule Executor → Generator (규칙 실행 후 답변 생성)
    graph.add_edge("rule_executor", "generator")

    # 조건부 엣지: Agent → (tool_calls→tools, simple→END, complex도구없음→fallback_rag)
    graph.add_conditional_edges("agent", route_after_agent, {
        "tools": "tools",
        "end": END,
        "fallback_rag": "fallback_rag",  # Complex 도구 없음 → 자동 RAG 검색
        "generator": "generator",
    })

    # 엣지: Fallback RAG → Generator
    graph.add_edge("fallback_rag", "generator")

    # 조건부 엣지: Tools → (단일도구+complex→generator, 그 외→agent)
    graph.add_conditional_edges("tools", route_after_tools, {
        "generator": "generator",
        "agent": "agent",
    })

    # 엣지: Generator → END
    graph.add_edge("generator", END)

    # 컴파일
    compiled = graph.compile(checkpointer=checkpointer)
    logger.info("[Graph] 에이전트 그래프 컴파일 완료")
    return compiled
