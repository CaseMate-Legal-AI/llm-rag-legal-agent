import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HardDrive, FileText } from "lucide-react";
import type { PageMode } from "./types";

interface FileManagerTabsProps {
  pageMode: PageMode;
  onPageModeChange: (mode: PageMode) => void;
}

export function FileManagerTabs({
  pageMode,
  onPageModeChange,
}: FileManagerTabsProps) {
  return (
    <Tabs
      value={pageMode}
      onValueChange={(v) => onPageModeChange(v as PageMode)}
      className="w-full"
    >
      <TabsList className="w-full grid grid-cols-2 h-9">
        <TabsTrigger value="evidence" className="text-xs gap-1.5">
          <HardDrive className="h-3.5 w-3.5" />
          증거 파일
        </TabsTrigger>
        <TabsTrigger value="documents" className="text-xs gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          문서 관리
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
