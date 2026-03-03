import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, FileText, Scale, ArrowLeftRight, Clock, Users, Loader2, Files } from "lucide-react";
import type { ToolResult } from "@/hooks/useAgentSSE";
import { CaseListRenderer } from "./tool-renderers/case-list-renderer";
import { CaseAnalysisRenderer } from "./tool-renderers/case-analysis-renderer";
import { PrecedentListRenderer } from "./tool-renderers/precedent-list-renderer";
import { ComparisonRenderer } from "./tool-renderers/comparison-renderer";
import { TimelineRenderer } from "./tool-renderers/timeline-renderer";
import { RelationshipRenderer } from "./tool-renderers/relationship-renderer";
import { LawListRenderer } from "./tool-renderers/law-list-renderer";
import { PrecedentSummaryRenderer } from "./tool-renderers/precedent-summary-renderer";
import { RawTextRenderer } from "./tool-renderers/raw-text-renderer";
import { EvidenceListRenderer } from "./tool-renderers/evidence-list-renderer";
import { ToolSkeleton } from "./tool-renderers/tool-skeleton";

interface AgentResultsPanelProps {
  toolResults: ToolResult[];
  isStreaming?: boolean;
  focusTabIndex?: number | null;
  onClose: () => void;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  list_cases: { label: "사건 목록", icon: FileText, color: "#64748B" },
  analyze_case: { label: "사건 분석", icon: Scale, color: "#8B5CF6" },
  generate_timeline: { label: "타임라인", icon: Clock, color: "#D97706" },
  generate_relationship: { label: "관계도", icon: Users, color: "#059669" },
  search_precedents: { label: "판례 검색", icon: Search, color: "#2563EB" },
  summarize_precedent: { label: "판례 요약", icon: FileText, color: "#7C3AED" },
  compare_precedent: { label: "판례 비교", icon: ArrowLeftRight, color: "#DB2777" },
  search_laws: { label: "법령 검색", icon: Search, color: "#0D9488" },
  get_case_evidence: { label: "증거 현황", icon: Files, color: "#6366F1" },
  get_case_similar_precedents: { label: "유사 판례", icon: Scale, color: "#E11D48" },
  rag_search: { label: "관련 자료", icon: Search, color: "#9333EA" },
};

function getToolRenderer(tr: ToolResult) {
  if (tr.status === "loading") {
    return <ToolSkeleton tool={tr.tool} />;
  }

  if (tr.status === "error") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <p className="text-[14px] text-destructive font-medium">{tr.summary || "도구 실행에 실패했습니다"}</p>
        <p className="text-[13px] text-muted-foreground mt-1">다시 질문해 주세요</p>
      </div>
    );
  }

  // 구조화 데이터가 있으면 리치 렌더러 사용
  const structured = tr.structured as { text?: string; data?: unknown } | null;
  const data = structured?.data;

  if (data !== null && data !== undefined) {
    switch (tr.tool) {
      case "list_cases":
        return <CaseListRenderer data={data as Record<string, unknown>[]} />;
      case "analyze_case":
        return <CaseAnalysisRenderer data={data as Record<string, string | string[]>} caseId={tr.input?.case_id as number | undefined} />;
      case "search_precedents":
      case "get_case_similar_precedents":
        return <PrecedentListRenderer data={data as Record<string, unknown>[]} />;
      case "compare_precedent":
        return <ComparisonRenderer data={data as Record<string, string>} />;
      case "generate_timeline":
        return <TimelineRenderer data={data as Record<string, unknown>[]} caseId={tr.input?.case_id as number | undefined} />;
      case "generate_relationship":
        return <RelationshipRenderer data={data as { persons: Record<string, unknown>[]; relationships: Record<string, unknown>[] }} caseId={tr.input?.case_id as number | undefined} />;
      case "search_laws":
        return <LawListRenderer data={data as Record<string, unknown>[]} />;
      case "get_case_evidence":
        return <EvidenceListRenderer data={data as Record<string, unknown>[]} caseId={tr.input?.case_id as number | undefined} />;
      case "summarize_precedent":
        return <PrecedentSummaryRenderer data={data as Record<string, string>} />;
      case "rag_search": {
        const ragData = data as { precedents?: Record<string, unknown>[]; laws?: Record<string, unknown>[] };
        return (
          <div className="space-y-4">
            {ragData.precedents && ragData.precedents.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-muted-foreground mb-2">판례 ({ragData.precedents.length}건)</h4>
                <PrecedentListRenderer data={ragData.precedents} />
              </div>
            )}
            {ragData.laws && ragData.laws.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-muted-foreground mb-2">법령 ({ragData.laws.length}건)</h4>
                <LawListRenderer data={ragData.laws} />
              </div>
            )}
          </div>
        );
      }
    }
  }

  // 폴백: raw text
  return <RawTextRenderer text={structured?.text || tr.result || "결과 없음"} />;
}

export function AgentResultsPanel({ toolResults, isStreaming, focusTabIndex, onClose }: AgentResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const prevFirstIdRef = useRef<string | null>(null);

  // 결과 세트가 바뀌면 (새 질문, 다른 메시지 클릭 등) 첫 번째 탭으로 초기화
  const firstResultId = toolResults[0]?.id || null;
  useEffect(() => {
    if (firstResultId !== prevFirstIdRef.current) {
      prevFirstIdRef.current = firstResultId;
      setActiveTab(0);
    }
  }, [firstResultId]);

  // 외부에서 탭 전환 요청 (법률 인용 클릭)
  useEffect(() => {
    if (focusTabIndex != null && focusTabIndex >= 0 && focusTabIndex < toolResults.length) {
      setActiveTab(focusTabIndex);
    }
  }, [focusTabIndex, toolResults.length]);

  // 스트리밍 중 새 결과가 추가되면 최신 탭으로 자동 전환
  useEffect(() => {
    if (isStreaming && toolResults.length > 1) {
      setActiveTab(toolResults.length - 1);
    }
  }, [toolResults.length, isStreaming]);

  if (toolResults.length === 0) return null;

  const currentTab = Math.min(activeTab, toolResults.length - 1);
  const activeTr = toolResults[currentTab];

  return (
    <div className="h-full flex flex-col bg-background border-l border-border/50">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <h3 className="text-[15px] font-semibold text-foreground">도구 실행 결과</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tab Strip */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30 overflow-x-auto">
        {toolResults.map((tr, idx) => {
          const meta = TOOL_META[tr.tool] || { label: tr.tool, icon: FileText, color: "#6B7280" };
          const Icon = meta.icon;
          const isActive = idx === currentTab;

          // 도구별 탭 라벨 결정
          let tabLabel = meta.label;
          if (tr.tool === "summarize_precedent" && tr.structured) {
            const data = (tr.structured as { data?: { case_number?: string } }).data;
            if (data?.case_number) {
              tabLabel = data.case_number;
            }
          } else if (tr.tool === "compare_precedent" && tr.input?.target_case_number) {
            tabLabel = tr.input.target_case_number as string;
          }

          return (
            <button
              key={tr.id}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
              style={isActive ? { backgroundColor: meta.color } : undefined}
            >
              {tr.status === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" style={{ color: isActive ? "#fff" : meta.color }} />
              )}
              {tabLabel}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 py-3">
        {activeTr && getToolRenderer(activeTr)}
      </ScrollArea>
    </div>
  );
}
