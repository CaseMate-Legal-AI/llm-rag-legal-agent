import React from "react";
import { ChevronRight } from "lucide-react";
import type { FileFolder, CaseFolder } from "../types";
import { getFolderPath } from "../utils";

interface BreadcrumbBarProps {
  pageMode: "evidence" | "documents";
  // 증거 모드
  folders: FileFolder[];
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
  // 문서 모드
  caseFolders: CaseFolder[];
  selectedCaseFolder: number | null;
}

export function BreadcrumbBar({
  pageMode,
  folders,
  selectedFolder,
  onSelectFolder,
  caseFolders,
  selectedCaseFolder,
}: BreadcrumbBarProps) {
  if (pageMode === "evidence" && selectedFolder === "uncategorized") {
    return (
      <nav className="flex items-center gap-1 text-sm">
        <span className="px-1.5 py-0.5 text-xs text-foreground font-medium">
          미분류
        </span>
      </nav>
    );
  }

  if (pageMode === "evidence" && selectedFolder !== "root") {
    const currentFolderPath = getFolderPath(folders, selectedFolder);
    const pathWithoutRoot = currentFolderPath.slice(1);

    return (
      <nav className="flex items-center gap-1 text-sm">
        {pathWithoutRoot.map((folder, idx) => (
          <React.Fragment key={folder.id}>
            {idx > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            )}
            <button
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`px-1.5 py-0.5 rounded text-xs hover:bg-secondary transition-colors ${
                idx === pathWithoutRoot.length - 1
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </nav>
    );
  }

  if (pageMode === "documents" && selectedCaseFolder !== null) {
    const caseTitle =
      caseFolders.find((c) => c.id === selectedCaseFolder)?.title;
    return (
      <nav className="flex items-center gap-1 text-sm">
        <span className="px-1.5 py-0.5 text-xs text-foreground font-medium">
          {caseTitle}
        </span>
      </nav>
    );
  }

  return <nav className="flex items-center gap-1 text-sm" />;
}
