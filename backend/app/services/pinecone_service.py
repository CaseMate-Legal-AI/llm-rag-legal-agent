from pinecone import Pinecone, ServerlessSpec
import os
import openai

class PineconeService:

    def __init__(self) -> None:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = "legal-precedents"

        # 인덱스가 없으면 생성
        existing_indexes = [index.name for index in pc.list_indexes()]
        if self.index_name not in existing_indexes:
            pc.create_index(
                name=self.index_name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )

        self.index = pc.Index(self.index_name)

        self.chunked_data = []
        self.parsed_data = []

        openai_key = os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=openai_key)

    async def process_embedding(self, chunked_data: list, parsed_data: list) -> dict:
        """
        청킹된 데이터를 임베딩하여 벡터 DB에 저장합니다.
        """

        self.parsed_data = parsed_data
        self.chunked_data = chunked_data

        if not self.chunked_data:
            raise ValueError("청킹된 데이터가 없습니다. 먼저 청킹을 수행해주세요.")

        print(f"[DEBUG] Pinecone 임베딩 시작 - 총 {len(chunked_data)}개 청크")

        vectors = []
        batch_size = 100

        try:
            for i, item in enumerate(chunked_data):
                chunk = item["chunk"]
                metadata = item["metadata"]
                chunk_index = item["chunk_index"]

                # OpenAI API로 임베딩 생성
                try:
                    embedding_response = self.client.embeddings.create(
                        input=chunk,
                        model="text-embedding-3-small"
                    )
                    vector = embedding_response.data[0].embedding
                except Exception as e:
                    print(f"[ERROR] 임베딩 생성 실패 (청크 {i}): {str(e)}")
                    raise

                # Pinecone에 저장할 ID 생성 (ASCII만 허용되므로 URL 인코딩 사용)
                import urllib.parse
                # 파일명에서 .json 제거하고 사건번호를 URL 인코딩
                filename_base = metadata['filename'].replace('.json', '')
                case_no_encoded = urllib.parse.quote(str(metadata['case_no']), safe='')
                vector_id = f"{filename_base}_{case_no_encoded}_{chunk_index}"

                # Pinecone 메타데이터 크기 제한(40KB)을 고려하여 content는 전체 저장
                # 단, 메타데이터의 다른 필드는 간단하게 유지
                vectors.append({
                    "id": vector_id,
                    "values": vector,
                    "metadata": {
                        "case_no": str(metadata.get('case_no', '')),
                        "date": str(metadata.get('date', '')),
                        "court": str(metadata.get('court', '')),
                        "category": str(metadata.get('category', '')),
                        "filename": str(metadata.get('filename', '')),
                        "chunk_index": chunk_index,
                        "content": chunk  # 검색 결과로 반환하기 위해 필요
                    }
                })

                # 배치 단위로 저장
                if len(vectors) >= batch_size:
                    print(f"[DEBUG] 배치 업로드 중... ({i+1}/{len(chunked_data)})")
                    try:
                        self.index.upsert(vectors=vectors)
                        print(f"[DEBUG] 배치 업로드 성공!")
                    except Exception as e:
                        print(f"[ERROR] Pinecone upsert 실패: {str(e)}")
                        print(f"[ERROR] 배치 크기: {len(vectors)}")
                        print(f"[ERROR] 첫 번째 벡터 ID: {vectors[0]['id']}")
                        import traceback
                        traceback.print_exc()
                        raise
                    vectors = []

            # 남은 벡터 업로드
            if vectors:
                print(f"[DEBUG] 마지막 배치 업로드 중...")
                try:
                    self.index.upsert(vectors=vectors)
                    print(f"[DEBUG] 마지막 배치 업로드 성공!")
                except Exception as e:
                    print(f"[ERROR] Pinecone 마지막 배치 upsert 실패: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    raise

            print(f"[DEBUG] Pinecone 임베딩 완료!")

            return {
                "status": "success",
                "total_chunks_embedded": len(chunked_data),
                "message": f"{len(chunked_data)}개의 청크가 Pinecone에 저장되었습니다."
            }
        except Exception as e:
            print(f"[ERROR] process_embedding 전체 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Pinecone 임베딩 실패: {str(e)}")

    def clear_vector_db(self) -> str:
        """
        벡터 DB의 모든 데이터를 삭제합니다.

        Returns:
            삭제 결과
        """
        try:
            # Pinecone 인덱스의 모든 벡터 삭제
            self.index.delete(delete_all=True)

            # 메모리 상의 데이터도 초기화
            self.parsed_data = []
            self.chunked_data = []

            return "Pinecone 벡터 DB의 모든 데이터가 삭제되었습니다."
        except Exception as e:
            raise Exception(f"Pinecone DB 초기화 실패: {str(e)}")

    async def search(self, query: str, top_k: int = 3) -> dict:
        """
        벡터 DB에서 유사한 문서를 검색합니다.

        Args:
            query (str): 검색 쿼리
            top_k (int): 반환할 상위 k개 결과 수

        Returns:
            검색 결과 (ChromaDB와 동일한 형식)
        """
        try:
            # 검색어를 벡터로 변환
            embedding_response = self.client.embeddings.create(
                input=query,
                model="text-embedding-3-small"
            )
            query_vector = embedding_response.data[0].embedding

            # Pinecone에서 검색
            search_result = self.index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True
            )

            if not search_result.matches:
                return {
                    "status": "success",
                    "query": query,
                    "results": [],
                    "count": 0,
                    "message": "검색 결과가 없습니다."
                }

            # ChromaDB 형식으로 변환
            formatted_results = []
            for match in search_result.matches:
                metadata = match.metadata.copy()
                content = metadata.pop("content", "")  # content를 metadata에서 분리

                formatted_results.append({
                    "content": content,
                    "metadata": metadata,
                    "distance": 1 - match.score  # Pinecone은 유사도(0~1), ChromaDB는 거리 사용
                })

            return {
                "status": "success",
                "query": query,
                "results": formatted_results,
                "count": len(formatted_results)
            }

        except Exception as e:
            raise Exception(f"Pinecone 검색 중 오류 발생: {str(e)}")



