import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { FileFolder, ManagedFile, DropPosition } from "../types";
import { hasChildren as checkHasChildren } from "../utils";

interface FolderTreeItemProps {
  folder: FileFolder;
  folders: FileFolder[];
  files: ManagedFile[];
  selectedFolder: string;
  renamingFolderId: string | null;
  renamingFolderName: string;
  setRenamingFolderName: (name: string) => void;
  renamingRef: React.RefObject<boolean>;
  isOperating: boolean;
  onSelect: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  onStartRename: (folderId: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDeleteFolder: (folderId: string) => void;
  onDragStart: (folderId: string) => void;
  onDragEnd: () => void;
  onMoveFolder: (folderId: string, targetId: string, position: DropPosition) => void;
  onMoveFilesToFolder?: (fileIds: string[], folderId: string) => void;
  draggedFolderId: string | null;
  // 인라인 생성
  inlineNewFolderParentId: string | null;
  inlineNewFolderName: string;
  setInlineNewFolderName: (name: string) => void;
  creatingFolderRef: React.RefObject<boolean>;
  onCreateCategory: () => void;
  onCancelInlineFolder: () => void;
  depth?: number;
}

export function FolderTreeItem({
  folder,
  folders,
  files,
  selectedFolder,
  renamingFolderId,
  renamingFolderName,
  setRenamingFolderName,
  renamingRef,
  isOperating,
  onSelect,
  onToggleExpand,
  onStartRename,
  onRenameSubmit,
  onRenameCancel,
  onDeleteFolder,
  onDragStart,
  onDragEnd,
  onMoveFolder,
  onMoveFilesToFolder,
  draggedFolderId,
  inlineNewFolderParentId,
  inlineNewFolderName,
  setInlineNewFolderName,
  creatingFolderRef,
  onCreateCategory,
  onCancelInlineFolder,
  depth = 0,
}: FolderTreeItemProps) {
  const [dragOverThis, setDragOverThis] = useState(false);
  const [dropPos, setDropPos] = useState<DropPosition | null>(null);

  const isExpanded = folder.expanded;
  const hasChildFolders = checkHasChildren(folders, folder.id);
  const isSelected = selectedFolder === folder.id;
  const fileCount = files.filter((f) => f.folder === folder.id).length;
  const isRenaming = renamingFolderId === folder.id;
  const needsSubtree =
    (isExpanded && hasChildFolders) ||
    inlineNewFolderParentId === folder.id;

  const childFolders = folders.filter((f) => f.parentId === folder.id);
  const showInlineInput = inlineNewFolderParentId === folder.id;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 파일 드래그 (외부 또는 내부 파일 리스트에서)
    const hasFiles = e.dataTransfer.types.includes("application/x-evidence-ids");
    if (hasFiles) {
      setDragOverThis(true);
      setDropPos("inside");
      return;
    }

    // 폴더 드래그
    if (!draggedFolderId || draggedFolderId === folder.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    let pos: DropPosition;
    if (y < h * 0.25) pos = "before";
    else if (y > h * 0.75) pos = "after";
    else pos = "inside";
    setDragOverThis(true);
    setDropPos(pos);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 파일 드롭
    const evidenceData = e.dataTransfer.getData("application/x-evidence-ids");
    if (evidenceData && onMoveFilesToFolder) {
      const fileIds = JSON.parse(evidenceData) as string[];
      onMoveFilesToFolder(fileIds, folder.id);
      setDragOverThis(false);
      setDropPos(null);
      return;
    }

    // 폴더 드롭
    const pos = dropPos;
    setDragOverThis(false);
    setDropPos(null);
    if (draggedFolderId && draggedFolderId !== folder.id && pos) {
      onMoveFolder(draggedFolderId, folder.id, pos);
    }
    onDragEnd();
  };

  const folderRow = (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(folder.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        e.stopPropagation();
        setDragOverThis(false);
        setDropPos(null);
      }}
      onDrop={handleDrop}
      onDragEnd={() => {
        onDragEnd();
        setDragOverThis(false);
        setDropPos(null);
      }}
      onClick={() => onSelect(folder.id)}
      onDoubleClick={() => onStartRename(folder.id)}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors group cursor-default ${
        dragOverThis && dropPos === "inside"
          ? "bg-primary/15 ring-1 ring-primary/40"
          : isSelected
            ? "bg-secondary text-foreground font-medium"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      }`}
    >
      {hasChildFolders ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
          className="p-0.5 hover:bg-secondary rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}
      {isOperating ? (
        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
      ) : isSelected || isExpanded ? (
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      {isRenaming ? (
        <input
          autoFocus
          onFocus={(e) => e.target.select()}
          value={renamingFolderName}
          onChange={(e) => setRenamingFolderName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              onRenameSubmit();
            } else if (e.key === "Escape") {
              onRenameCancel();
            }
          }}
          onBlur={() => {
            if (renamingRef.current) return;
            if (renamingFolderName.trim()) {
              onRenameSubmit();
            } else {
              onRenameCancel();
            }
          }}
          className="flex-1 text-sm bg-transparent border border-primary/30 rounded px-1.5 h-5 box-border outline-none focus:border-primary min-w-0"
        />
      ) : (
        <>
          <span className="truncate flex-1 text-left h-5 leading-5">{folder.name}</span>
          {fileCount > 0 && (
            <span className="text-xs text-muted-foreground/70">{fileCount}</span>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* 상단 기준선 */}
      {dragOverThis && dropPos === "before" && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-full z-10" />
      )}

      {/* Radix ContextMenu로 감싸기 */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {folderRow}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onStartRename(folder.id)}>
            <Pencil className="h-4 w-4 mr-2" />
            이름 변경
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteFolder(folder.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 하단 기준선 */}
      {dragOverThis && dropPos === "after" && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full z-10" />
      )}

      {/* 하위 폴더 */}
      {needsSubtree && (
        <div className="ml-4">
          {childFolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              folders={folders}
              files={files}
              selectedFolder={selectedFolder}
              renamingFolderId={renamingFolderId}
              renamingFolderName={renamingFolderName}
              setRenamingFolderName={setRenamingFolderName}
              renamingRef={renamingRef}
              isOperating={false}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onStartRename={onStartRename}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
              onDeleteFolder={onDeleteFolder}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMoveFolder={onMoveFolder}
              onMoveFilesToFolder={onMoveFilesToFolder}
              draggedFolderId={draggedFolderId}
              inlineNewFolderParentId={inlineNewFolderParentId}
              inlineNewFolderName={inlineNewFolderName}
              setInlineNewFolderName={setInlineNewFolderName}
              creatingFolderRef={creatingFolderRef}
              onCreateCategory={onCreateCategory}
              onCancelInlineFolder={onCancelInlineFolder}
              depth={depth + 1}
            />
          ))}
          {showInlineInput && (
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
        </div>
      )}
    </div>
  );
}
