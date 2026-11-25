"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Landing page after the provider redirect. The backend puts the session token in the URL fragment (never sent to servers / logs). */
export default function OAuthCallback() {
  const router = useRouter();
  const { completeOAuth, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!ready || ran.current) return;
    ran.current = true;
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = h.get("token");
    const rawNext = h.get("next") || "/pipelines";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/pipelines";
    window.history.replaceState(null, "", window.location.pathname); // drop the token from the address bar
    if (!token) {
      setError("No sign-in token received.");
      return;
    }
    completeOAuth(token).then(() => router.replace(next)).catch(() => setError("Could not verify your session. Please try again."));
  }, [ready, completeOAuth, router]);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-24 text-sm">
      {error ? (
        <div className="space-y-3 text-center">
          <p role="alert" className="text-red-400">{error}</p>
          <button onClick={() => router.replace("/login")} className="underline text-slate-500 dark:text-[#94A3B8]">Back to sign in</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-[#94A3B8]">
          <Loader2 className="size-4 animate-spin" /> Finishing sign-in…
        </div>
      )}
    </main>
  );
}
