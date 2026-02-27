import {
  ImageIcon,
  Music,
  Video,
  FileText,
  File,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ManagedFile, FileFolder } from "./types";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function getFileIcon(type: string): LucideIcon {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("audio/")) return Music;
  if (type.startsWith("video/")) return Video;
  if (type.includes("pdf")) return FileText;
  return File;
}

export function getChildFolders(
  folders: FileFolder[],
  parentId: string | null
): FileFolder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export function hasChildren(folders: FileFolder[], folderId: string): boolean {
  return folders.some((f) => f.parentId === folderId);
}

export function getFolderPath(
  folders: FileFolder[],
  folderId: string
): FileFolder[] {
  const path: FileFolder[] = [];
  let current = folders.find((f) => f.id === folderId);
  while (current) {
    path.unshift(current);
    current = current.parentId
      ? folders.find((f) => f.id === current?.parentId)
      : undefined;
  }
  return path;
}

export function getFilesInFolder(
  files: ManagedFile[],
  folders: FileFolder[],
  folderId: string
): ManagedFile[] {
  const childFolderIds = new Set<string>();
  const collectChildFolders = (parentId: string) => {
    childFolderIds.add(parentId);
    folders
      .filter((f) => f.parentId === parentId)
      .forEach((f) => collectChildFolders(f.id));
  };
  collectChildFolders(folderId);
  return files.filter((f) => childFolderIds.has(f.folder));
}

export function isDescendantOf(
  folders: FileFolder[],
  parentId: string,
  targetId: string
): boolean {
  const children = folders.filter((f) => f.parentId === parentId);
  return children.some(
    (c) => c.id === targetId || isDescendantOf(folders, c.id, targetId)
  );
}

export function getNextFolderName(
  folders: FileFolder[],
  parentId: string
): string {
  const baseName = "새 폴더";
  const siblings = folders.filter((f) => f.parentId === parentId);
  const existingNames = new Set(siblings.map((f) => f.name));
  if (!existingNames.has(baseName)) return baseName;
  let i = 1;
  while (existingNames.has(`${baseName}(${i})`)) i++;
  return `${baseName}(${i})`;
}

export function getDocumentTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    criminal_complaint: "고소장",
    demand_letter: "내용증명",
    civil_complaint: "소장",
  };
  return typeMap[type] || type;
}
