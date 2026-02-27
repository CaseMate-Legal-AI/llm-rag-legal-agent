import { Loader2 } from "lucide-react";
import type { DocumentItem, CaseFolder, ViewMode, FilterMode } from "./types";
import { DocumentEmptyState } from "./empty-states";
import { DocumentListView } from "./file-views/document-list-view";
import { DocumentGridView } from "./file-views/document-grid-view";

interface DocumentsSubpageProps {
  allDocuments: DocumentItem[];
  caseDocuments: DocumentItem[];
  caseFolders: CaseFolder[];
  selectedCaseFolder: number | null;
  viewMode: ViewMode;
  filterMode: FilterMode;
  searchQuery: string;
  isLoadingDocuments: boolean;
  onDocumentClick: (doc: DocumentItem) => void;
}

export function DocumentsSubpage({
  allDocuments,
  caseDocuments,
  caseFolders,
  selectedCaseFolder,
  viewMode,
  filterMode,
  searchQuery,
  isLoadingDocuments,
  onDocumentClick,
}: DocumentsSubpageProps) {
  // 문서 필터링
  const filteredDocuments = (() => {
    let docs = selectedCaseFolder !== null ? caseDocuments : allDocuments;

    if (filterMode === "recent") {
      docs = [...docs]
        .sort((a, b) =>
          (b.updated_at || "").localeCompare(a.updated_at || "")
        )
        .slice(0, 20);
    }

    if (searchQuery) {
      docs = docs.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return docs;
  })();

  return (
    <div className="flex-1 pl-4 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto">
        {isLoadingDocuments ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <DocumentEmptyState
            hasSearch={!!searchQuery}
            hasSelectedCase={selectedCaseFolder !== null}
          />
        ) : viewMode === "list" ? (
          <DocumentListView
            documents={filteredDocuments}
            caseFolders={caseFolders}
            selectedCaseFolder={selectedCaseFolder}
            onDocumentClick={onDocumentClick}
          />
        ) : (
          <DocumentGridView
            documents={filteredDocuments}
            onDocumentClick={onDocumentClick}
          />
        )}
      </div>
    </div>
  );
}
