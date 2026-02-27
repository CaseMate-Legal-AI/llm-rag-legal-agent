import React, { useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  folderName: string;
  isUploading: boolean;
  onDrop: (files: File[]) => void;
  children: React.ReactNode;
}

export function DropZone({
  folderName,
  isUploading,
  onDrop,
  children,
}: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isUploading) return;
      e.preventDefault();
      setDragOver(true);
    },
    [isUploading]
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (isUploading) return;
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onDrop(droppedFiles);
      }
    },
    [isUploading, onDrop]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 overflow-auto transition-colors rounded-lg ${
        dragOver && !isUploading
          ? "bg-secondary/50 border-2 border-dashed border-foreground/30"
          : ""
      } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
    >
      {dragOver ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">파일을 여기에 놓으세요</p>
            <p className="text-xs text-muted-foreground mt-1">
              "{folderName}" 폴더에 업로드됩니다
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
