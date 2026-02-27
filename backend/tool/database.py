from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# 환경 변수에서 DB 주소 가져오기
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")

# DB 엔진 생성 (연결 풀 설정)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=15,       # 기본 연결 풀 크기
    max_overflow=25,    # 추가 연결 허용 수 (총 최대 40개)
    pool_pre_ping=True, # 연결 상태 미리 확인 (끊긴 연결 방지)
    pool_recycle=300,   # 5분마다 연결 갱신 (PostgreSQL 연결 끊김 방지)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DB 세션 가져오는 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
        print("Database session created successfully")
    except Exception as e:
        print(f"Error creating database session: {e}")
        raise e
    finally:
        db.close()

# DB 테이블 초기화 함수
def init_db():
    """데이터베이스 테이블을 생성합니다."""
    Base.metadata.create_all(bind=engine)
