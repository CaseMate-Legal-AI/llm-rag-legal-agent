"""로깅 테이블 모델 정의

테이블 관계:
api_logs (전체 API 요청)
    ├── llm_usage_logs (LLM 사용 비용)
    └── chat_logs (홈 에이전트 대화)
            └── tool_usage_logs (도구 사용 기록)
"""

from sqlalchemy import Column, BigInteger, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON, text
from datetime import datetime
from tool.database import Base


class ApiLog(Base):
    """전체 API 요청 로깅"""
    __tablename__ = "api_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=False, server_default=text('get_time_id()'))
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)  # 비로그인 시 null
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    endpoint = Column(String(255), nullable=False, index=True)  # /api/v1/cases
    referer = Column(String(500), nullable=True)  # 요청 출처 페이지 URL
    path_params = Column(JSON, nullable=True)  # {case_id: 1}
    query_params = Column(JSON, nullable=True)  # {limit: 10}
    status_code = Column(Integer, nullable=False)  # 200, 400, 500
    latency_ms = Column(Integer, nullable=False)  # 응답 시간 (밀리초)
    request_size = Column(Integer, nullable=True)  # 요청 바이트 크기
    response_size = Column(Integer, nullable=True)  # 응답 바이트 크기
    error_message = Column(Text, nullable=True)  # 에러 발생 시 메시지
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ApiLog(id={self.id}, method={self.method}, endpoint={self.endpoint}, status={self.status_code})>"


class LlmUsageLog(Base):
    """LLM 사용량 및 비용 추적"""
    __tablename__ = "llm_usage_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=False, server_default=text('get_time_id()'))
    api_log_id = Column(BigInteger, ForeignKey('api_logs.id', ondelete='CASCADE'), nullable=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    endpoint = Column(String(255), nullable=True)  # 어떤 API에서 호출했는지
    model = Column(String(50), nullable=False)  # gpt-4o-mini, gpt-4o
    purpose = Column(String(50), nullable=False, index=True)  # router, agent, generator, general, analyze, compare, timeline, relationship
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Float, nullable=False, default=0.0)  # 계산된 비용 (USD)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<LlmUsageLog(id={self.id}, model={self.model}, purpose={self.purpose}, cost=${self.cost_usd:.4f})>"


class ChatLog(Base):
    """홈 에이전트 대화 로그"""
    __tablename__ = "chat_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=False, server_default=text('get_time_id()'))
    api_log_id = Column(BigInteger, ForeignKey('api_logs.id', ondelete='CASCADE'), nullable=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)  # 대화 세션 구분
    query = Column(Text, nullable=False)  # 사용자 질문 원문
    query_type = Column(String(50), nullable=True)  # 법령, 판례, 사건, 일반
    route = Column(String(20), nullable=True, index=True)  # general, simple, complex
    response = Column(Text, nullable=True)  # AI 답변 원문
    tools_used = Column(JSON, nullable=True)  # ["rag_search", "analyze_case"]
    tool_call_count = Column(Integer, nullable=True, default=0)
    cited_sources = Column(JSON, nullable=True)  # 인용된 출처 목록
    latency_ms = Column(Integer, nullable=True)  # 총 응답 시간 (밀리초)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ChatLog(id={self.id}, route={self.route}, tools={self.tool_call_count})>"


class ToolUsageLog(Base):
    """도구 사용 추적"""
    __tablename__ = "tool_usage_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=False, server_default=text('get_time_id()'))
    chat_log_id = Column(BigInteger, ForeignKey('chat_logs.id', ondelete='CASCADE'), nullable=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    tool_name = Column(String(100), nullable=False, index=True)  # search_laws, rag_search, analyze_case 등
    input_params = Column(JSON, nullable=True)  # 도구 입력값
    success = Column(Boolean, nullable=False, default=True)
    latency_ms = Column(Integer, nullable=True)  # 도구 실행 시간 (밀리초)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ToolUsageLog(id={self.id}, tool={self.tool_name}, success={self.success})>"
