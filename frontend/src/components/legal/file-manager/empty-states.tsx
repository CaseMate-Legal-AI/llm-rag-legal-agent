import { FolderOpen, FileText, Search } from "lucide-react";

export function EvidenceEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          {hasSearch ? "검색 결과가 없습니다" : "폴더가 비어있습니다"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          파일을 드래그하여 업로드하세요
        </p>
      </div>
    </div>
  );
}

export function DocumentEmptyState({
  hasSearch,
  hasSelectedCase,
}: {
  hasSearch: boolean;
  hasSelectedCase: boolean;
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          {hasSearch
            ? "검색 결과가 없습니다"
            : hasSelectedCase
              ? "이 사건에 작성된 문서가 없습니다"
              : "작성된 문서가 없습니다"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          사건 상세 페이지에서 문서를 작성해보세요
        </p>
      </div>
    </div>
  );
}

export function SearchEmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
      </div>
    </div>
  );
}
