import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
  currentProgress: number;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  totalCount,
  currentProgress,
  isDeleting,
  onConfirm,
}: BulkDeleteDialogProps) {
  const progressPercent =
    totalCount > 0 ? (currentProgress / totalCount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base text-destructive">
            증거 파일 일괄 삭제
          </DialogTitle>
          <DialogDescription className="text-sm">
            이 작업은 되돌릴 수 없습니다
          </DialogDescription>
        </DialogHeader>

        {isDeleting ? (
          <div className="space-y-3">
            <p className="text-sm">
              삭제 중... ({currentProgress} / {totalCount})
            </p>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              스토리지 및 DB에서 영구 삭제하고 있습니다...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              선택한 <strong>{totalCount}개</strong> 파일을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-muted-foreground">
              ※ 스토리지에서도 영구적으로 삭제되며, 연결된 사건 매핑도 함께
              삭제됩니다.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                삭제 중...
              </>
            ) : (
              "삭제"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
