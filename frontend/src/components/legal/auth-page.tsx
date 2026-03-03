import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, Loader2, FileText, Search, MessageSquare, AlertCircle, Eye, EyeOff, X, ArrowLeft } from "lucide-react";

interface AuthPageProps {
  onLogin: () => void | Promise<void>;
  exiting?: boolean;
}

const features = [
  { icon: FileText, text: "AI 사건 분석 · 핵심 쟁점 추출" },
  { icon: Search, text: "판례 검색 · 유사 판례 비교 분석" },
  { icon: MessageSquare, text: "AI 어시스턴트 · 법률 업무 자동화" },
];

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function AuthPage({ onLogin, exiting = false }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [firmCode, setFirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState<"login" | "signup" | "demo" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // 1-A: 비밀번호 보기/숨기기
  const [showPassword, setShowPassword] = useState(false);

  // 1-B: 필드별 blur 검증 에러
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 1-C: 모드 전환 시 autofocus
  const emailRef = useRef<HTMLInputElement>(null);

  // 1-E: 관리자 코드 모달
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminCodeError, setAdminCodeError] = useState("");
  const adminCodeRef = useRef<HTMLInputElement>(null);

  // 1-C: 모드 전환 시 이메일 필드에 autofocus
  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  // 관리자 코드 모달 열릴 때 autofocus
  useEffect(() => {
    if (showAdminModal) {
      setTimeout(() => adminCodeRef.current?.focus(), 100);
    }
  }, [showAdminModal]);

  // 1-B: 필드별 blur 검증
  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors };
    switch (field) {
      case "email":
        if (value && !EMAIL_RE.test(value)) {
          errors.email = "올바른 이메일 형식이 아닙니다";
        } else {
          delete errors.email;
        }
        break;
      case "password":
        if (value) {
          if (value.length < 8) {
            errors.password = "8자 이상 입력해주세요";
          } else if (!/[a-zA-Z]/.test(value)) {
            errors.password = "영문자를 1자 이상 포함해주세요";
          } else if (!/\d/.test(value)) {
            errors.password = "숫자를 1자 이상 포함해주세요";
          } else {
            delete errors.password;
          }
        } else {
          delete errors.password;
        }
        break;
      case "firmCode":
        if (value && isNaN(Number(value))) {
          errors.firmCode = "숫자만 입력 가능합니다";
        } else {
          delete errors.firmCode;
        }
        break;
    }
    setFieldErrors(errors);
  };

  // 로그인 처리 (일반 + 데모 공용)
  const handleLoginSuccess = async (data: { access_token: string }) => {
    localStorage.setItem("access_token", data.access_token);

    const userResponse = await apiFetch("/api/v1/me");
    if (userResponse.ok) {
      const userData = await userResponse.json();
      localStorage.setItem("user_email", userData.email);
      localStorage.setItem("user_id", userData.id);
      await onLogin();
    } else {
      throw new Error("사용자 정보를 가져오는데 실패했습니다");
    }
  };

  // 1-D: 데모 체험 로그인
  const handleDemoLogin = async () => {
    setErrorMessage("");
    setIsLoading(true);
    setLoadingTarget("demo");
    try {
      const response = await apiFetch("/api/v1/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        skipAuth: true,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "데모 로그인에 실패했습니다");
      }
      await handleLoginSuccess(data);
    } catch (error) {
      console.error("데모 로그인 실패:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "데모 로그인 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
      setLoadingTarget(null);
    }
  };

  // 회원가입 실제 전송 (관리자 코드 포함)
  const submitSignup = async (code: string) => {
    const firmCodeNum = parseInt(firmCode, 10);
    if (isNaN(firmCodeNum)) {
      setAdminCodeError("회사 코드가 올바르지 않습니다.");
      return;
    }

    setIsLoading(true);
    setLoadingTarget("signup");
    setAdminCodeError("");

    try {
      const response = await apiFetch("/api/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          firm_code: firmCodeNum,
          admin_code: code,
        }),
        skipAuth: true,
      });
      const data = await response.json();

      if (!response.ok) {
        let errorMsg = "회원가입에 실패했습니다";
        if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map((e: { msg: string }) => e.msg).join(", ");
        } else if (typeof data.detail === "string") {
          errorMsg = data.detail;
        }
        // 관리자 코드 에러는 모달 안에서 표시
        if (response.status === 403) {
          setAdminCodeError(errorMsg);
          setIsLoading(false);
          return;
        }
        throw new Error(errorMsg);
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", data.email);
      localStorage.setItem("user_id", data.user_id);
      setShowAdminModal(false);
      await onLogin();
    } catch (error) {
      console.error("회원가입 실패:", error);
      setShowAdminModal(false);
      setErrorMessage(
        error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
      setLoadingTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (mode === "login") {
      setIsLoading(true);
      setLoadingTarget("login");
      try {
        const response = await apiFetch("/api/v1/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "로그인에 실패했습니다");
        }

        await handleLoginSuccess(data);
      } catch (error) {
        console.error("로그인 실패:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
        setLoadingTarget(null);
      }
    } else {
      // 회원가입: 관리자 코드 모달 열기
      if (!firmCode.trim()) {
        setErrorMessage("회사 코드를 입력해주세요.");
        return;
      }
      setAdminCode("");
      setAdminCodeError("");
      setShowAdminModal(true);
    }
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden bg-background"
      style={{
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.6, 1), transform 0.5s cubic-bezier(0.4, 0, 0.6, 1)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-24px)' : 'translateY(0)',
      }}
    >
      {/* ═══ Left — Brand Visual ═══ */}
      <div
        className="hidden lg:flex relative overflow-hidden flex-col lg:w-[60%]"
        style={{
          background:
            "linear-gradient(160deg, #6D5EF5 0%, #8B7AF7 40%, #A78BFA 75%, #C4B5FD 100%)",
        }}
      >
        {/* Content */}
        <div className="relative z-[30] flex flex-col justify-center items-start h-full pl-24 pr-16 -mt-[46px]">
          {/* Tagline & Features */}
          <div className="space-y-[72px] w-full">
            <div>
              <Scale className="h-11 w-11 text-white mb-[33px]" strokeWidth={1.8} />
              <h2 className="text-white text-[52px] font-bold tracking-normal leading-[1.1]">
                CaseMate AI
              </h2>
              <p className="text-white/70 mt-6 text-[21.5px] tracking-wide">
                사건 분석부터 판례 리서치까지, AI 어시스턴트가 함께합니다.
              </p>
            </div>

            <div className="w-full flex items-center justify-between">
              <div className="space-y-4 shrink-0">
                {features.map((item) => (
                  <div key={item.text} className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-white/10">
                      <item.icon className="h-5 w-5 text-white/85" />
                    </div>
                    <span className="text-white/85 text-[17px]">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* 프로젝트 소개 영상 */}
              <div className="rounded-xl overflow-hidden shadow-lg border border-white/15 ml-auto mr-8" style={{ aspectRatio: "16/9", width: "clamp(200px, 40vw, 540px)" }}>
                <iframe
                  src="https://www.youtube.com/embed/159coWa2CKA?rel=0&loop=1&playlist=159coWa2CKA"
                  title="CaseMate AI 소개"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ transform: "scale(1.02)", transformOrigin: "center" }}
                />
              </div>
            </div>
          </div>

          {/* Copyright — pinned to bottom */}
          <p className="absolute bottom-6 left-24 text-white text-sm">
            &copy; 2026 Casemate. All rights reserved.
          </p>
        </div>

      </div>

      {/* ═══ Right — Login / Signup Form ═══ */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 lg:p-12 bg-background relative overflow-hidden">
        <div className="relative z-[30] w-full max-w-[380px]">
          {/* 회원가입 모드: 뒤로가기 */}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => { setMode("login"); setErrorMessage(""); setFieldErrors({}); }}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-16 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              로그인으로 돌아가기
            </button>
          )}

          {/* Inline Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  이름
                </Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                이메일
              </Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={mode === "signup" ? () => validateField("email", email) : undefined}
                disabled={isLoading}
                className={`h-11 ${fieldErrors.email ? "border-destructive" : ""}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* 비밀번호 + Eye 토글 */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={mode === "signup" ? () => validateField("password", password) : undefined}
                  disabled={isLoading}
                  className={`h-11 pr-10 ${fieldErrors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-sm font-medium">
                    직업
                  </Label>
                  <Select
                    value={role}
                    onValueChange={setRole}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="직업을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lawyer">변호사</SelectItem>
                      <SelectItem value="legal-officer">법무사</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firm-code" className="text-sm font-medium">
                    회사 코드 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firm-code"
                    placeholder="회사 코드를 입력하세요"
                    value={firmCode}
                    onChange={(e) => setFirmCode(e.target.value)}
                    onBlur={() => validateField("firmCode", firmCode)}
                    disabled={isLoading}
                    className={`h-11 ${fieldErrors.firmCode ? "border-destructive" : ""}`}
                    required
                  />
                  {fieldErrors.firmCode && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.firmCode}</p>
                  )}
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-1 flex items-center justify-center font-semibold rounded-lg text-[15px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-[#6D5EF5] border-2 border-[#7C6EF6]/30 bg-white/50 backdrop-blur-sm shadow-sm hover:bg-[#7C6EF6] hover:text-white hover:border-[#7C6EF6]"
            >
              {loadingTarget === "login" || loadingTarget === "signup" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "로그인 중..." : "가입 중..."}
                </>
              ) : mode === "login" ? (
                "로그인"
              ) : (
                "시작하기"
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="mt-6 text-center">
            {mode === "login" ? (
              <p className="text-sm text-muted-foreground">
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrorMessage(""); setFieldErrors({}); }}
                  disabled={isLoading}
                  className="text-primary font-semibold hover:underline underline-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  회원가입
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                이미 계정이 있으신가요?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setErrorMessage(""); setFieldErrors({}); }}
                  disabled={isLoading}
                  className="text-primary font-semibold hover:underline underline-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  로그인
                </button>
              </p>
            )}
          </div>

          {/* 데모 버튼 (로그인 모드에서만) */}
          {mode === "login" && (
            <div className="mt-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground/60">또는</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="relative group">
                <div className="absolute -inset-[2px] rounded-[10px] opacity-0 bg-gradient-to-r from-[#6D5EF5] via-[#A78BFA] to-[#E879F9]" style={{ animation: 'demo-glow 20s ease-in-out infinite' }} />
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="relative w-full h-11 flex items-center justify-center font-semibold rounded-lg text-[15px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-[#6D5EF5] border-2 border-[#7C6EF6]/30 bg-white/50 backdrop-blur-sm shadow-sm hover:bg-[#7C6EF6] hover:text-white hover:border-[#7C6EF6]"
                >
                  {loadingTarget === "demo" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingTarget === "demo" ? "로그인 중..." : "게스트 로그인"}
                </button>
                {/* Tooltip — bottom */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 w-fit p-4 rounded-xl bg-white border border-[#7C6EF6]/30 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-white" />
                  <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-nowrap mb-2.5">
                    게스트 계정으로 체험할 수 있는 기능:
                  </p>
                  <ul className="text-[13px] text-muted-foreground/70 space-y-1 whitespace-nowrap">
                    <li>· AI 홈 채팅 에이전트</li>
                    <li>· 사건 분석 결과 조회</li>
                    <li>· 판례 검색 · 유사 판례 비교</li>
                    <li>· AI 법률 문서 초안 작성</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 관리자 코드 모달 ═══ */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-[360px] mx-4 p-6 relative">
            <button
              type="button"
              onClick={() => { setShowAdminModal(false); setAdminCodeError(""); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-semibold text-foreground mb-1">관리자 인증</h3>
            <p className="text-sm text-muted-foreground mb-5">
              계정 생성에는 관리자 인증이 필요합니다
            </p>

            {adminCodeError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{adminCodeError}</p>
              </div>
            )}

            <div className="space-y-1.5 mb-5">
              <Label htmlFor="admin-code" className="text-sm font-medium">
                관리자 코드
              </Label>
              <Input
                ref={adminCodeRef}
                id="admin-code"
                type="password"
                placeholder="관리자 코드를 입력하세요"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && adminCode.trim()) {
                    submitSignup(adminCode.trim());
                  }
                }}
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAdminModal(false); setAdminCodeError(""); }}
                disabled={isLoading}
                className="flex-1 h-10 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => submitSignup(adminCode.trim())}
                disabled={isLoading || !adminCode.trim()}
                className="flex-1 h-10 rounded-lg text-sm font-semibold text-white bg-[#7C6EF6] hover:bg-[#6D5EF5] transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "가입 완료"
                )}
              </button>
            </div>

            {/* 모달 하단 데모 링크 */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminCodeError("");
                  setMode("login");
                  setErrorMessage("");
                  setFieldErrors({});
                  // 약간의 딜레이 후 데모 로그인 실행
                  setTimeout(handleDemoLogin, 100);
                }}
                disabled={isLoading}
                className="text-xs text-primary hover:underline underline-offset-4 transition-colors disabled:opacity-50"
              >
                또는 체험하기 &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Unified Waves — spans full width ═══ */}
      <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-[320px] pointer-events-none" style={{ zIndex: 20 }}>
        {/* Left half — white filled waves (visible on purple bg) */}
        <div className="absolute inset-0" style={{ clipPath: "inset(0 40% 0 0)" }}>
          <div className="absolute bottom-0 left-0 h-[260px]" style={{ width: "200%", animation: "wave-drift 30s linear infinite" }}>
            <svg viewBox="0 0 2400 260" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,130 C200,60 400,200 600,120 C800,40 1000,190 1200,130 C1400,70 1600,200 1800,120 C2000,40 2200,180 2400,130 L2400,260 L0,260 Z" fill="rgba(255,255,255,0.06)" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 h-[200px]" style={{ width: "200%", animation: "wave-drift 20s linear infinite" }}>
            <svg viewBox="0 0 2400 200" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,100 C300,35 500,165 800,90 C1100,15 1300,155 1600,100 C1900,45 2100,165 2400,100 L2400,200 L0,200 Z" fill="rgba(255,255,255,0.10)" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 h-[140px]" style={{ width: "200%", animation: "wave-drift 15s linear infinite reverse" }}>
            <svg viewBox="0 0 2400 140" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,70 C200,25 450,115 700,60 C950,5 1150,105 1400,70 C1650,35 1900,115 2100,60 C2300,15 2400,70 2400,70 L2400,140 L0,140 Z" fill="rgba(255,255,255,0.16)" />
            </svg>
          </div>
        </div>

        {/* Right half — purple stroke waves (visible on light bg) */}
        <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 60%)" }}>
          <div className="absolute bottom-0 left-0 h-[260px]" style={{ width: "200%", animation: "wave-drift 30s linear infinite" }}>
            <svg viewBox="0 0 2400 260" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,130 C200,60 400,200 600,120 C800,40 1000,190 1200,130 C1400,70 1600,200 1800,120 C2000,40 2200,180 2400,130" fill="none" stroke="rgba(109,94,245,0.10)" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 h-[200px]" style={{ width: "200%", animation: "wave-drift 20s linear infinite" }}>
            <svg viewBox="0 0 2400 200" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,100 C300,35 500,165 800,90 C1100,15 1300,155 1600,100 C1900,45 2100,165 2400,100" fill="none" stroke="rgba(109,94,245,0.12)" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 h-[140px]" style={{ width: "200%", animation: "wave-drift 15s linear infinite reverse" }}>
            <svg viewBox="0 0 2400 140" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,70 C200,25 450,115 700,60 C950,5 1150,105 1400,70 C1650,35 1900,115 2100,60 C2300,15 2400,70 2400,70" fill="none" stroke="rgba(109,94,245,0.14)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
