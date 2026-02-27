import { FileText } from "lucide-react";
import type { DocumentItem } from "../types";
import { getDocumentTypeName } from "../utils";

interface DocumentGridViewProps {
  documents: DocumentItem[];
  onDocumentClick: (doc: DocumentItem) => void;
}

export function DocumentGridView({
  documents,
  onDocumentClick,
}: DocumentGridViewProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => onDocumentClick(doc)}
          className="group relative p-3 rounded-lg border border-border/60 hover:border-border hover:bg-secondary/20 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 mx-auto rounded-lg bg-secondary/50 flex items-center justify-center mb-2 mt-2">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-center truncate px-1">
            {doc.title}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-0.5">
            {getDocumentTypeName(doc.document_type)}
          </p>
        </div>
      ))}
    </div>
  );
}
