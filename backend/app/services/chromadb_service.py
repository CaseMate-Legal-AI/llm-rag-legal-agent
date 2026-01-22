import chromadb
from chromadb.utils import embedding_functions
import os

class ChromadbService:
    def __init__(self) -> None:
        self.parsed_data = []
        self.chunked_data = []

    async def process_embedding(self, chunked_data: list, parsed_data: list) -> dict:
        """
        청킹된 데이터를 임베딩하여 벡터 DB에 저장합니다.
        """

        self.passed_data = parsed_data
        self.chunked_data = chunked_data

        print(f"[DEBUG] process_embedding 시작")
        print(f"[DEBUG] chunked_data 개수: {len(self.chunked_data) if self.chunked_data else 0}")

        if not self.chunked_data:
            raise ValueError("청킹된 데이터가 없습니다. 먼저 청킹을 수행해주세요.")

        print(f"[DEBUG] ChromaDB 클라이언트 생성 중...")
        client = chromadb.PersistentClient(path="./legal_vector_db")
        openai_ef = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small"
        )
        collection = client.get_or_create_collection(
            name="lease_precedents",
            embedding_function=openai_ef
        )

        documents = []
        metadatas = []
        ids = []

        for item in self.chunked_data:
            chunk = item["chunk"]
            metadata = item["metadata"]
            chunk_index = item["chunk_index"]

            documents.append(chunk)
            metadatas.append(metadata)
            # ID는 파일명과 사건번호, 순번을 조합하여 고유하게 만듭니다.
            unique_id = f"{metadata['filename']}_{metadata['case_no']}_{chunk_index}"
            ids.append(unique_id)

        print(f"[DEBUG] 총 {len(documents)}개의 청크를 임베딩합니다...")

        # 배치 처리 (한 번에 너무 많은 데이터를 전송하지 않도록)
        batch_size = 500
        total_batches = (len(documents) + batch_size - 1) // batch_size

        try:
            for i in range(0, len(documents), batch_size):
                batch_docs = documents[i:i + batch_size]
                batch_metas = metadatas[i:i + batch_size]
                batch_ids = ids[i:i + batch_size]

                current_batch = i // batch_size + 1
                print(f"[DEBUG] 배치 {current_batch}/{total_batches} 처리 중... ({len(batch_docs)}개 청크)")

                collection.upsert(
                    documents=batch_docs,
                    metadatas=batch_metas,
                    ids=batch_ids
                )

            print(f"[DEBUG] 모든 배치 처리 완료!")

            return {
                "status": "success",
                "total_chunks_embedded": len(self.chunked_data),
                "message": f"{len(self.chunked_data)}개의 청크가 벡터 DB에 저장되었습니다."
            }
        except Exception as e:
            print(f"[ERROR] 임베딩 중 에러 발생: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"임베딩 실패: {str(e)}")

    def clear_vector_db(self) -> str:
        """
        벡터 DB의 모든 데이터를 삭제합니다.

        Returns:
            삭제 결과
        """
        try:
            client = chromadb.PersistentClient(path="./legal_vector_db")

            # 컬렉션 존재 여부 확인
            collections = client.list_collections()
            collection_names = [col.name for col in collections]

            if "lease_precedents" in collection_names:
                # 컬렉션 삭제
                client.delete_collection(name="lease_precedents")
                message = "벡터 DB의 모든 데이터가 삭제되었습니다."
            else:
                message = "삭제할 데이터가 없습니다."

            # 메모리 상의 데이터도 초기화
            self.parsed_data = []
            self.chunked_data = []

            return message
        except Exception as e:
            raise Exception(f"DB 초기화 실패: {str(e)}")

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
