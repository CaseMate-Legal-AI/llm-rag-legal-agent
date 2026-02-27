import React, { useState } from "react";
import { HardDrive, Plus, Folder } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileFolder, ManagedFile, DropPosition } from "../types";
import { getChildFolders } from "../utils";
import { FolderTreeItem } from "./folder-tree-item";

interface EvidenceSidebarProps {
  folders: FileFolder[];
  files: ManagedFile[];
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  // 폴더 CRUD
  onAddCategory: () => void;
  onStartRename: (folderId: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  renamingFolderId: string | null;
  renamingFolderName: string;
  setRenamingFolderName: (name: string) => void;
  renamingRef: React.RefObject<boolean>;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder: (folderId: string, newParentId: string) => void;
  onMoveFilesToFolder: (fileIds: string[], folderId: string) => void;
  isFolderOperating: (folderId: string) => boolean;
  // 인라인 생성
  inlineNewFolderParentId: string | null;
  inlineNewFolderName: string;
  setInlineNewFolderName: (name: string) => void;
  creatingFolderRef: React.RefObject<boolean>;
  onCreateCategory: () => void;
  onCancelInlineFolder: () => void;
}

export function EvidenceSidebar({
  folders,
  files,
  selectedFolder,
  onSelectFolder,
  onToggleExpand,
  onAddCategory,
  onStartRename,
  onRenameSubmit,
  onRenameCancel,
  renamingFolderId,
  renamingFolderName,
  setRenamingFolderName,
  renamingRef,
  onDeleteFolder,
  onMoveFolder,
  onMoveFilesToFolder,
  isFolderOperating,
  inlineNewFolderParentId,
  inlineNewFolderName,
  setInlineNewFolderName,
  creatingFolderRef,
  onCreateCategory,
  onCancelInlineFolder,
}: EvidenceSidebarProps) {
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const rootChildren = getChildFolders(folders, "root");
  const showInlineInputAtRoot = inlineNewFolderParentId === "root";

  const handleMoveFolderWithPosition = (
    folderId: string,
    targetId: string,
    position: DropPosition
  ) => {
    if (position === "inside") {
      onMoveFolder(folderId, targetId);
    } else {
      const target = folders.find((f) => f.id === targetId);
      const targetParent = target?.parentId || "root";
      onMoveFolder(folderId, targetParent);
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFolderId || e.dataTransfer.types.includes("application/x-evidence-ids")) {
      setDragOverRoot(true);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRoot(false);

    // 파일 드롭 → root로 이동
    const evidenceData = e.dataTransfer.getData("application/x-evidence-ids");
    if (evidenceData) {
      const fileIds = JSON.parse(evidenceData) as string[];
      onMoveFilesToFolder(fileIds, "root");
      return;
    }

    // 폴더 드롭
    if (draggedFolderId) {
      onMoveFolder(draggedFolderId, "root");
      setDraggedFolderId(null);
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div
        className={`space-y-0.5 ${draggedFolderId ? "ring-1 ring-transparent" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedFolderId) setDragOverRoot(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOverRoot(false);
        }}
        onDrop={handleRootDrop}
      >
        {/* 전체 */}
        <div
          onClick={() => onSelectFolder("root")}
          onDragOver={handleRootDragOver}
          onDragLeave={() => setDragOverRoot(false)}
          onDrop={handleRootDrop}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors cursor-default ${
            dragOverRoot
              ? "bg-primary/15 ring-1 ring-primary/40"
              : selectedFolder === "root"
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          }`}
        >
          <HardDrive className="h-3.5 w-3.5 shrink-0" />
          <span>전체</span>
          <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
            {files.length}
          </span>
        </div>

        {/* 폴더 트리 */}
        {rootChildren.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            folders={folders}
            files={files}
            selectedFolder={selectedFolder}
            renamingFolderId={renamingFolderId}
            renamingFolderName={renamingFolderName}
            setRenamingFolderName={setRenamingFolderName}
            renamingRef={renamingRef}
            isOperating={isFolderOperating(folder.id)}
            onSelect={onSelectFolder}
            onToggleExpand={onToggleExpand}
            onStartRename={onStartRename}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
            onDeleteFolder={onDeleteFolder}
            onDragStart={setDraggedFolderId}
            onDragEnd={() => setDraggedFolderId(null)}
            onMoveFolder={handleMoveFolderWithPosition}
            onMoveFilesToFolder={onMoveFilesToFolder}
            draggedFolderId={draggedFolderId}
            inlineNewFolderParentId={inlineNewFolderParentId}
            inlineNewFolderName={inlineNewFolderName}
            setInlineNewFolderName={setInlineNewFolderName}
            creatingFolderRef={creatingFolderRef}
            onCreateCategory={onCreateCategory}
            onCancelInlineFolder={onCancelInlineFolder}
          />
        ))}

        {/* 루트 인라인 생성 */}
        {showInlineInputAtRoot && (
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <span className="w-4" />
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              onFocus={(e) => e.target.select()}
              value={inlineNewFolderName}
              onChange={(e) => setInlineNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreateCategory();
                } else if (e.key === "Escape") {
                  onCancelInlineFolder();
                }
              }}
              onBlur={() => {
                if (creatingFolderRef.current) return;
                if (inlineNewFolderName.trim()) {
                  onCreateCategory();
                } else {
                  onCancelInlineFolder();
                }
              }}
              className="flex-1 text-sm bg-transparent border border-primary/30 rounded px-1.5 h-5 box-border outline-none focus:border-primary min-w-0"
            />
          </div>
        )}

        {/* 폴더 추가 */}
        <button
          type="button"
          onClick={onAddCategory}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 transition-colors mt-1"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>폴더 추가</span>
        </button>
      </div>
    </ScrollArea>
  );
}
