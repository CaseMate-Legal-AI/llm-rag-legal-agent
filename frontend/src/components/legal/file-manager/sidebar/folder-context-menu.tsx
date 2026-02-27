import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FolderContextMenuProps {
  onRename: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function FolderContextMenu({
  onRename,
  onDelete,
  children,
}: FolderContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRename}>이름 변경</ContextMenuItem>
        <ContextMenuItem className="text-destructive" onClick={onDelete}>
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
