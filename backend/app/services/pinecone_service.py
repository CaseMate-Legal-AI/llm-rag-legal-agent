from pinecone import Pinecone, ServerlessSpec
import pinecone
import os

class PineconeService:

    def __init__(self) -> None:
        pc = pinecone.init(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = "legal-precedents"

        if self.index_name not in pc.list_indexes().names():
            pc.create_index(
                name=self.index_name,
                dimension=1536,
                metric="cosine",
                serverless_spec=ServerlessSpec(capacity="p1.x1")
            )

        self.index = pc.Index(name=self.index_name)

        self.chunked_data = []
        self.passed_data = []

    async def process_embedding(self, chunked_data: list, parsed_data: list) -> dict:
        """
        청킹된 데이터를 임베딩하여 벡터 DB에 저장합니다.
        """

        self.passed_data = parsed_data
        self.chunked_data = chunked_data

        self.index.upsert(chunked_data)

    def clear_vector_db(self) -> dict:
        """
        벡터 DB의 모든 데이터를 삭제합니다.

        Returns:
            삭제 결과
        """
        pass
