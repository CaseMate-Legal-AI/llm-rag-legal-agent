import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import type { ManagedFile } from "../types";
import { formatFileSize, getFileIcon } from "../utils";
import { FileActionMenu } from "./file-action-menu";

interface FileGridViewProps {
  files: ManagedFile[];
  selectedFiles: Set<string>;
  onToggleSelection: (fileId: string) => void;
  onToggleStar: (fileId: string) => void;
  onLinkToCase: (file: ManagedFile) => void;
  onMoveToFolder: (file: ManagedFile) => void;
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string) => void;
}

export function FileGridView({
  files,
  selectedFiles,
  onToggleSelection,
  onToggleStar,
  onLinkToCase,
  onMoveToFolder,
  onDownload,
  onDelete,
}: FileGridViewProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-5 gap-3">
      {files.map((file) => {
        const FileIcon = getFileIcon(file.type);
        const isSelected = selectedFiles.has(file.id);
        return (
          <div
            key={file.id}
            draggable
            onDragStart={(e) => {
              const ids = selectedFiles.has(file.id) && selectedFiles.size > 0
                ? Array.from(selectedFiles)
                : [file.id];
              e.dataTransfer.setData("application/x-evidence-ids", JSON.stringify(ids));
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => navigate(`/evidence/${file.id}`)}
            className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
              isSelected
                ? "border-foreground/30 bg-secondary/40"
                : "border-border/60 hover:border-border hover:bg-secondary/20"
            }`}
          >
            {/* Selection Checkbox */}
            <div
              className={`absolute top-2 left-2 transition-opacity ${
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(file.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {/* Star */}
            {file.starred && (
              <div className="absolute top-2 right-2">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              </div>
            )}
            {/* Menu */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <FileActionMenu
                file={file}
                onToggleStar={onToggleStar}
                onLinkToCase={onLinkToCase}
                onMoveToFolder={onMoveToFolder}
                onDownload={onDownload}
                onDelete={onDelete}
                size="sm"
              />
            </div>
            {/* File Icon */}
            <div className="w-12 h-12 mx-auto rounded-lg bg-secondary/50 flex items-center justify-center mb-2 mt-4">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            {/* File Name */}
            <p className="text-sm font-medium text-center truncate px-1">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-0.5">
              {formatFileSize(file.size)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
