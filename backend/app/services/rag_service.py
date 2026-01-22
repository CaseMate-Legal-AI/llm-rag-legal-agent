from pathlib import Path
from dotenv import load_dotenv
from chromadb_service import ChromadbService

# .env 파일 경로 찾기 (backend 폴더에 위치)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class RagService:
    """
    RAG (Retrieval-Augmented Generation) 서비스 클래스
    벡터 DB에서 검색하는 로직을 구현합니다.
    """

    def __init__(self):
        self.chromadb_service = ChromadbService()

    async def search(self, query: str, top_k: int = 3) -> dict:
        """
        벡터 DB에서 유사한 문서를 검색합니다.

        Args:
            query: 검색 쿼리
            top_k: 반환할 문서 개수

        Returns:
            검색 결과
        """

        return await self.chromadb_service.search(query, top_k)
