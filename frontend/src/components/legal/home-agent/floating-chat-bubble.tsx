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

const ICON_PATH = "M49.6273 9.28499C56.318 -3.17014 73.8234 -3.07492 80.3846 9.45228L86.1607 20.4805L99.2913 19.0642C112.515 17.638 122.4 31.2398 117.273 43.8056L112.432 55.6691L122.812 65.4834C131.91 74.0854 128.521 89.5478 116.706 93.3405L103.142 97.6947L102.416 112.16C101.782 124.802 88.0549 132.03 77.6488 125.2L64.1198 116.322L50.1826 125.401C39.813 132.157 26.1749 125.004 25.4657 112.437L24.6305 97.6376L11.3805 93.4681C-0.668991 89.6764 -3.98463 73.8148 5.49284 65.3021L15.7753 56.0664L10.862 43.3939C6.0127 30.8864 15.846 17.5696 28.9161 18.944L43.6086 20.4892L49.6273 9.28499ZM39.9433 27.3122L28.2011 26.0774C20.359 25.2527 14.459 33.2428 17.3686 40.7473L21.3624 51.0481L25.6923 47.159C30.2815 43.0369 34.1339 38.1268 37.0764 32.6492L39.9433 27.3122ZM24.105 58.1221L30.3081 52.5505C35.5093 47.8788 39.8753 42.314 43.2101 36.106L47.5067 28.1076L58.9663 29.3127C63.059 29.7431 67.1842 29.7376 71.2758 29.2963L82.2154 28.1164L86.5584 36.4087C89.6881 42.3842 93.7694 47.7829 98.6341 52.3823L104.083 57.5343L101.307 64.3381C98.6651 70.8128 97.1347 77.7062 96.7831 84.7144L96.4004 92.3442L87.1069 95.3275C82.1256 96.9266 77.3714 99.19 72.9666 102.06L64.1336 107.814L55.6224 102.229C51.0766 99.2452 46.1555 96.9094 40.9947 95.2855L31.3389 92.247L30.872 83.9739C30.5046 77.4635 29.1195 71.0558 26.7697 64.995L24.105 58.1221ZM18.5179 63.1404L10.1087 70.6936C4.75185 75.5051 6.62589 84.4704 13.4365 86.6135L24.1995 90.0004L23.8827 84.3877C23.5586 78.6433 22.3365 72.9894 20.2631 67.6416L18.5179 63.1404ZM31.7699 99.8842L32.4549 112.023C32.8558 119.126 40.5643 123.169 46.4254 119.351L57.6213 112.057L51.8455 108.266C47.8345 105.634 43.4924 103.573 38.9388 102.14L31.7699 99.8842ZM70.6321 112.079L81.4257 119.163C87.3074 123.023 95.0663 118.937 95.4248 111.792L96.0172 99.9819L89.2006 102.17C84.8054 103.581 80.6105 105.578 76.7239 108.11L70.6321 112.079ZM103.525 90.057L114.612 86.4979C121.29 84.3541 123.206 75.6145 118.064 70.7525L109.559 62.7112L107.766 67.1033C105.435 72.8163 104.085 78.8987 103.775 85.0823L103.525 90.057ZM106.957 50.4923L110.813 41.0405C113.89 33.501 107.958 25.3399 100.024 26.1956L89.7352 27.3054L92.7277 33.0188C95.4892 38.2913 99.0903 43.0548 103.383 47.1132L106.957 50.4923ZM78.6408 21.2915L70.5427 22.165C66.9324 22.5543 63.2925 22.5592 59.6814 22.1794L51.172 21.2846L55.761 12.7418C59.7754 5.26873 70.2787 5.32586 74.2154 12.8422L78.6408 21.2915Z";

function AgentIcon({ className, color, animated }: { className?: string; color?: string; animated?: boolean }) {
  const fillColor = color || "currentColor";

  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      style={animated ? { animation: "agent-spin-cw 30s linear infinite" } : undefined}
    >
      <path fillRule="evenodd" clipRule="evenodd" d={ICON_PATH} fill={fillColor} />
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

          {/* ── ✧ 아이콘 ── */}
          <div className="relative z-10 translate-y-[1px]">
            {isStreaming ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <AgentIcon className="h-7 w-7" color="#fff" animated />
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
