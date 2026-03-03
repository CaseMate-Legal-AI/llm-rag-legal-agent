import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileEdit, ExternalLink, Loader2 } from "lucide-react";

interface NavigationData {
  action: string;
  target: string;
  case_id: number;
  case_title: string;
  document_type: string;
  document_type_code: string;
  url: string;
}

interface NavigationRendererProps {
  data: NavigationData;
}

export function NavigationRenderer({ data }: NavigationRendererProps) {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigate = () => {
    setIsNavigating(true);
    navigate(data.url);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <FileEdit className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold text-foreground">
            {data.document_type} 작성
          </h4>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {data.case_title}
          </p>

          <div className="mt-3">
            {!isNavigating ? (
              <button
                onClick={handleNavigate}
                className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                문서 작성 페이지로 이동
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                이동 중...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
