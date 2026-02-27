import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Star, Link2, Download, Trash2, FolderInput } from "lucide-react";
import type { ManagedFile } from "../types";

interface FileActionMenuProps {
  file: ManagedFile;
  onToggleStar: (fileId: string) => void;
  onLinkToCase: (file: ManagedFile) => void;
  onMoveToFolder: (file: ManagedFile) => void;
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string) => void;
  size?: "sm" | "default";
}

export function FileActionMenu({
  file,
  onToggleStar,
  onLinkToCase,
  onMoveToFolder,
  onDownload,
  onDelete,
  size = "default",
}: FileActionMenuProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={btnSize}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className={iconSize} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onToggleStar(file.id)}>
          <Star className="h-4 w-4 mr-2" />
          {file.starred ? "중요 해제" : "중요 표시"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMoveToFolder(file)}>
          <FolderInput className="h-4 w-4 mr-2" />
          폴더로 이동
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onLinkToCase(file)}>
          <Link2 className="h-4 w-4 mr-2" />
          사건에 연결
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload(file.id, file.name)}>
          <Download className="h-4 w-4 mr-2" />
          다운로드
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onDelete(file.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
