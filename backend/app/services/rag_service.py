import os
import chromadb
from typing import List
from pathlib import Path
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

# .env 파일 경로 찾기 (backend 폴더에 위치)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class RagService:
    """
    RAG (Retrieval-Augmented Generation) 서비스 클래스
    벡터 DB에서 검색하는 로직을 구현합니다.
    """

    def __init__(self):
        pass

    async def search(self, query: str, top_k: int = 3) -> dict:
        """
        벡터 DB에서 유사한 문서를 검색합니다.

        Args:
            query: 검색 쿼리
            top_k: 반환할 문서 개수

        Returns:
            검색 결과
        """
        try:
            # ChromaDB 클라이언트 연결
            client = chromadb.PersistentClient(path="./legal_vector_db")

            # OpenAI 임베딩 함수 설정
            openai_ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=os.getenv("OPENAI_API_KEY"),
                model_name="text-embedding-3-small"
            )

            # 컬렉션 가져오기
            collection = client.get_collection(
                name="lease_precedents",
                embedding_function=openai_ef
            )

            # 검색 수행
            results = collection.query(
                query_texts=[query],
                n_results=top_k
            )

            if not results['documents'] or len(results['documents'][0]) == 0:
                return {
                    "status": "success",
                    "query": query,
                    "results": [],
                    "message": "검색 결과가 없습니다."
                }

            # 검색 결과 포맷팅
            formatted_results = []
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i] if 'distances' in results else None
                })

            return {
                "status": "success",
                "query": query,
                "results": formatted_results,
                "count": len(formatted_results)
            }

        except Exception as e:
            raise Exception(f"검색 중 오류 발생: {str(e)}")
