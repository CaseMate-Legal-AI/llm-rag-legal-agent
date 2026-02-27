import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { ManagedFile, FileFolder, CaseFolder, DocumentItem } from "./types";

export function useFileManager() {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([
    { id: "root", name: "전체", parentId: null, expanded: true },
  ]);
  const [caseFolders, setCaseFolders] = useState<CaseFolder[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([]);
  const [caseDocuments, setCaseDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const mapEvidence = (ev: any): ManagedFile => ({
    id: ev.evidence_id.toString(),
    name: ev.file_name,
    type: ev.file_type || "application/octet-stream",
    size: ev.file_size || 0,
    folder: ev.category_id ? `cat-${ev.category_id}` : "root",
    uploadedAt: ev.created_at ? ev.created_at.split("T")[0] : "",
    modifiedAt: ev.created_at ? ev.created_at.split("T")[0] : "",
    linkedCases: ev.linked_case_ids
      ? ev.linked_case_ids.map((id: number) => id.toString())
      : [],
    starred: ev.starred || false,
  });

  const mapCategory = (cat: any): FileFolder => ({
    id: `cat-${cat.category_id}`,
    name: cat.name,
    parentId: cat.parent_id ? `cat-${cat.parent_id}` : "root",
    expanded: false,
  });

  const fetchInitData = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const response = await apiFetch("/api/v1/file-manager/init");
      if (response.ok) {
        const data = await response.json();
        const categoryFolders = data.categories.map(mapCategory);
        setFolders([
          { id: "root", name: "전체", parentId: null, expanded: true },
          ...categoryFolders,
        ]);
        setFiles(data.files.map(mapEvidence));
        setCaseFolders(data.case_folders);
        setAllDocuments(data.documents);
      }
    } catch {
      // fallback: 개별 API 호출
      try {
        const [catRes, fileRes, caseRes, docRes] = await Promise.all([
          apiFetch("/api/v1/evidence/categories"),
          apiFetch("/api/v1/evidence/list"),
          apiFetch("/api/v1/cases"),
          apiFetch("/api/v1/documents/"),
        ]);
        if (catRes.ok) {
          const catData = await catRes.json();
          const categoryFolders = catData.categories.map(mapCategory);
          setFolders([
            { id: "root", name: "전체", parentId: null, expanded: true },
            ...categoryFolders,
          ]);
        }
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          setFiles(fileData.files.map(mapEvidence));
        }
        if (caseRes.ok) {
          const caseData = await caseRes.json();
          setCaseFolders(
            caseData.cases.map((c: any) => ({ id: c.id, title: c.title }))
          );
        }
        if (docRes.ok) {
          const docData = await docRes.json();
          setAllDocuments(docData);
        }
      } catch (fallbackError) {
        console.error("개별 API도 실패:", fallbackError);
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  const fetchEvidences = useCallback(async () => {
    try {
      const response = await apiFetch("/api/v1/evidence/list");
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files.map(mapEvidence));
      }
    } catch (error) {
      console.error("증거 목록 조회 실패:", error);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    const response = await apiFetch("/api/v1/evidence/categories");
    if (response.ok) {
      const data = await response.json();
      const categoryFolders = data.categories.map(mapCategory);
      setFolders((prev) => {
        const expandedIds = new Set(
          prev.filter((f) => f.expanded).map((f) => f.id)
        );
        return [
          { id: "root", name: "전체", parentId: null, expanded: true },
          ...categoryFolders.map((f: FileFolder) => ({
            ...f,
            expanded: expandedIds.has(f.id),
          })),
        ];
      });
    }
  }, []);

  const fetchCaseDocuments = useCallback(async (caseId: number) => {
    setIsLoadingDocuments(true);
    try {
      const response = await apiFetch(`/api/v1/documents/case/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setCaseDocuments(
          data.map((d: any) => ({ ...d, case_id: caseId }))
        );
      }
    } catch (error) {
      console.error("사건 문서 목록 조회 실패:", error);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  const clearCaseDocuments = useCallback(() => {
    setCaseDocuments([]);
  }, []);

  useEffect(() => {
    fetchInitData();
  }, [fetchInitData]);

  return {
    files,
    setFiles,
    folders,
    setFolders,
    caseFolders,
    allDocuments,
    caseDocuments,
    isLoadingFiles,
    isLoadingDocuments,
    fetchEvidences,
    refreshCategories,
    fetchCaseDocuments,
    clearCaseDocuments,
  };
}
