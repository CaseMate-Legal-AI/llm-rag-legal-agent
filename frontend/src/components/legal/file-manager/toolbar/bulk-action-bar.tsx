import { Button } from "@/components/ui/button";
import { Link2, Trash2, Download, FolderInput } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onLinkToCase: () => void;
  onMoveToFolder: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onLinkToCase,
  onMoveToFolder,
  onDelete,
  onDownload,
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 pb-3 border-b border-border/60 mb-3 animate-in slide-in-from-top-2 duration-200">
      <span className="text-sm text-muted-foreground">
        {selectedCount}개 선택됨
      </span>
      <Button variant="outline" size="sm" onClick={onMoveToFolder}>
        <FolderInput className="h-3.5 w-3.5 mr-1.5" />
        폴더로 이동
      </Button>
      <Button variant="outline" size="sm" onClick={onLinkToCase}>
        <Link2 className="h-3.5 w-3.5 mr-1.5" />
        사건에 연결
      </Button>
      <Button variant="outline" size="sm" onClick={onDownload}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        다운로드
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        삭제
      </Button>
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        선택 해제
      </Button>
    </div>
  );
}
