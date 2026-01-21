from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
from app.services.llm_service import LLMService
from app.services.rag_service import RagService
from app.services.embedding_service import EmbeddingService

router = APIRouter()
llm_service = LLMService()
rag_service = RagService()
embedding_service = EmbeddingService()

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str

# @router.post("/chat", response_model=ChatResponse)
# async def chat(request: ChatRequest):
#     """
#     LLM과 대화하는 엔드포인트
#     """
#     try:
#         response = await llm_service.generate_response(
#             message=request.message,
#             conversation_id=request.conversation_id
#         )
#         return response
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/conversations/{conversation_id}")
# async def get_conversation(conversation_id: str):
#     """
#     대화 기록을 가져오는 엔드포인트
#     """
#     try:
#         conversation = await llm_service.get_conversation(conversation_id)
#         return conversation
#     except Exception as e:
#         raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다")

# @router.delete("/conversations/{conversation_id}")
# async def delete_conversation(conversation_id: str):
#     """
#     대화 기록을 삭제하는 엔드포인트
#     """
#     try:
#         await llm_service.delete_conversation(conversation_id)
#         return {"message": "대화가 삭제되었습니다"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@router.post("/embedding/parssing-json")
async def parssing_json_endpoint(files: List[UploadFile] = File(...)):
    """
    JSON 파일들을 업로드하고 파싱하는 엔드포인트

    Args:
        files: 업로드할 JSON 파일 리스트

    Returns:
        파싱 결과 (총 파일 수, 성공/실패 수, 파일별 정보)
    """
    try:
        parsed_data = await embedding_service.parssing_json(files)
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embedding/parse-sample-directory")
async def parse_sample_directory_endpoint():
    """
    frontend/src/sample/pan 디렉토리의 JSON 파일들을 파싱하는 엔드포인트

    Returns:
        파싱 결과 (총 파일 수, 성공/실패 수)
    """
    try:
        result = await embedding_service.parse_sample_directory()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embedding/chunking")
async def chunking_endpoint():
    """
    파싱된 데이터를 청킹하는 엔드포인트

    Returns:
        청킹 결과 (총 문서 수, 총 청크 수)
    """
    try:
        result = await embedding_service.process_chunking()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embedding/embedding")
async def embedding_endpoint():
    """
    청킹된 데이터를 임베딩하여 벡터 DB에 저장하는 엔드포인트

    Returns:
        임베딩 결과 (저장된 청크 수)
    """
    try:
        result = await embedding_service.process_embedding()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/embedding/clear-db")
async def clear_db_endpoint():
    """
    벡터 DB의 모든 데이터를 삭제하는 엔드포인트

    Returns:
        삭제 결과
    """
    try:
        result = embedding_service.clear_vector_db()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

