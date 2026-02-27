import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { ManagedFile } from "../types";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: ManagedFile | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  file,
  isDeleting,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base text-destructive">
            증거 파일 삭제
          </DialogTitle>
          <DialogDescription className="text-sm">
            이 작업은 되돌릴 수 없습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm">다음 파일을 삭제하시겠습니까?</p>
          <div className="p-3 bg-muted rounded-md">
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              크기: {(file.size / 1024).toFixed(2)} KB
            </p>
            {file.linkedCases && file.linkedCases.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                연결된 사건: {file.linkedCases.length}건
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            ※ 스토리지에서도 영구적으로 삭제되며, 연결된 사건 매핑도 함께
            삭제됩니다.
          </p>
        </div>

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
