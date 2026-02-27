import { Loader2 } from "lucide-react";
import type { ManagedFile, FileFolder, ViewMode, FilterMode } from "./types";
import { getFilesInFolder } from "./utils";
import { DropZone } from "./drop-zone";
import { EvidenceEmptyState } from "./empty-states";
import { BulkActionBar } from "./toolbar/bulk-action-bar";
import { FileListView } from "./file-views/file-list-view";
import { FileGridView } from "./file-views/file-grid-view";

interface EvidenceSubpageProps {
  files: ManagedFile[];
  folders: FileFolder[];
  selectedFolder: string;
  viewMode: ViewMode;
  filterMode: FilterMode;
  searchQuery: string;
  selectedFiles: Set<string>;
  isUploading: boolean;
  onUploadFiles: (files: File[]) => void;
  onToggleSelection: (fileId: string) => void;
  onSelectAll: () => void;
  onToggleStar: (fileId: string) => void;
  onLinkToCase: (file: ManagedFile) => void;
  onMoveFileToFolder: (file: ManagedFile) => void;
  onOpenBulkLink: () => void;
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string) => void;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  onMoveToFolder: () => void;
  onClearSelection: () => void;
}

export function EvidenceSubpage({
  files,
  folders,
  selectedFolder,
  viewMode,
  filterMode,
  searchQuery,
  selectedFiles,
  isUploading,
  onUploadFiles,
  onToggleSelection,
  onSelectAll,
  onToggleStar,
  onLinkToCase,
  onMoveFileToFolder,
  onOpenBulkLink,
  onDownload,
  onDelete,
  onDeleteSelected,
  onDownloadSelected,
  onMoveToFolder,
  onClearSelection,
}: EvidenceSubpageProps) {
  // 파일 필터링
  const filteredFiles = (() => {
    let result: ManagedFile[];
    if (selectedFolder === "uncategorized") {
      result = files.filter((f) => f.folder === "root");
    } else if (selectedFolder !== "root") {
      result = getFilesInFolder(files, folders, selectedFolder);
    } else {
      result = files;
    }

    if (filterMode === "starred") {
      result = result.filter((f) => f.starred);
    } else if (filterMode === "recent") {
      result = [...result]
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
        .slice(0, 20);
    }

    if (searchQuery) {
      result = result.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  })();

  const folderName =
    folders.find((f) => f.id === selectedFolder)?.name || "전체";

  return (
    <div className="flex-1 pl-4 flex flex-col min-h-0">
      <BulkActionBar
        selectedCount={selectedFiles.size}
        onLinkToCase={onOpenBulkLink}
        onMoveToFolder={onMoveToFolder}
        onDelete={onDeleteSelected}
        onDownload={onDownloadSelected}
        onClearSelection={onClearSelection}
      />

      <DropZone
        folderName={folderName}
        isUploading={isUploading}
        onDrop={onUploadFiles}
      >
        {filteredFiles.length === 0 ? (
          <EvidenceEmptyState hasSearch={!!searchQuery} />
        ) : viewMode === "list" ? (
          <FileListView
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onToggleSelection={onToggleSelection}
            onSelectAll={onSelectAll}
            onToggleStar={onToggleStar}
            onLinkToCase={onLinkToCase}
            onMoveToFolder={onMoveFileToFolder}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        ) : (
          <FileGridView
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onToggleSelection={onToggleSelection}
            onToggleStar={onToggleStar}
            onLinkToCase={onLinkToCase}
            onMoveToFolder={onMoveFileToFolder}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        )}
      </DropZone>
    </div>
  );
}
