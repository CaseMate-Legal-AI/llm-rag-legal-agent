from typing import Protocol

class VectorDB(Protocol):
    async def process_embedding(self, chunked_data: list, parsed_data: list) -> dict:
        pass
    def clear_vector_db(self) -> dict:
        pass
    async def search(self, query: str, top_k: int = 3) -> dict:
        pass
