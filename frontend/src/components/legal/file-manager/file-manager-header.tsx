import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  List,
  Grid,
  Upload,
  Loader2,
} from "lucide-react";
import type { PageMode, ViewMode } from "./types";

interface FileManagerHeaderProps {
  pageMode: PageMode;
  viewMode: ViewMode;
  searchQuery: string;
  isUploading: boolean;
  onBack: () => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onUploadClick: () => void;
}

export function FileManagerHeader({
  pageMode,
  viewMode,
  searchQuery,
  isUploading,
  onBack,
  onSearchChange,
  onViewModeChange,
  onUploadClick,
}: FileManagerHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-border/60">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">파일 관리</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={
              pageMode === "evidence" ? "파일 검색..." : "문서 검색..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center border border-border/60 rounded-md">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-l-none border-l border-border/60"
            onClick={() => onViewModeChange("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>

        {/* Upload Button (증거 파일 모드에서만) */}
        {pageMode === "evidence" && (
          <Button size="sm" onClick={onUploadClick} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                업로드
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
