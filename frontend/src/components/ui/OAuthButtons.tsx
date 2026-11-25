"use client";

import React, { useEffect, useState } from "react";
import { api, oauthStartUrl, OAuthProvider } from "@/lib/api-client";

const ICONS: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 23 23" className="size-4" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" /><path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  ),
};
const LABEL: Record<OAuthProvider, string> = { google: "Google", microsoft: "Microsoft", github: "GitHub" };

/** "Continue with ..." buttons. Providers the server has no credentials for are shown disabled, with a hint. */
export function OAuthButtons({ next }: { next: string }) {
  const [enabled, setEnabled] = useState<Record<OAuthProvider, boolean> | null>(null);
  useEffect(() => {
    let off = false;
    api.providers().then((r) => !off && setEnabled(r.providers)).catch(() => !off && setEnabled(null));
    return () => {
      off = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
        <span className="h-px flex-1 bg-slate-300/60 dark:bg-slate-700/60" /> OR CONTINUE WITH <span className="h-px flex-1 bg-slate-300/60 dark:bg-slate-700/60" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(LABEL) as OAuthProvider[]).map((p) => {
          const on = enabled?.[p] === true;
          return (
            <button
              key={p}
              type="button"
              disabled={!on}
              title={on ? `Continue with ${LABEL[p]}` : enabled ? `${LABEL[p]} sign-in is not configured on the server` : "Backend offline"}
              onClick={() => {
                window.location.href = oauthStartUrl(p, next);
              }}
              className="interactive-press interactive-hover-lift flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-white/80 dark:bg-[#0B0E17]/80 px-2.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:bg-slate-50 dark:hover:bg-[#151B2E] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ICONS[p]} <span className="hidden sm:inline">{LABEL[p]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
