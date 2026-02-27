import { Clock, Star } from "lucide-react";
import type { FilterMode, PageMode } from "../types";

interface FilterPillsProps {
  filterMode: FilterMode;
  pageMode: PageMode;
  onFilterChange: (mode: FilterMode) => void;
}

export function FilterPills({
  filterMode,
  pageMode,
  onFilterChange,
}: FilterPillsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onFilterChange("all")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          filterMode === "all"
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        전체
      </button>
      <button
        type="button"
        onClick={() => onFilterChange("recent")}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          filterMode === "recent"
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Clock className="h-3 w-3" />
        최근
      </button>
      {pageMode === "evidence" && (
        <button
          type="button"
          onClick={() => onFilterChange("starred")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            filterMode === "starred"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className="h-3 w-3" />
          중요
        </button>
      )}
    </div>
  );
}
