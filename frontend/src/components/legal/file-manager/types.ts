export interface ManagedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  folder: string;
  uploadedAt: string;
  modifiedAt: string;
  linkedCases?: string[];
  starred?: boolean;
}

export interface FileFolder {
  id: string;
  name: string;
  parentId: string | null;
  expanded?: boolean;
}

export interface DocumentItem {
  id: number;
  case_id: number;
  title: string;
  document_type: string;
  updated_at: string | null;
}

export interface CaseFolder {
  id: number;
  title: string;
}

export type PageMode = "evidence" | "documents";
export type FilterMode = "all" | "recent" | "starred";
export type ViewMode = "grid" | "list";
export type DropPosition = "before" | "inside" | "after";
