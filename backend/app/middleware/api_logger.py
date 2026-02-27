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

            # 비동기로 DB 저장 (백그라운드)
            try:
                await self._save_log(
                    user_id=user_id,
                    method=method,
                    endpoint=endpoint,
                    referer=referer,
                    path_params=path_params,
                    query_params=query_params,
                    status_code=status_code,
                    latency_ms=latency_ms,
                    request_size=request_size,
                    response_size=response_size,
                    error_message=error_message,
                )
            except Exception as e:
                # 로깅 실패해도 원래 응답은 반환
                logger.warning(f"[ApiLogger] 로그 저장 실패: {e}")

        return response

    async def _save_log(
        self,
        user_id: Optional[int],
        method: str,
        endpoint: str,
        referer: Optional[str],
        path_params: Optional[dict],
        query_params: Optional[dict],
        status_code: int,
        latency_ms: int,
        request_size: int,
        response_size: int,
        error_message: Optional[str],
    ):
        """로그를 DB에 저장"""
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
                status_code=status_code,
                latency_ms=latency_ms,
                request_size=request_size,
                response_size=response_size,
                error_message=error_message,
            )
            db.add(log)
            db.commit()
            logger.debug(f"[ApiLogger] {method} {endpoint} {status_code} {latency_ms}ms")
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
