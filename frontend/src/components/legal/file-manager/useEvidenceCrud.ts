import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { ManagedFile } from "./types";

interface UseEvidenceCrudProps {
  selectedFolder: string;
  files: ManagedFile[];
  setFiles: React.Dispatch<React.SetStateAction<ManagedFile[]>>;
  fetchEvidences: () => Promise<void>;
}

export function useEvidenceCrud({
  selectedFolder,
  files,
  setFiles,
  fetchEvidences,
}: UseEvidenceCrudProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDeleting, setIsDeleting] = useState(false);

  // 단일/다중 파일 업로드
  const uploadFiles = useCallback(
    async (fileList: File[]) => {
      if (fileList.length === 0) return;
      let uploadSuccessCount = 0;

      setIsUploading(true);
      setUploadProgress({ current: 0, total: fileList.length });

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        try {
          const formData = new FormData();
          formData.append("file", file);

          if (selectedFolder !== "root") {
            const categoryId = parseInt(selectedFolder.replace("cat-", ""));
            formData.append("category_id", categoryId.toString());
          }

          const response = await apiFetch("/api/v1/evidence/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`업로드 실패: ${response.statusText}`);
          }

          await response.json();
          uploadSuccessCount++;
          setUploadProgress({ current: i + 1, total: fileList.length });
        } catch (error) {
          console.error(`파일 업로드 실패 (${file.name}):`, error);
          alert(`파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.`);
        }
      }

      setIsUploading(false);

      if (uploadSuccessCount > 0) {
        await fetchEvidences();
      }
    },
    [selectedFolder, fetchEvidences]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      setIsDeleting(true);
      try {
        const response = await apiFetch(`/api/v1/evidence/delete/${fileId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`삭제 실패: ${response.statusText}`);
        }
        await response.json();
        await fetchEvidences();
        return true;
      } catch (error) {
        console.error("증거 삭제 실패:", error);
        alert("파일 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [fetchEvidences]
  );

  const deleteSelectedFiles = useCallback(
    async (
      selectedFiles: Set<string>,
      onProgress: (current: number, total: number) => void
    ) => {
      setIsDeleting(true);
      const ids = Array.from(selectedFiles);
      let done = 0;

      for (const fileId of ids) {
        try {
          const response = await apiFetch(
            `/api/v1/evidence/delete/${fileId}`,
            { method: "DELETE" }
          );
          if (!response.ok) {
            console.error(`증거 ${fileId} 삭제 실패: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`증거 ${fileId} 삭제 실패:`, error);
        }
        done++;
        onProgress(done, ids.length);
      }

      await fetchEvidences();
      setIsDeleting(false);
    },
    [fetchEvidences]
  );

  const toggleStar = useCallback(
    async (fileId: string) => {
      try {
        const response = await apiFetch(`/api/v1/evidence/${fileId}/starred`, {
          method: "PATCH",
        });
        if (!response.ok) {
          throw new Error(`즐겨찾기 토글 실패: ${response.statusText}`);
        }
        const data = await response.json();
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, starred: data.starred } : f
          )
        );
      } catch (error) {
        console.error("즐겨찾기 토글 실패:", error);
        alert("즐겨찾기 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    },
    [setFiles]
  );

  const linkFileToCase = useCallback(
    async (filesToLink: string[], caseId: string) => {
      if (filesToLink.length === 0 || !caseId) return false;
      try {
        for (const evidenceId of filesToLink) {
          const response = await apiFetch(
            `/api/v1/evidence/${evidenceId}/link-case/${caseId}`,
            { method: "POST" }
          );
          if (!response.ok) throw new Error(`연결 실패: ${response.statusText}`);
        }
        await fetchEvidences();
        return true;
      } catch (error) {
        console.error("사건 연결 실패:", error);
        alert("사건 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return false;
      }
    },
    [fetchEvidences]
  );

  const moveFilesToFolder = useCallback(
    async (fileIds: string[], folderId: string) => {
      const categoryId = folderId === "root" ? null : parseInt(folderId.replace("cat-", ""));
      let failCount = 0;
      try {
        for (const fileId of fileIds) {
          const response = await apiFetch(`/api/v1/evidence/${fileId}/move`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId }),
          });
          if (!response.ok) {
            failCount++;
            const errText = await response.text();
            console.error(`파일 ${fileId} 이동 실패 (${response.status}):`, errText);
          }
        }
        if (failCount > 0) {
          alert(`${failCount}개 파일 이동에 실패했습니다. 잠시 후 다시 시도해주세요.`);
        }
        await fetchEvidences();
        return failCount === 0;
      } catch (error) {
        console.error("파일 이동 실패:", error);
        alert("파일 이동에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return false;
      }
    },
    [fetchEvidences]
  );

  const downloadFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      const response = await apiFetch(`/api/v1/evidence/${fileId}/url`);
      if (!response.ok) {
        throw new Error(`URL 생성 실패: ${response.statusText}`);
      }
      const data = await response.json();
      const fileResponse = await fetch(data.signed_url);
      if (!fileResponse.ok) {
        throw new Error("파일 다운로드 실패");
      }
      const blob = await fileResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("파일 다운로드 실패:", error);
      alert("파일 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }, []);

  const downloadSelectedFiles = useCallback(
    async (selectedFiles: Set<string>) => {
      const selectedFilesList = files.filter((f) => selectedFiles.has(f.id));
      for (const file of selectedFilesList) {
        try {
          await downloadFile(file.id, file.name);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`파일 다운로드 실패 (${file.name}):`, error);
        }
      }
    },
    [files, downloadFile]
  );

  return {
    isUploading,
    uploadProgress,
    isDeleting,
    uploadFiles,
    deleteFile,
    deleteSelectedFiles,
    toggleStar,
    linkFileToCase,
    moveFilesToFolder,
    downloadFile,
    downloadSelectedFiles,
  };
}
