import json
import re
from typing import List
from pathlib import Path
from fastapi import UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
from app.models.vectordb import VectorDB

# .env 파일 경로 찾기 (backend 폴더에 위치)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class EmbeddingService:
    def __init__(self, model=None):
        self.model = model
        # 파싱 결과를 저장할 변수
        self.parsed_data = []
        # 청킹 결과를 저장할 변수
        self.chunked_data = []

    async def parssing_json(self, files: List[UploadFile]) -> List[tuple]:
        """
        업로드된 JSON 파일들을 파싱합니다.

        Args:
            files: 업로드된 JSON 파일 리스트

        Returns:
            (text, metadata) 튜플의 리스트
        """
        results = []

        for file in files:
            try:
                content = await file.read()
                json_data = json.loads(content.decode('utf-8'))

                # JSON 구조 확인
                list_info = json_data.get('목록정보', {})
                detail_info = json_data.get('상세정보', {})
                prec_service = detail_info.get('PrecService', {})

                # 데이터 추출
                case_name = list_info.get('사건명', '')
                case_issues = prec_service.get('판시사항', '')
                judgment_summary = prec_service.get('판결요지', '')
                case_content = prec_service.get('판례내용', '')

                refined_content = f"""
                [사건명]: {case_name}
                [쟁점]: {self.remove_html_tag(case_issues)}
                [요지]: {self.remove_html_tag(judgment_summary)}
                [상세]: {self.remove_html_tag(case_content)}
                """.strip()

                metadata = {
                    "case_no": list_info.get('사건번호', ''),
                    "date": list_info.get('선고일자', ''),
                    "court": list_info.get('법원명', ''),
                    "category": list_info.get('사건종류명', ''),
                    "filename": file.filename
                }

                # (text, metadata) 튜플 추가
                results.append((refined_content, metadata))

                # 메모리 절약을 위해 파일 닫기
                await file.close()

            except json.JSONDecodeError as e:
                print(f"JSON 파싱 실패: {file.filename} - {str(e)}")
                continue
            except Exception as e:
                print(f"파일 처리 실패: {file.filename} - {str(e)}")
                continue

        # 파싱 결과 저장
        self.parsed_data = results

        return {
            "status": "success",
            "total_files": len(results),
            "message": f"{len(results)}개의 파일이 파싱되었습니다."
        }

    async def parse_sample_directory(self) -> dict:
        """
        frontend/src/sample/pan 디렉토리의 모든 JSON 파일을 파싱합니다.

        Returns:
            파싱 결과 (총 파일 수, 성공/실패 수)
        """
        results = []

        current_dir = Path(__file__).parent
        sample_dir = current_dir.parent.parent.parent / "frontend" / "src" / "sample" / "pan"

        if not sample_dir.exists():
            raise ValueError(f"샘플 디렉토리를 찾을 수 없습니다: {sample_dir}")

        json_files = list(sample_dir.glob("*.json"))

        if not json_files:
            raise ValueError(f"샘플 디렉토리에 JSON 파일이 없습니다: {sample_dir}")

        failed_files = []

        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    json_data = json.load(f)
                print(f"파싱 중: {file_path.name}")

                # JSON 구조 확인
                listInfo = json_data.get('목록정보', {})
                content = json_data.get('상세정보', {})
                prec_service = content.get('PrecService', {})

                # 데이터 추출
                사건명 = listInfo.get('사건명', '')
                판시사항 = prec_service.get('판시사항', '')
                판결요지 = prec_service.get('판결요지', '')
                판례내용 = prec_service.get('판례내용', '')

                refined_content = f"""
                [사건명]: {사건명}
                [쟁점]: {self.remove_html_tag(판시사항)}
                [요지]: {self.remove_html_tag(판결요지)}
                [상세]: {self.remove_html_tag(판례내용)}
                """.strip()

                metadata = {
                    "case_no": listInfo.get('사건번호', ''),
                    "date": listInfo.get('선고일자', ''),
                    "court": listInfo.get('법원명', ''),
                    "category": listInfo.get('사건종류명', ''),
                    "filename": file_path.name
                }
                print(f"metadata: {metadata}")
                # (text, metadata) 튜플 추가
                results.append((refined_content, metadata))

            except json.JSONDecodeError as e:
                print(f"JSON 파싱 실패: {file_path.name} - {str(e)}")
                failed_files.append(file_path.name)
                continue
            except Exception as e:
                print(f"파일 처리 실패: {file_path.name} - {str(e)}")
                failed_files.append(file_path.name)
                continue

        # 파싱 결과 저장
        self.parsed_data = results

        message = f"{len(results)}개의 파일이 파싱되었습니다."
        if failed_files:
            message += f" (실패: {len(failed_files)}개)"

        return {
            "status": "success",
            "total_files": len(json_files),
            "parsed_files": len(results),
            "failed_files": len(failed_files),
            "message": message
        }


    def remove_html_tag(self, text: str) -> str:
        """
        HTML 태그를 제거하고 텍스트를 정제합니다.

        Args:
            text: 정제할 텍스트

        Returns:
            정제된 텍스트
        """
        if not text: return ""
        # HTML 태그 제거
        text = re.sub(r'<[^>]+>', '', text)
        # 과도한 공백 및 줄바꿈 정리
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def chunking_text(self, text: str) -> List[str]:
        """
        텍스트를 청크로 분할합니다.
        """
        if not text or text.strip() == '':
            return []

        chunk_size = 800
        chunk_overlap = 150
        separators = ["\n\n", "\n", ". ", " "]

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators
        )

        chunks = text_splitter.split_text(text)
        return chunks

    async def process_chunking(self) -> dict:
        """
        파싱된 데이터를 청킹합니다.
        """
        if not self.parsed_data:
            raise ValueError("파싱된 데이터가 없습니다. 먼저 파일을 파싱해주세요.")

        self.chunked_data = []
        total_chunks = 0

        for text, metadata in self.parsed_data:
            chunks = self.chunking_text(text)
            total_chunks += len(chunks)

            # 각 청크와 메타데이터를 함께 저장
            for i, chunk in enumerate(chunks):
                self.chunked_data.append({
                    "chunk": chunk,
                    "metadata": metadata,
                    "chunk_index": i
                })

        return {
            "status": "success",
            "total_documents": len(self.parsed_data),
            "total_chunks": total_chunks,
            "message": f"{len(self.parsed_data)}개 문서에서 {total_chunks}개의 청크가 생성되었습니다."
        }

    async def process_embedding(self, vectordb: VectorDB) -> dict:
        """
        청킹된 데이터를 임베딩하여 벡터 DB에 저장합니다.
        """

        print("[DEBUG] 임베딩 처리 시작...")

        return await vectordb.process_embedding(self.chunked_data, self.parsed_data)

    def clear_vector_db(self, vectordb: VectorDB) -> dict:
        """
        벡터 DB의 모든 데이터를 삭제합니다.

        Returns:
            삭제 결과
        """
        try:
            # 메모리 상의 데이터도 초기화
            self.parsed_data = []
            self.chunked_data = []

            message = vectordb.clear_vector_db()

            return {
                "status": "success",
                "message": message
            }
        except Exception as e:
            raise Exception(f"DB 초기화 실패: {str(e)}")

    async def search(self, vectordb: VectorDB, query: str, top_k: int = 3) -> dict:
        """
        벡터 DB에서 유사한 문서를 검색합니다.

        Args:
            query: 검색 쿼리
            top_k: 반환할 문서 개수

        Returns:
            검색 결과
        """

        return await vectordb.search(query, top_k)
