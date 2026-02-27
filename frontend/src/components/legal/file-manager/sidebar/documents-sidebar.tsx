import { FileText, Briefcase } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CaseFolder, DocumentItem } from "../types";

interface DocumentsSidebarProps {
  caseFolders: CaseFolder[];
  allDocuments: DocumentItem[];
  selectedCaseFolder: number | null;
  onSelectCaseFolder: (caseId: number | null) => void;
}

export function DocumentsSidebar({
  caseFolders,
  allDocuments,
  selectedCaseFolder,
  onSelectCaseFolder,
}: DocumentsSidebarProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => onSelectCaseFolder(null)}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
            selectedCaseFolder === null
              ? "bg-secondary text-foreground font-medium"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>전체</span>
          <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
            {allDocuments.length}
          </span>
        </button>

        {caseFolders.map((caseItem) => {
          const isSelected = selectedCaseFolder === caseItem.id;
          const docCount = allDocuments.filter(
            (d) => d.case_id === caseItem.id
          ).length;
          return (
            <button
              key={caseItem.id}
              type="button"
              onClick={() => onSelectCaseFolder(caseItem.id)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                isSelected
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1 text-left">
                {caseItem.title}
              </span>
              {docCount > 0 && (
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {docCount}
                </span>
              )}
            </button>
          );
        })}

        {caseFolders.length === 0 && (
          <p className="px-2 py-3 text-[11px] text-muted-foreground/40 text-center">
            등록된 사건이 없습니다
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
