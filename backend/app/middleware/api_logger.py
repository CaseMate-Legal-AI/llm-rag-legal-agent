"""API 요청/응답 로깅 미들웨어"""

import time
import logging
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from jose import jwt, JWTError
import os

logger = logging.getLogger(__name__)

# 로깅 제외 경로
EXCLUDE_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("BCRYPT_SECRET")
ALGORITHM = "HS256"


def extract_user_id_from_token(authorization: Optional[str]) -> Optional[int]:
    """Authorization 헤더에서 user_id 추출 (실패 시 None)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]  # "Bearer " 제거
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except JWTError:
        return None


def extract_path_params(request: Request) -> dict:
    """경로 파라미터 추출"""
    return dict(request.path_params) if request.path_params else None


def extract_query_params(request: Request) -> dict:
    """쿼리 파라미터 추출"""
    params = dict(request.query_params)
    return params if params else None


class ApiLoggerMiddleware(BaseHTTPMiddleware):
    """모든 API 요청을 로깅하는 미들웨어"""

    async def dispatch(self, request: Request, call_next) -> Response:
        # 제외 경로 체크
        if request.url.path in EXCLUDE_PATHS:
            return await call_next(request)

        # 시작 시간 기록
        start_time = time.time()

        # 요청 정보 수집
        method = request.method
        endpoint = request.url.path
        referer = request.headers.get("referer")
        user_id = extract_user_id_from_token(request.headers.get("authorization"))
        path_params = extract_path_params(request)
        query_params = extract_query_params(request)
        request_size = int(request.headers.get("content-length", 0))

        # API 로그를 먼저 생성하고 ID를 request.state에 저장
        api_log_id = None
        try:
            api_log_id = self._create_log_sync(
                user_id=user_id,
                method=method,
                endpoint=endpoint,
                referer=referer,
                path_params=path_params,
                query_params=query_params,
                request_size=request_size,
            )
            request.state.api_log_id = api_log_id
            request.state.user_id = user_id
            request.state.endpoint = endpoint

            # LLM 로거 컨텍스트 설정 (llm_usage_logs에서 사용)
            from app.middleware.llm_logger import set_request_context
            set_request_context(api_log_id=api_log_id, user_id=user_id, endpoint=endpoint)
        except Exception as e:
            logger.warning(f"[ApiLogger] 초기 로그 생성 실패: {e}")
            request.state.api_log_id = None

        # 에러 정보 초기화
        error_message = None
        status_code = 500
        response_size = 0

        try:
            # 실제 요청 처리
            response = await call_next(request)
            status_code = response.status_code
            response_size = int(response.headers.get("content-length", 0))

        except Exception as e:
            error_message = str(e)
            logger.error(f"[ApiLogger] 요청 처리 중 에러: {e}")
            raise

        finally:
            # 응답 시간 계산
            latency_ms = int((time.time() - start_time) * 1000)

            # API 로그 업데이트 (status_code, latency 등)
            if api_log_id:
                try:
                    self._update_log_sync(
                        api_log_id=api_log_id,
                        status_code=status_code,
                        latency_ms=latency_ms,
                        response_size=response_size,
                        error_message=error_message,
                    )
                except Exception as e:
                    logger.warning(f"[ApiLogger] 로그 업데이트 실패: {e}")

        return response

    def _create_log_sync(
        self,
        user_id: Optional[int],
        method: str,
        endpoint: str,
        referer: Optional[str],
        path_params: Optional[dict],
        query_params: Optional[dict],
        request_size: int,
    ) -> Optional[int]:
        """API 로그를 먼저 생성하고 ID 반환 (요청 시작 시)"""
        from tool.database import SessionLocal
        from app.models.logs import ApiLog

        db = SessionLocal()
        try:
            log = ApiLog(
                user_id=user_id,
                method=method,
                endpoint=endpoint,
                referer=referer,
                path_params=path_params,
                query_params=query_params,
                request_size=request_size,
                # 나머지는 요청 완료 후 업데이트
                status_code=0,
                latency_ms=0,
                response_size=0,
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            logger.debug(f"[ApiLogger] 로그 생성: {log.id} ({method} {endpoint})")
            return log.id
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def _update_log_sync(
        self,
        api_log_id: int,
        status_code: int,
        latency_ms: int,
        response_size: int,
        error_message: Optional[str],
    ):
        """API 로그 업데이트 (요청 완료 후)"""
        from tool.database import SessionLocal
        from app.models.logs import ApiLog

        db = SessionLocal()
        try:
            log = db.query(ApiLog).filter(ApiLog.id == api_log_id).first()
            if log:
                log.status_code = status_code
                log.latency_ms = latency_ms
                log.response_size = response_size
                log.error_message = error_message
                db.commit()
                logger.debug(f"[ApiLogger] 로그 업데이트: {api_log_id} ({status_code} {latency_ms}ms)")
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
