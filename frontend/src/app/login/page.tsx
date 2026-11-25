"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Loader2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api-client";
import { sfx } from "@/lib/audio-sfx";
import { OAuthButtons } from "@/components/ui/OAuthButtons";

type Mode = "signin" | "signup";

const inputCls =
  "cosmic-input w-full rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-white/80 dark:bg-[#0B0E17]/80 pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none backdrop-blur-md shadow-sm";

const btnCls =
  "sheen-sweep auth-button-glow w-full flex items-center justify-center gap-2 rounded-xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#1E1B4B] via-[#2E4A9E] to-[#4F46E5] dark:from-[#2E4A9E] dark:via-[#5C1D42] dark:to-[#7A2048] text-white font-serif text-xs font-bold tracking-wider px-4 py-3 shadow-[0_0_20px_rgba(46,74,158,0.35)] dark:shadow-[0_0_24px_rgba(212,175,55,0.3)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed";

function messageOf(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error ? e.message : "Something went wrong.";
}

function Field({
  icon: Icon,
  isPassword,
  ...props
}: {
  icon: React.ElementType;
  isPassword?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="relative block group">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-[#B48A28] dark:group-focus-within:text-[#D4AF37] transition-colors duration-200" />
      <input
        {...props}
        type={isPassword ? (showPassword ? "text" : "password") : props.type}
        className={inputCls}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            sfx.playClick(1200);
            setShowPassword(!showPassword);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#D4AF37] transition-colors focus:outline-none rounded-lg"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </label>
  );
}

function AuthCard() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, signup, continueAsGuest, user, ready } = useAuth();
  const rawNext = params.get("next") || "/pipelines";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/pipelines";

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef<{ x: number; moved: boolean } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Controlled inputs for Sign In
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  // Controlled inputs for Sign Up
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  useEffect(() => {
    const e = params.get("oauth_error");
    if (e) setError(e);
  }, [params]);

  useEffect(() => {
    // Only redirect if an authenticated user exists (guests should still be able to visit /login)
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  const go = useCallback((m: Mode) => {
    setMode((cur) => {
      if (cur !== m) sfx.playBlip();
      return m;
    });
    setError(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && /INPUT|TEXTAREA/.test(t.tagName)) return;
      if (e.key === "ArrowLeft") go("signup");
      if (e.key === "ArrowRight") go("signin");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Pointer drag for desktop sliding overlay
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragStart.current = { x: e.clientX, moved: false };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStart.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 4) s.moved = true;
    const w = (stageRef.current?.offsetWidth ?? 800) / 2;
    const base = mode === "signin" ? w : 0;
    setDrag(Math.max(0, Math.min(w, base + dx)));
  };
  const onUp = () => {
    const s = dragStart.current;
    dragStart.current = null;
    if (s?.moved && drag !== null) {
      const w = (stageRef.current?.offsetWidth ?? 800) / 2;
      go(drag < w / 2 ? "signup" : "signin");
    }
    setDrag(null);
  };

  // Mobile touch swipe
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -50) go("signup");
    if (dx > 50) go("signin");
  };

  // Demo auto-fill helper
  const handleFillDemo = () => {
    sfx.playClick(1000);
    setError(null);
    if (mode === "signin") {
      setSigninEmail("test@example.com");
      setSigninPassword("password123");
    } else {
      setSignupName("Dr. Carl Sagan");
      setSignupEmail(`observer_${Math.floor(1000 + Math.random() * 9000)}@astraea.space`);
      setSignupPassword("GalaxyExplorer99!");
      setSignupConfirm("GalaxyExplorer99!");
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>, kind: Mode) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === "signup") {
        const name = signupName.trim();
        const email = signupEmail.trim();
        const password = signupPassword;
        const confirm = signupConfirm;

        if (!name) throw new Error("Please enter your name.");
        if (!email) throw new Error("Please enter a valid email address.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters long.");
        if (password !== confirm) throw new Error("Passwords do not match.");

        await signup(name, email, password);
      } else {
        const email = signinEmail.trim();
        const password = signinPassword;
        if (!email || !password) throw new Error("Please enter your email and password.");
        await login(email, password);
      }
      sfx.playSuccess();
      router.replace(next);
    } catch (err) {
      sfx.playBlip();
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const pos = mode === "signup" ? 1 : 0;
  const style = { "--pos": pos } as React.CSSProperties;
  const overlayStyle: React.CSSProperties | undefined =
    drag !== null && stageRef.current ? { transform: `translateX(${drag}px)` } : undefined;

  const errorBox = error && (
    <div
      role="alert"
      className="flex flex-col gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
        <span className="font-semibold">{error}</span>
      </div>
      {error.includes("already exists") && (
        <button
          type="button"
          onClick={() => {
            setSigninEmail(signupEmail);
            go("signin");
          }}
          className="self-start text-[11px] underline text-[#B48A28] dark:text-[#D4AF37] font-semibold hover:opacity-80 transition-opacity"
        >
          Switch to Sign In with {signupEmail || "this email"} &rarr;
        </button>
      )}
      {error.includes("Invalid email or password") && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] underline text-[#B48A28] dark:text-[#D4AF37] font-semibold hover:opacity-80 transition-opacity"
          >
            Auto-fill demo login (test@example.com) &rarr;
          </button>
          <span className="text-slate-400 text-[10px]">&bull;</span>
          <button
            type="button"
            onClick={() => {
              setSignupEmail(signinEmail);
              go("signup");
            }}
            className="text-[11px] underline text-[#3B82F6] dark:text-[#A5F3FC] font-semibold hover:opacity-80 transition-opacity"
          >
            Need an account? Register here &rarr;
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={stageRef}
      style={style}
      className="auth-stage glass-royal-deck relative w-full max-w-[920px] overflow-hidden rounded-3xl border border-[#B48A28]/40 dark:border-[#D4AF37]/40 shadow-[0_20px_70px_rgba(30,39,97,0.45)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile Sliding Tabs */}
      <div
        className="md:hidden relative p-1 m-3 rounded-2xl bg-slate-200/60 dark:bg-[#0B0E17]/80 border border-slate-300/60 dark:border-slate-800/80"
        role="tablist"
      >
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-[#1E2761] to-[#2E4A9E] text-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            transform: `translateX(${mode === "signin" ? "0px" : "calc(100% + 4px)"})`,
          }}
        />
        <div className="relative flex">
          <button
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => go("signin")}
            className={`flex-1 py-2 text-xs font-serif font-bold tracking-wide transition-colors duration-200 ${
              mode === "signin" ? "text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            SIGN IN
          </button>
          <button
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => go("signup")}
            className={`flex-1 py-2 text-xs font-serif font-bold tracking-wide transition-colors duration-200 ${
              mode === "signup" ? "text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            SIGN UP
          </button>
        </div>
      </div>

      <div className="auth-track">
        {/* LEFT half: Sign In */}
        <section
          className={`auth-pane p-6 md:p-12 transition-all duration-300 ${
            mode === "signin" ? "opacity-100 scale-100" : "opacity-40 scale-[0.98]"
          }`}
          aria-label="Sign in"
        >
          <form onSubmit={(e) => submit(e, "signin")} className="mx-auto max-w-sm space-y-4" noValidate={false}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-600/30 dark:border-amber-400/30 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-[10px] font-mono text-[#1E1B4B] dark:text-[#E2E8F0]">
                  <ShieldCheck className="size-3 text-[#B48A28] dark:text-[#D4AF37]" />
                  <span>SECURE OPERATOR ACCESS</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  title="Auto-fill verified demo credentials"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-[#B48A28] dark:text-[#D4AF37] hover:underline"
                >
                  <KeyRound className="size-3" /> Quick Demo Fill
                </button>
              </div>
              <h1 className="font-serif text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC] tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                Sign in to run the telemetry console and record catalog reviews.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] pt-1">
                <span>Demo operator:</span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[#B48A28] dark:text-[#D4AF37] font-semibold bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors"
                  title="Click to insert test credentials"
                >
                  test@example.com / password123
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Field
                icon={Mail}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-label="Email"
                value={signinEmail}
                onChange={(e) => {
                  setError(null);
                  setSigninEmail(e.target.value);
                }}
              />
              <Field
                icon={Lock}
                name="password"
                isPassword
                required
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Password"
                value={signinPassword}
                onChange={(e) => {
                  setError(null);
                  setSigninPassword(e.target.value);
                }}
              />
            </div>

            {mode === "signin" && errorBox}

            <button type="submit" disabled={busy} className={btnCls}>
              {busy && mode === "signin" ? <Loader2 className="size-4 animate-spin" /> : null} SIGN IN TO OBSERVATORY
            </button>

            <OAuthButtons next={next} />

            <button
              type="button"
              onClick={() => {
                sfx.playClick(900);
                continueAsGuest();
                router.replace(next);
              }}
              className="interactive-press interactive-hover-lift w-full text-center text-xs text-slate-500 dark:text-[#94A3B8] hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC] py-1.5 transition-colors"
            >
              Continue as guest observer &rarr;
            </button>
          </form>
        </section>

        {/* RIGHT half: Sign Up */}
        <section
          className={`auth-pane p-6 md:p-12 transition-all duration-300 ${
            mode === "signup" ? "opacity-100 scale-100" : "opacity-40 scale-[0.98]"
          }`}
          aria-label="Sign up"
        >
          <form onSubmit={(e) => submit(e, "signup")} className="mx-auto max-w-sm space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-600/30 dark:border-amber-400/30 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-[10px] font-mono text-[#1E1B4B] dark:text-[#E2E8F0]">
                  <Sparkles className="size-3 text-[#3B82F6] dark:text-[#A5F3FC]" />
                  <span>EXPEDITION ENLISTMENT</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  title="Generate sample observer registration"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-[#3B82F6] dark:text-[#A5F3FC] hover:underline"
                >
                  <RotateCcw className="size-3" /> Sample Enlistment
                </button>
              </div>
              <h1 className="font-serif text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC] tracking-tight">
                Create account
              </h1>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                Instant access. Passwords are scrypt-hashed on the backend.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Field
                icon={User}
                name="name"
                type="text"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Full name (e.g. Dr. Carl Sagan)"
                aria-label="Full name"
                value={signupName}
                onChange={(e) => {
                  setError(null);
                  setSignupName(e.target.value);
                }}
              />
              <Field
                icon={Mail}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-label="Email"
                value={signupEmail}
                onChange={(e) => {
                  setError(null);
                  setSignupEmail(e.target.value);
                }}
              />
              <Field
                icon={Lock}
                name="password"
                isPassword
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Password (min 8 characters)"
                aria-label="Password"
                value={signupPassword}
                onChange={(e) => {
                  setError(null);
                  setSignupPassword(e.target.value);
                }}
              />
              <Field
                icon={Lock}
                name="confirm"
                isPassword
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Confirm password"
                aria-label="Confirm password"
                value={signupConfirm}
                onChange={(e) => {
                  setError(null);
                  setSignupConfirm(e.target.value);
                }}
              />

              {/* Password Requirements & Match Tracker */}
              {(signupPassword || signupConfirm) && (
                <div className="flex items-center justify-between text-[11px] font-mono px-1 pt-0.5 animate-in fade-in duration-200">
                  <span
                    className={`flex items-center gap-1 ${
                      signupPassword.length >= 8 ? "text-emerald-500 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {signupPassword.length >= 8 ? <Check className="size-3" /> : <span className="size-3 inline-block">&bull;</span>} 8+ chars
                  </span>
                  {signupConfirm && (
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        signupPassword === signupConfirm ? "text-emerald-500" : "text-amber-500"
                      }`}
                    >
                      {signupPassword === signupConfirm ? (
                        <>
                          <Check className="size-3" /> Passwords Match
                        </>
                      ) : (
                        <>
                          <X className="size-3" /> Passwords Differ
                        </>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            {mode === "signup" && errorBox}

            <button type="submit" disabled={busy} className={btnCls}>
              {busy && mode === "signup" ? <Loader2 className="size-4 animate-spin" /> : null} REGISTER CREDENTIALS
            </button>

            <OAuthButtons next={next} />
          </form>
        </section>
      </div>

      {/* Sliding Celestial Overlay (Desktop) */}
      <div
        className={`auth-overlay ${
          drag !== null ? "dragging" : ""
        } select-none items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#2E4A9E] to-[#5C1D42] text-white border-x border-[#D4AF37]/30 shadow-[0_0_50px_rgba(0,0,0,0.6)]`}
        style={overlayStyle}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-hidden={false}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative text-center px-10 space-y-5 max-w-sm mx-auto">
          <div className="relative inline-block">
            <div className="flex size-14 mx-auto items-center justify-center rounded-2xl border border-[#D4AF37]/50 bg-white/10 backdrop-blur-md shadow-[0_0_25px_rgba(212,175,55,0.4)]">
              <Compass className="size-7 text-[#D4AF37] animate-[spin_30s_linear_infinite]" />
            </div>
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-cyan-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
          </div>

          <div className="transition-all duration-300">
            {mode === "signin" ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-serif text-3xl font-black tracking-tight">New to ASTRÆA?</h2>
                <p className="text-sm text-white/80 leading-relaxed font-sans">
                  Slide left or click below to register your operator credentials and begin triage exploration.
                </p>
                <button
                  type="button"
                  onClick={() => go("signup")}
                  className="interactive-press interactive-hover-lift inline-flex items-center gap-2 rounded-xl border border-[#D4AF37] bg-white/10 px-6 py-2.5 text-xs font-serif font-bold tracking-wider hover:bg-white/20 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
                >
                  <ArrowLeft className="size-4 text-[#A5F3FC]" /> CREATE ACCOUNT
                </button>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <h2 className="font-serif text-3xl font-black tracking-tight">Already Registered?</h2>
                <p className="text-sm text-white/80 leading-relaxed font-sans">
                  Slide right or click below to authenticate with your existing observatory account.
                </p>
                <button
                  type="button"
                  onClick={() => go("signin")}
                  className="interactive-press interactive-hover-lift inline-flex items-center gap-2 rounded-xl border border-[#D4AF37] bg-white/10 px-6 py-2.5 text-xs font-serif font-bold tracking-wider hover:bg-white/20 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
                >
                  SIGN IN <ArrowRight className="size-4 text-[#A5F3FC]" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <span className="text-[10px] font-mono text-white/50 tracking-widest uppercase">
              Drag card or use &larr; &rarr; keys
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
      <Suspense fallback={<div className="font-mono text-xs text-slate-500">Loading…</div>}>
        <AuthCard />
      </Suspense>
    </main>
  );
}
