"""홈 에이전트 대화 로깅 유틸"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def is_chat_logging_enabled() -> bool:
    return os.getenv("ENABLE_CHAT_LOGGING", "false").lower() in ("true", "1", "yes")


def save_chat_log(
    user_id: int,
    session_id: str,
    query: str,
    route: Optional[str] = None,
    response: Optional[str] = None,
    tools_used: Optional[list[str]] = None,
    tool_call_count: int = 0,
    cited_sources: Optional[list[dict]] = None,
    latency_ms: int = 0,
    api_log_id: Optional[int] = None,
):
    """대화 로그를 DB에 저장"""
    if not is_chat_logging_enabled():
        return None

    try:
        from tool.database import SessionLocal
        from app.models.logs import ChatLog

        db = SessionLocal()
        try:
            log = ChatLog(
                api_log_id=api_log_id,
                user_id=user_id,
                session_id=session_id,
                query=query,
                route=route,
                response=response,
                tools_used=tools_used,
                tool_call_count=tool_call_count,
                cited_sources=cited_sources,
                latency_ms=latency_ms,
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            logger.debug(
                f"[ChatLogger] 저장 완료 | route={route} | tools={tool_call_count} | {latency_ms}ms"
            )
            return log.id
        except Exception as e:
            db.rollback()
            logger.warning(f"[ChatLogger] DB 저장 실패: {e}")
            return None
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"[ChatLogger] 로깅 실패: {e}")
        return None
