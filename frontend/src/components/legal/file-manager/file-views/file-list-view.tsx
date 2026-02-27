import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Link2 } from "lucide-react";
import type { ManagedFile } from "../types";
import { formatFileSize, getFileIcon } from "../utils";
import { FileActionMenu } from "./file-action-menu";

interface FileListViewProps {
  files: ManagedFile[];
  selectedFiles: Set<string>;
  onToggleSelection: (fileId: string) => void;
  onSelectAll: () => void;
  onToggleStar: (fileId: string) => void;
  onLinkToCase: (file: ManagedFile) => void;
  onMoveToFolder: (file: ManagedFile) => void;
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string) => void;
}

export function FileListView({
  files,
  selectedFiles,
  onToggleSelection,
  onSelectAll,
  onToggleStar,
  onLinkToCase,
  onMoveToFolder,
  onDownload,
  onDelete,
}: FileListViewProps) {
  const navigate = useNavigate();

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/30 border-b border-border/60">
            <th className="w-10 px-3 py-2">
              <Checkbox
                checked={
                  selectedFiles.size === files.length && files.length > 0
                }
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
              이름
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">
              업로드 날짜
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">
              크기
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-32">
              연결된 사건
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            const isSelected = selectedFiles.has(file.id);
            return (
              <tr
                key={file.id}
                draggable
                onDragStart={(e) => {
                  // 선택된 파일이 있으면 모두, 아니면 이 파일만
                  const ids = selectedFiles.has(file.id) && selectedFiles.size > 0
                    ? Array.from(selectedFiles)
                    : [file.id];
                  e.dataTransfer.setData("application/x-evidence-ids", JSON.stringify(ids));
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`border-b border-border/40 hover:bg-secondary/20 transition-colors ${
                  isSelected ? "bg-secondary/30" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(file.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer"
                    onClick={() => navigate(`/evidence/${file.id}`)}
                  >
                    <div className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center shrink-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium truncate hover:text-primary transition-colors">
                      {file.name}
                    </span>
                    {file.starred && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {file.modifiedAt}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-3 py-2">
                  {file.linkedCases && file.linkedCases.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {file.linkedCases.length}건
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">-</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <FileActionMenu
                    file={file}
                    onToggleStar={onToggleStar}
                    onLinkToCase={onLinkToCase}
                    onMoveToFolder={onMoveToFolder}
                    onDownload={onDownload}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
