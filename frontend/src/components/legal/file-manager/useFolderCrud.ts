import { useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import type { FileFolder } from "./types";
import { getNextFolderName, isDescendantOf } from "./utils";

interface UseFolderCrudProps {
  folders: FileFolder[];
  setFolders: React.Dispatch<React.SetStateAction<FileFolder[]>>;
  selectedFolder: string;
  setSelectedFolder: (id: string) => void;
  refreshCategories: () => Promise<void>;
  fetchEvidences: () => Promise<void>;
}

export function useFolderCrud({
  folders,
  setFolders,
  selectedFolder,
  setSelectedFolder,
  refreshCategories,
  fetchEvidences,
}: UseFolderCrudProps) {
  // 인라인 폴더 생성
  const [inlineNewFolderParentId, setInlineNewFolderParentId] = useState<string | null>(null);
  const [inlineNewFolderName, setInlineNewFolderName] = useState("");
  const creatingFolderRef = useRef(false);

  // 이름 변경
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState("");
  const renamingRef = useRef(false);

  // 폴더별 로딩 상태
  const [operatingFolderIds, setOperatingFolderIds] = useState<Set<string>>(new Set());

  const setFolderOperating = (folderId: string, operating: boolean) => {
    setOperatingFolderIds((prev) => {
      const next = new Set(prev);
      if (operating) next.add(folderId);
      else next.delete(folderId);
      return next;
    });
  };

  const isFolderOperating = useCallback(
    (folderId: string) => operatingFolderIds.has(folderId),
    [operatingFolderIds]
  );

  // 폴더 추가 시작
  const addCategory = useCallback(() => {
    const parentId = selectedFolder;
    setInlineNewFolderParentId(parentId);
    setInlineNewFolderName(getNextFolderName(folders, parentId));
    if (parentId !== "root") {
      setFolders((prev) =>
        prev.map((f) => (f.id === parentId ? { ...f, expanded: true } : f))
      );
    }
  }, [selectedFolder, folders, setFolders]);

  const cancelInlineFolder = useCallback(() => {
    setInlineNewFolderParentId(null);
    setInlineNewFolderName("");
  }, []);

  const handleCreateCategory = useCallback(async () => {
    if (
      creatingFolderRef.current ||
      !inlineNewFolderName.trim() ||
      inlineNewFolderParentId === null
    )
      return;

    creatingFolderRef.current = true;
    const name = inlineNewFolderName.trim();
    const parentId = inlineNewFolderParentId;

    setInlineNewFolderParentId(null);
    setInlineNewFolderName("");

    try {
      const response = await apiFetch("/api/v1/evidence/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parent_id:
            parentId === "root"
              ? null
              : parseInt(parentId.replace("cat-", "")),
          order_index: 0,
        }),
      });
      if (!response.ok) throw new Error(`폴더 생성 실패: ${response.statusText}`);
      await refreshCategories();
    } catch (error) {
      console.error("폴더 생성 실패:", error);
      alert("폴더 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      creatingFolderRef.current = false;
    }
  }, [inlineNewFolderName, inlineNewFolderParentId, refreshCategories]);

  // 이름 변경
  const startRenameFolder = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder || folderId === "root") return;
      setRenamingFolderId(folderId);
      setRenamingFolderName(folder.name);
    },
    [folders]
  );

  const cancelRenameFolder = useCallback(() => {
    setRenamingFolderId(null);
    setRenamingFolderName("");
  }, []);

  const handleRenameFolder = useCallback(async () => {
    if (renamingRef.current || !renamingFolderName.trim() || !renamingFolderId)
      return;

    const newName = renamingFolderName.trim();
    const folderId = renamingFolderId;
    const oldFolder = folders.find((f) => f.id === folderId);

    if (oldFolder && oldFolder.name === newName) {
      cancelRenameFolder();
      return;
    }

    renamingRef.current = true;
    setRenamingFolderId(null);
    setRenamingFolderName("");
    setFolderOperating(folderId, true);

    const categoryId = parseInt(folderId.replace("cat-", ""));

    try {
      const response = await apiFetch(
        `/api/v1/evidence/categories/${categoryId}/rename`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        }
      );
      if (!response.ok) throw new Error("이름 변경 실패");
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f))
      );
    } catch (error) {
      console.error("폴더 이름 변경 실패:", error);
      alert("폴더 이름 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      renamingRef.current = false;
      setFolderOperating(folderId, false);
    }
  }, [renamingFolderName, renamingFolderId, folders, cancelRenameFolder, setFolders]);

  // 폴더 삭제
  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (folderId === "root") return;
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      const hasChild = folders.some((f) => f.parentId === folderId);
      const msg = hasChild
        ? `"${folder.name}" 폴더와 하위 폴더를 모두 삭제하시겠습니까?\n(파일은 삭제되지 않고 미분류로 이동됩니다)`
        : `"${folder.name}" 폴더를 삭제하시겠습니까?\n(파일은 삭제되지 않고 미분류로 이동됩니다)`;
      if (!confirm(msg)) return;

      const categoryId = parseInt(folderId.replace("cat-", ""));
      setFolderOperating(folderId, true);

      try {
        const response = await apiFetch(
          `/api/v1/evidence/categories/delete/${categoryId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("삭제 실패");
        await refreshCategories();
        await fetchEvidences();
        if (selectedFolder === folderId) setSelectedFolder("root");
      } catch (error) {
        console.error("폴더 삭제 실패:", error);
        alert("폴더 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setFolderOperating(folderId, false);
      }
    },
    [folders, selectedFolder, setSelectedFolder, refreshCategories, fetchEvidences]
  );

  // 폴더 이동
  const moveFolder = useCallback(
    async (folderId: string, newParentId: string) => {
      if (folderId === newParentId || folderId === "root") return;
      if (
        newParentId !== "root" &&
        isDescendantOf(folders, folderId, newParentId)
      )
        return;

      const currentFolder = folders.find((f) => f.id === folderId);
      if (currentFolder?.parentId === newParentId) return;

      const categoryId = parseInt(folderId.replace("cat-", ""));
      const parentCategoryId =
        newParentId === "root"
          ? null
          : parseInt(newParentId.replace("cat-", ""));

      setFolderOperating(folderId, true);

      try {
        const response = await apiFetch(
          `/api/v1/evidence/categories/${categoryId}/move`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parent_id: parentCategoryId }),
          }
        );
        if (!response.ok) throw new Error("이동 실패");
        await refreshCategories();
      } catch (error) {
        console.error("폴더 이동 실패:", error);
        alert("폴더 이동에 실패했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setFolderOperating(folderId, false);
      }
    },
    [folders, refreshCategories]
  );

  const toggleFolderExpanded = useCallback(
    (folderId: string) => {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, expanded: !f.expanded } : f
        )
      );
    },
    [setFolders]
  );

  return {
    inlineNewFolderParentId,
    inlineNewFolderName,
    setInlineNewFolderName,
    renamingFolderId,
    renamingFolderName,
    setRenamingFolderName,
    renamingRef,
    creatingFolderRef,
    isFolderOperating,
    addCategory,
    cancelInlineFolder,
    handleCreateCategory,
    startRenameFolder,
    cancelRenameFolder,
    handleRenameFolder,
    deleteFolder,
    moveFolder,
    toggleFolderExpanded,
  };
}
