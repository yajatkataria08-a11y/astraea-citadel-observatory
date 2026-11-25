"use client";

import { useApiHealth } from "@/lib/hooks";
import { apiBase } from "@/lib/api-client";

/** Small status pill: tells you immediately whether the backend is reachable (and where we are looking). */
export function ApiStatusBanner() {
  const { health, online } = useApiHealth();
  if (online === null || (online && health?.status === "ok")) return null; // only speak up when something is wrong
  return (
    <div
      role="status"
      className="fixed bottom-3 left-3 z-[60] max-w-[min(92vw,420px)] rounded-xl border border-amber-500/40 bg-[#0B0E17]/90 px-3 py-2 font-mono text-[11px] text-amber-200 shadow-lg backdrop-blur"
    >
      {online ? (
        <>Backend is up but not ready: {health?.catalog.error ?? "still loading the catalog / model"}.</>
      ) : (
        <>
          Backend offline at <b>{apiBase()}</b> — showing demo data, retrying automatically.
          <br />
          Start it: <b>cd backend &amp;&amp; python run.py</b>
        </>
      )}
    </div>
  );
}
