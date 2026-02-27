import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ManagedFile,
  PageMode,
  FilterMode,
  ViewMode,
} from "./types";
import { useFileManager } from "./useFileManager";
import { useEvidenceCrud } from "./useEvidenceCrud";
import { useFolderCrud } from "./useFolderCrud";

import { FileManagerHeader } from "./file-manager-header";
import { FileManagerTabs } from "./file-manager-tabs";
import { BreadcrumbBar } from "./toolbar/breadcrumb-bar";
import { FilterPills } from "./toolbar/filter-pills";
import { EvidenceSidebar } from "./sidebar/evidence-sidebar";
import { DocumentsSidebar } from "./sidebar/documents-sidebar";
import { EvidenceSubpage } from "./evidence-subpage";
import { DocumentsSubpage } from "./documents-subpage";

import { LinkToCaseDialog } from "./dialogs/link-to-case-dialog";
import { DeleteConfirmDialog } from "./dialogs/delete-confirm-dialog";
import { BulkDeleteDialog } from "./dialogs/bulk-delete-dialog";
import { UploadProgressDialog } from "./dialogs/upload-progress-dialog";
import { MoveToFolderDialog } from "./dialogs/move-to-folder-dialog";

export function FileManagerPage() {
  const navigate = useNavigate();

  // 페이지 상태
  const [pageMode, setPageMode] = useState<PageMode>("evidence");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("root");
  const [selectedCaseFolder, setSelectedCaseFolder] = useState<number | null>(
    null
  );
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // 데이터 훅
  const fm = useFileManager();

  // 증거 CRUD 훅
  const ec = useEvidenceCrud({
    selectedFolder,
    files: fm.files,
    setFiles: fm.setFiles,
    fetchEvidences: fm.fetchEvidences,
  });

  // 폴더 CRUD 훅
  const fc = useFolderCrud({
    folders: fm.folders,
    setFolders: fm.setFolders,
    selectedFolder,
    setSelectedFolder,
    refreshCategories: fm.refreshCategories,
    fetchEvidences: fm.fetchEvidences,
  });

  // 삭제 다이얼로그
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ManagedFile | null>(null);

  // 일괄 삭제 다이얼로그
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({
    current: 0,
    total: 0,
  });

  // 링크 다이얼로그
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedFileForLink, setSelectedFileForLink] =
    useState<ManagedFile | null>(null);
  const [filesToLink, setFilesToLink] = useState<string[]>([]);

  // 폴더 이동 다이얼로그
  const [showMoveToFolderDialog, setShowMoveToFolderDialog] = useState(false);
  const [filesToMove, setFilesToMove] = useState<string[]>([]);

  // 파일 업로드 input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 선택된 사건 폴더의 문서 로드
  useEffect(() => {
    if (selectedCaseFolder === null) {
      fm.clearCaseDocuments();
    } else {
      fm.fetchCaseDocuments(selectedCaseFolder);
    }
  }, [selectedCaseFolder]);

  // 키보드 단축키: F2 이름 변경, Delete 폴더 삭제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pageMode !== "evidence" || selectedFolder === "root" || selectedFolder === "uncategorized") return;
      if (fc.renamingFolderId || fc.inlineNewFolderParentId) return;
      if (e.key === "F2") {
        e.preventDefault();
        fc.startRenameFolder(selectedFolder);
      } else if (e.key === "Delete") {
        e.preventDefault();
        fc.deleteFolder(selectedFolder);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedFolder,
    pageMode,
    fc.renamingFolderId,
    fc.inlineNewFolderParentId,
  ]);

  // 페이지 모드 전환
  const handlePageModeChange = (mode: PageMode) => {
    setPageMode(mode);
    setFilterMode("all");
    setSearchQuery("");
  };

  // 파일 선택
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const selectAllFiles = () => {
    // 현재 보이는 파일 기준
    if (selectedFiles.size > 0) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(fm.files.map((f) => f.id)));
    }
  };

  // 단일 파일 삭제 시작
  const handleDeleteFile = (fileId: string) => {
    const file = fm.files.find((f) => f.id === fileId);
    if (!file) return;
    setFileToDelete(file);
    setShowDeleteConfirmDialog(true);
  };

  // 단일 파일 삭제 확인
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    const success = await ec.deleteFile(fileToDelete.id);
    if (success) {
      setShowDeleteConfirmDialog(false);
      setFileToDelete(null);
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(fileToDelete.id);
        return next;
      });
    }
  };

  // 일괄 삭제
  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return;
    setBulkDeleteProgress({ current: 0, total: selectedFiles.size });
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    await ec.deleteSelectedFiles(selectedFiles, (current, total) => {
      setBulkDeleteProgress({ current, total });
    });
    setSelectedFiles(new Set());
    setShowBulkDeleteDialog(false);
  };

  // 링크 모달
  const openLinkModal = (file?: ManagedFile) => {
    if (file) {
      setSelectedFileForLink(file);
      setFilesToLink([file.id]);
    } else {
      setSelectedFileForLink(null);
      setFilesToLink(Array.from(selectedFiles));
    }
    setShowLinkModal(true);
  };

  const handleLinkToCase = async (caseId: string) => {
    const success = await ec.linkFileToCase(filesToLink, caseId);
    if (success) {
      setShowLinkModal(false);
      setSelectedFileForLink(null);
      setFilesToLink([]);
      setSelectedFiles(new Set());
    }
  };

  // 폴더로 이동 (다이얼로그 열기) — 벌크 선택
  const handleOpenMoveToFolder = () => {
    if (selectedFiles.size === 0) return;
    setFilesToMove(Array.from(selectedFiles));
    setShowMoveToFolderDialog(true);
  };

  // 폴더로 이동 (단일 파일 — 액션 메뉴에서)
  const handleSingleFileMoveToFolder = (file: ManagedFile) => {
    setFilesToMove([file.id]);
    setShowMoveToFolderDialog(true);
  };

  // 폴더로 이동 실행
  const handleMoveToFolder = async (folderId: string) => {
    const success = await ec.moveFilesToFolder(filesToMove, folderId);
    if (success) {
      setShowMoveToFolderDialog(false);
      setFilesToMove([]);
      setSelectedFiles(new Set());
    }
  };

  // 사이드바에서 파일 드래그앤드롭으로 폴더 이동
  const handleMoveFilesToFolder = async (fileIds: string[], folderId: string) => {
    const success = await ec.moveFilesToFolder(fileIds, folderId);
    if (success) {
      setSelectedFiles(new Set());
    }
  };

  // 선택 파일 다운로드
  const handleDownloadSelected = () => {
    ec.downloadSelectedFiles(selectedFiles);
  };

  // 파일 업로드 핸들러
  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFilesInput = e.target.files;
    if (!selectedFilesInput) return;
    await ec.uploadFiles(Array.from(selectedFilesInput));
    e.target.value = "";
  };

  // 문서 클릭
  const handleDocumentClick = (doc: { case_id: number }) => {
    navigate(`/cases/${doc.case_id}?tab=documents`);
  };

  // 로딩 화면
  if (fm.isLoadingFiles) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100vh - 120px)" }}
      >
        <video
          src="/assets/loading-card.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-28 w-28"
          style={{ mixBlendMode: "multiply", opacity: 0.3 }}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <FileManagerHeader
        pageMode={pageMode}
        viewMode={viewMode}
        searchQuery={searchQuery}
        isUploading={ec.isUploading}
        onBack={() => navigate(-1)}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onUploadClick={() => fileInputRef.current?.click()}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,audio/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={ec.isUploading}
      />

      {/* Sub toolbar: Breadcrumb + Filter */}
      <div className="flex items-center justify-between py-2">
        <BreadcrumbBar
          pageMode={pageMode}
          folders={fm.folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          caseFolders={fm.caseFolders}
          selectedCaseFolder={selectedCaseFolder}
        />
        <FilterPills
          filterMode={filterMode}
          pageMode={pageMode}
          onFilterChange={setFilterMode}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-0 min-h-0">
        {/* Sidebar */}
        <div className="w-48 shrink-0 pr-3 border-r border-border/40 flex flex-col">
          <div className="mb-3">
            <FileManagerTabs
              pageMode={pageMode}
              onPageModeChange={handlePageModeChange}
            />
          </div>

          {pageMode === "evidence" ? (
            <EvidenceSidebar
              folders={fm.folders}
              files={fm.files}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onToggleExpand={fc.toggleFolderExpanded}
              onAddCategory={fc.addCategory}
              onStartRename={fc.startRenameFolder}
              onRenameSubmit={fc.handleRenameFolder}
              onRenameCancel={fc.cancelRenameFolder}
              renamingFolderId={fc.renamingFolderId}
              renamingFolderName={fc.renamingFolderName}
              setRenamingFolderName={fc.setRenamingFolderName}
              renamingRef={fc.renamingRef}
              onDeleteFolder={fc.deleteFolder}
              onMoveFolder={fc.moveFolder}
              onMoveFilesToFolder={handleMoveFilesToFolder}
              isFolderOperating={fc.isFolderOperating}
              inlineNewFolderParentId={fc.inlineNewFolderParentId}
              inlineNewFolderName={fc.inlineNewFolderName}
              setInlineNewFolderName={fc.setInlineNewFolderName}
              creatingFolderRef={fc.creatingFolderRef}
              onCreateCategory={fc.handleCreateCategory}
              onCancelInlineFolder={fc.cancelInlineFolder}
            />
          ) : (
            <DocumentsSidebar
              caseFolders={fm.caseFolders}
              allDocuments={fm.allDocuments}
              selectedCaseFolder={selectedCaseFolder}
              onSelectCaseFolder={setSelectedCaseFolder}
            />
          )}
        </div>

        {/* File Area */}
        {pageMode === "evidence" ? (
          <EvidenceSubpage
            files={fm.files}
            folders={fm.folders}
            selectedFolder={selectedFolder}
            viewMode={viewMode}
            filterMode={filterMode}
            searchQuery={searchQuery}
            selectedFiles={selectedFiles}
            isUploading={ec.isUploading}
            onUploadFiles={ec.uploadFiles}
            onToggleSelection={toggleFileSelection}
            onSelectAll={selectAllFiles}
            onToggleStar={ec.toggleStar}
            onLinkToCase={openLinkModal}
            onMoveFileToFolder={handleSingleFileMoveToFolder}
            onOpenBulkLink={() => openLinkModal()}
            onDownload={ec.downloadFile}
            onDelete={handleDeleteFile}
            onDeleteSelected={handleBulkDelete}
            onDownloadSelected={handleDownloadSelected}
            onMoveToFolder={handleOpenMoveToFolder}
            onClearSelection={() => setSelectedFiles(new Set())}
          />
        ) : (
          <DocumentsSubpage
            allDocuments={fm.allDocuments}
            caseDocuments={fm.caseDocuments}
            caseFolders={fm.caseFolders}
            selectedCaseFolder={selectedCaseFolder}
            viewMode={viewMode}
            filterMode={filterMode}
            searchQuery={searchQuery}
            isLoadingDocuments={fm.isLoadingDocuments}
            onDocumentClick={handleDocumentClick}
          />
        )}
      </div>

      {/* Dialogs */}
      <LinkToCaseDialog
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        selectedFile={selectedFileForLink}
        filesToLinkCount={filesToLink.length}
        caseFolders={fm.caseFolders}
        onLink={handleLinkToCase}
      />

      <DeleteConfirmDialog
        open={showDeleteConfirmDialog}
        onOpenChange={(open) => {
          setShowDeleteConfirmDialog(open);
          if (!open) setFileToDelete(null);
        }}
        file={fileToDelete}
        isDeleting={ec.isDeleting}
        onConfirm={confirmDeleteFile}
      />

      <BulkDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        totalCount={bulkDeleteProgress.total}
        currentProgress={bulkDeleteProgress.current}
        isDeleting={ec.isDeleting}
        onConfirm={confirmBulkDelete}
      />

      <UploadProgressDialog
        open={ec.isUploading}
        current={ec.uploadProgress.current}
        total={ec.uploadProgress.total}
      />

      <MoveToFolderDialog
        open={showMoveToFolderDialog}
        onOpenChange={(open) => {
          setShowMoveToFolderDialog(open);
          if (!open) setFilesToMove([]);
        }}
        folders={fm.folders}
        fileCount={filesToMove.length}
        onMove={handleMoveToFolder}
      />
    </div>
  );
}
