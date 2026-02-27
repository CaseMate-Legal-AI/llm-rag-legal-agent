"""LLM 사용량 및 비용 로깅 유틸"""

import logging
import os
from typing import Optional
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# 현재 요청의 api_log_id, user_id, endpoint를 저장하는 컨텍스트 변수
_current_api_log_id: ContextVar[Optional[int]] = ContextVar("api_log_id", default=None)
_current_user_id: ContextVar[Optional[int]] = ContextVar("user_id", default=None)
_current_endpoint: ContextVar[Optional[str]] = ContextVar("endpoint", default=None)

# 모델별 가격 (USD per 1M tokens) - 2024년 기준
MODEL_PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}

# 로깅 활성화 여부
def is_llm_logging_enabled() -> bool:
    return os.getenv("ENABLE_LLM_LOGGING", "false").lower() in ("true", "1", "yes")


def set_request_context(
    api_log_id: Optional[int] = None,
    user_id: Optional[int] = None,
    endpoint: Optional[str] = None,
):
    """현재 요청의 컨텍스트 설정 (미들웨어에서 호출)"""
    _current_api_log_id.set(api_log_id)
    _current_user_id.set(user_id)
    _current_endpoint.set(endpoint)


def get_request_context() -> tuple[Optional[int], Optional[int], Optional[str]]:
    """현재 요청의 컨텍스트 반환 (api_log_id, user_id, endpoint)"""
    return _current_api_log_id.get(), _current_user_id.get(), _current_endpoint.get()


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """토큰 사용량으로 비용 계산 (USD)"""
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["gpt-4o-mini"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


def extract_usage_from_response(response) -> tuple[int, int]:
    """LangChain 응답에서 토큰 사용량 추출"""
    if response is None:
        return (0, 0)

    try:
        # AIMessage의 response_metadata에서 추출
        if hasattr(response, "response_metadata"):
            metadata = response.response_metadata

            # 방법 1: token_usage 키 (일부 버전)
            usage = metadata.get("token_usage", {})
            if usage:
                return (
                    usage.get("prompt_tokens", 0),
                    usage.get("completion_tokens", 0),
                )

            # 방법 2: usage 키 (OpenAI 직접 응답 형식)
            usage = metadata.get("usage", {})
            if usage:
                return (
                    usage.get("prompt_tokens", 0),
                    usage.get("completion_tokens", 0),
                )

            # 방법 3: 최상위 레벨에 직접 있는 경우
            if "prompt_tokens" in metadata:
                return (
                    metadata.get("prompt_tokens", 0),
                    metadata.get("completion_tokens", 0),
                )

        # Pydantic 모델 (with_structured_output)의 경우 - usage 정보 없음
        return (0, 0)
    except Exception as e:
        logger.warning(f"[LLMLogger] 토큰 사용량 추출 실패: {e}")
    return (0, 0)


def log_llm_usage(
    model: str,
    purpose: str,
    input_tokens: int,
    output_tokens: int,
    endpoint: Optional[str] = None,
    api_log_id: Optional[int] = None,
    user_id: Optional[int] = None,
):
    """LLM 사용량을 DB에 저장"""
    if not is_llm_logging_enabled():
        return

    # 컨텍스트에서 api_log_id, user_id, endpoint 가져오기 (명시적 값 우선)
    ctx_api_log_id, ctx_user_id, ctx_endpoint = get_request_context()
    api_log_id = api_log_id or ctx_api_log_id
    user_id = user_id or ctx_user_id
    endpoint = endpoint or ctx_endpoint

    # 비용 계산
    cost_usd = calculate_cost(model, input_tokens, output_tokens)

    try:
        from tool.database import SessionLocal
        from app.models.logs import LlmUsageLog

        db = SessionLocal()
        try:
            log = LlmUsageLog(
                api_log_id=api_log_id,
                user_id=user_id,
                endpoint=endpoint,
                model=model,
                purpose=purpose,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
            )
            db.add(log)
            db.commit()
            logger.debug(
                f"[LLMLogger] {purpose} | {model} | "
                f"in:{input_tokens} out:{output_tokens} | ${cost_usd:.4f}"
            )
        except Exception as e:
            db.rollback()
            logger.warning(f"[LLMLogger] DB 저장 실패: {e}")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"[LLMLogger] 로깅 실패: {e}")


def log_llm_response(response, model: str, purpose: str, **kwargs):
    """LangChain 응답 객체에서 사용량 추출 후 로깅 (편의 함수)"""
    input_tokens, output_tokens = extract_usage_from_response(response)
    log_llm_usage(
        model=model,
        purpose=purpose,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        **kwargs,
    )
