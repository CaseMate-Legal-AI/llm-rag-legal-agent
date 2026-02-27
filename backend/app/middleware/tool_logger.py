"""도구 사용 로깅 유틸"""

import logging
import os
from typing import Optional
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# 현재 대화의 chat_log_id, user_id를 저장하는 컨텍스트 변수
_current_chat_log_id: ContextVar[Optional[int]] = ContextVar("chat_log_id", default=None)
_current_user_id: ContextVar[Optional[int]] = ContextVar("tool_user_id", default=None)


def is_tool_logging_enabled() -> bool:
    return os.getenv("ENABLE_TOOL_LOGGING", "false").lower() in ("true", "1", "yes")


def set_tool_context(chat_log_id: Optional[int] = None, user_id: Optional[int] = None):
    """현재 대화의 컨텍스트 설정"""
    _current_chat_log_id.set(chat_log_id)
    _current_user_id.set(user_id)


def get_tool_context() -> tuple[Optional[int], Optional[int]]:
    """현재 컨텍스트 반환 (chat_log_id, user_id)"""
    return _current_chat_log_id.get(), _current_user_id.get()


def save_tool_log(
    tool_name: str,
    input_params: Optional[dict] = None,
    success: bool = True,
    latency_ms: int = 0,
    chat_log_id: Optional[int] = None,
    user_id: Optional[int] = None,
):
    """도구 사용 로그를 DB에 저장"""
    if not is_tool_logging_enabled():
        return

    # 컨텍스트에서 값 가져오기 (명시적 값 우선)
    ctx_chat_log_id, ctx_user_id = get_tool_context()
    chat_log_id = chat_log_id or ctx_chat_log_id
    user_id = user_id or ctx_user_id

    try:
        from tool.database import SessionLocal
        from app.models.logs import ToolUsageLog

        db = SessionLocal()
        try:
            log = ToolUsageLog(
                chat_log_id=chat_log_id,
                user_id=user_id,
                tool_name=tool_name,
                input_params=input_params,
                success=success,
                latency_ms=latency_ms,
            )
            db.add(log)
            db.commit()
            logger.debug(
                f"[ToolLogger] {tool_name} | success={success} | {latency_ms}ms"
            )
        except Exception as e:
            db.rollback()
            logger.warning(f"[ToolLogger] DB 저장 실패: {e}")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"[ToolLogger] 로깅 실패: {e}")
