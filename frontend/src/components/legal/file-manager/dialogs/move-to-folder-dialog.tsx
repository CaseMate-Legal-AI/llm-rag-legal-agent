import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FolderOpen, HardDrive } from "lucide-react";
import type { FileFolder } from "../types";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FileFolder[];
  fileCount: number;
  onMove: (folderId: string) => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  fileCount,
  onMove,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root");

  const handleMove = () => {
    onMove(selectedFolderId);
    setSelectedFolderId("root");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setSelectedFolderId("root");
    onOpenChange(open);
  };

  const renderFolderList = (parentId: string | null, depth: number = 0) => {
    const children = folders.filter((f) => f.parentId === parentId);
    return children.map((folder) => {
      const isSelected = selectedFolderId === folder.id;
      const hasChild = folders.some((f) => f.parentId === folder.id);
      return (
        <div key={folder.id}>
          <button
            type="button"
            onClick={() => setSelectedFolderId(folder.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
              isSelected
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-secondary/50"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {isSelected ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{folder.name}</span>
          </button>
          {hasChild && renderFolderList(folder.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">폴더로 이동</DialogTitle>
          <DialogDescription className="text-sm">
            {fileCount}개 파일을 이동할 폴더를 선택하세요
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64">
          <div className="border border-border/60 rounded-lg overflow-hidden">
            {/* 전체 (root) */}
            <button
              type="button"
              onClick={() => setSelectedFolderId("root")}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors border-b border-border/30 ${
                selectedFolderId === "root"
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-secondary/50"
              }`}
            >
              <HardDrive className="h-4 w-4 shrink-0" />
              <span>전체 (미분류)</span>
            </button>
            {renderFolderList("root")}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleMove}>이동</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
