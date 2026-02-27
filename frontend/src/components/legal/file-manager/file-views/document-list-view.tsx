import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DocumentItem, CaseFolder } from "../types";
import { getDocumentTypeName } from "../utils";

interface DocumentListViewProps {
  documents: DocumentItem[];
  caseFolders: CaseFolder[];
  selectedCaseFolder: number | null;
  onDocumentClick: (doc: DocumentItem) => void;
}

export function DocumentListView({
  documents,
  caseFolders,
  selectedCaseFolder,
  onDocumentClick,
}: DocumentListViewProps) {
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/30 border-b border-border/60">
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
              제목
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">
              문서 유형
            </th>
            {selectedCaseFolder === null && (
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-48">
                사건명
              </th>
            )}
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-32">
              수정일
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => onDocumentClick(doc)}
              className="border-b border-border/40 hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium truncate">{doc.title}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <Badge variant="secondary" className="text-xs">
                  {getDocumentTypeName(doc.document_type)}
                </Badge>
              </td>
              {selectedCaseFolder === null && (
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {caseFolders.find((c) => c.id === doc.case_id)?.title || "-"}
                </td>
              )}
              <td className="px-3 py-2 text-muted-foreground">
                {doc.updated_at
                  ? new Date(doc.updated_at).toLocaleDateString("ko-KR")
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
