import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Briefcase } from "lucide-react";
import type { ManagedFile, CaseFolder } from "../types";

interface LinkToCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: ManagedFile | null;
  filesToLinkCount: number;
  caseFolders: CaseFolder[];
  onLink: (caseId: string) => void;
}

export function LinkToCaseDialog({
  open,
  onOpenChange,
  selectedFile,
  filesToLinkCount,
  caseFolders,
  onLink,
}: LinkToCaseDialogProps) {
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");

  const filteredCases = caseFolders.filter(
    (c) =>
      !caseSearchQuery ||
      c.title.toLowerCase().includes(caseSearchQuery.toLowerCase())
  );

  const handleLink = () => {
    if (selectedCaseId) {
      onLink(selectedCaseId);
      setSelectedCaseId("");
      setCaseSearchQuery("");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedCaseId("");
      setCaseSearchQuery("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">사건에 연결</DialogTitle>
          <DialogDescription className="text-sm">
            {selectedFile
              ? `"${selectedFile.name}" 파일을 연결할 사건을 선택하세요`
              : `${filesToLinkCount}개 파일을 연결할 사건을 선택하세요`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="사건명 검색..."
              value={caseSearchQuery}
              onChange={(e) => setCaseSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>

          <ScrollArea className="max-h-56">
            <div className="border border-border/60 rounded-lg">
              {filteredCases.map((caseItem) => {
                const isSelected = selectedCaseId === String(caseItem.id);
                return (
                  <button
                    key={caseItem.id}
                    type="button"
                    onClick={() => setSelectedCaseId(String(caseItem.id))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors border-b border-border/30 last:border-b-0 ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{caseItem.title}</span>
                  </button>
                );
              })}
              {filteredCases.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  {caseSearchQuery
                    ? "검색 결과가 없습니다"
                    : "등록된 사건이 없습니다"}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleLink} disabled={!selectedCaseId}>
            연결하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
