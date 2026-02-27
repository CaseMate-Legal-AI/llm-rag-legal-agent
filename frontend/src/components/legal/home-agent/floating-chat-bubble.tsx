import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useChat } from "@/contexts/chat-context";

const NUDGE_MESSAGES = [
  "AI 에이전트의 답변을 확인해주세요.",
  "AI 에이전트가 업무를 완료했습니다.",
  "확인을 기다리고 있습니다.",
];

const STREAMING_MESSAGES = [
  "AI 에이전트가 열심히 작업 중입니다.",
  "잠시만 기다려주세요.",
  "자료를 분석하고 있습니다.",
  "최적의 답변을 준비 중입니다.",
];

/** ✧ 4각 별 아이콘 */
function FourPointStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 홈 이외의 페이지에서 표시되는 플로팅 채팅 버블.
 * 진행 중인 대화가 있을 때만 노출. 클릭 시 홈(채팅)으로 복귀.
 *
 * 효과 분리:
 *   대기 중 → 글로우 호흡 (초록톤) + 파티클
 *   스트리밍 → 프로그레스 링 (노란톤) + 파티클
 */
export function FloatingChatBubble() {
  const navigate = useNavigate();
  const { hasMessages, agent, messages } = useChat();

  const [bubble, setBubble] = useState<{ text: string; visible: boolean }>({
    text: "AI 에이전트가 업무를 수행하고 있습니다",
    visible: false,
  });
  const [entered, setEntered] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudgeIdx = useRef(0);
  const streamingMsgIdx = useRef(0);
  const prevStreaming = useRef(false);
  const hoverHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = useCallback((text: string, duration: number) => {
    if (isHovering) return;
    setBubble({ text, visible: true });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setBubble((prev) => ({ ...prev, visible: false }));
    }, duration);
  }, [isHovering]);

  useEffect(() => {
    if (!hasMessages) return;

    requestAnimationFrame(() => setEntered(true));

    showBubble("AI 에이전트가 업무를 수행하고 있습니다", 8000);

    intervalRef.current = setInterval(() => {
      const msg = NUDGE_MESSAGES[nudgeIdx.current % NUDGE_MESSAGES.length];
      nudgeIdx.current += 1;
      showBubble(msg, 5000);
    }, 120000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMessages]);

  // 스트리밍 시작 5초 후 격려 말풍선 + 완료 시 알림
  useEffect(() => {
    if (agent.isStreaming && !prevStreaming.current) {
      // 스트리밍 시작됨 → 5초 후 말풍선
      streamingTimerRef.current = setTimeout(() => {
        const msg = STREAMING_MESSAGES[streamingMsgIdx.current % STREAMING_MESSAGES.length];
        streamingMsgIdx.current += 1;
        showBubble(msg, 5000);
      }, 5000);
    }
    if (prevStreaming.current && !agent.isStreaming) {
      // 스트리밍 끝남 → 완료 알림
      if (streamingTimerRef.current) clearTimeout(streamingTimerRef.current);
      showBubble("AI 에이전트가 업무를 완료했습니다.", 8000);
    }
    prevStreaming.current = agent.isStreaming;
    return () => {
      if (streamingTimerRef.current) clearTimeout(streamingTimerRef.current);
    };
  }, [agent.isStreaming, showBubble]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (hoverHideRef.current) clearTimeout(hoverHideRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    setBubble({ text: "대화로 돌아가기", visible: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    hoverHideRef.current = setTimeout(() => {
      setBubble((prev) => ({ ...prev, visible: false }));
    }, 300);
  }, []);

  if (!hasMessages) return null;

  const isStreaming = agent.isStreaming;

  return (
    <div
      className={`fixed bottom-6 right-14 z-50 flex items-end gap-4 transition-all duration-500 ${
        entered
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-50 translate-y-4"
      }`}
    >
      {/* ── 말풍선 ── */}
      <div
        className={`relative w-max max-w-[280px] px-3 py-2 rounded-xl bg-primary shadow-lg border border-primary text-sm text-white transition-all duration-300 ${
          bubble.visible
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        }`}
        style={{ marginBottom: 24 }}
      >
        <p className="line-clamp-2 leading-snug">{bubble.text}</p>
        <div className="absolute right-[-6px] bottom-[14px] w-3 h-3 bg-primary border-r border-b border-primary rotate-[-45deg]" />
      </div>

      {/* ── 버튼 영역 ── */}
      <div
        className="relative flex flex-col items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={() => navigate("/")}
          className="relative w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #6D5EF5, #A78BFA)",
            boxShadow:
              "0 4px 14px rgba(109,94,245,0.35)," +
              "0 12px 28px -4px rgba(79,70,229,0.25)",
          }}
        >
          {/* ── 글로우 호흡 (대기 중만) ── */}
          {!isStreaming && (
            <div
              className="absolute inset-[-6px] rounded-full animate-[orb-breathe_4s_ease-in-out_infinite] pointer-events-none"
              style={{ filter: "blur(8px)" }}
            />
          )}

          {/* ── 프로그레스 링 (스트리밍 중만) ── */}
          {isStreaming && (
            <svg
              className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] animate-[progress-spin_1.5s_linear_infinite]"
              viewBox="0 0 72 72"
            >
              <circle cx="36" cy="36" r="34" fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth="2.5" />
              <circle cx="36" cy="36" r="34" fill="none" stroke="url(#ring-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="107 107" />
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C4B5FD" />
                  <stop offset="100%" stopColor="#6D5EF5" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {/* ── 반짝이 파티클 (대기 중만) ── */}
          {!isStreaming && (
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute w-1 h-1 rounded-full bg-white/80 animate-[sparkle-1_3s_ease-in-out_infinite]" style={{ top: "22%", left: "28%" }} />
              <span className="absolute w-[3px] h-[3px] rounded-full bg-white/60 animate-[sparkle-2_4s_ease-in-out_infinite]" style={{ top: "55%", left: "65%" }} />
              <span className="absolute w-1 h-1 rounded-full bg-white/70 animate-[sparkle-3_3.5s_ease-in-out_infinite]" style={{ top: "70%", left: "30%" }} />
              <span className="absolute w-[3px] h-[3px] rounded-full bg-white/50 animate-[sparkle-1_5s_ease-in-out_infinite_1s]" style={{ top: "35%", left: "72%" }} />
            </div>
          )}

          {/* ── ✧ 아이콘 ── */}
          <div className="relative z-10 translate-y-[1px]">
            {isStreaming ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <FourPointStar className="h-7 w-7 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />
            )}
          </div>
        </button>

        {/* ── 상태 도트 (구체 내부 우하단, 고정) ── */}
        <span
          className={`absolute bottom-[14px] right-[1px] z-20 w-3.5 h-3.5 rounded-full border-2 border-white ${
            isStreaming ? "bg-yellow-400" : "bg-emerald-400"
          }`}
        />

        {/* 바닥 그림자 */}
        <div
          className="mt-1"
          style={{
            width: 40,
            height: 8,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(15, 23, 42, 0.18) 0%, rgba(15, 23, 42, 0.06) 50%, transparent 80%)",
          }}
        />
      </div>
    </div>
  );
}
