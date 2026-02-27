import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface UploadProgressDialogProps {
  open: boolean;
  current: number;
  total: number;
}

export function UploadProgressDialog({
  open,
  current,
  total,
}: UploadProgressDialogProps) {
  const progressPercent = total > 0 ? (current / total) * 100 : 0;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            파일 업로드 중
          </DialogTitle>
          <DialogDescription className="text-sm">
            파일을 업로드하는 중입니다. 잠시만 기다려 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">진행률</span>
            <span className="font-medium">
              {current} / {total}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            {current === total && total > 0
              ? "업로드 완료 중..."
              : "파일을 업로드하고 있습니다..."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
