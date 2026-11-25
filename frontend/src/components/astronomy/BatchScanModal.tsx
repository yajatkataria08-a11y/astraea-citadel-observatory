"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Play, Upload, X, Zap, AlertTriangle } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { api, streamBatch } from "@/lib/api-client";

interface BatchScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Summary {
  scored?: number;
  quarantinedByTripwire?: number;
  highScore_ge_0_9?: number;
  unlabelledCandidates?: number;
  topUnlabelledCandidates?: { id: string; score: number }[];
  note?: string;
}

export function BatchScanModal({ isOpen, onClose }: BatchScanModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  if (!isOpen) return null;
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  const startScan = async () => {
    sfx.playSuccess();
    setIsScanning(true);
    setIsComplete(false);
    setError(null);
    setSummary(null);
    setProcessed(0);
    setElapsed(0);
    const t0 = Date.now();
    try {
      const job = await api.startBatch("all");
      setTotal(job.total);
      stopRef.current = streamBatch(
        job.batchId,
        (p) => {
          setProcessed(p.processed);
          setTotal(p.total);
          setElapsed((Date.now() - t0) / 1000);
          if (p.status === "COMPLETED") {
            setIsScanning(false);
            setIsComplete(true);
            setSummary((p.summary as Summary) ?? null);
            sfx.playSuccess();
          } else if (p.status === "FAILED") {
            setIsScanning(false);
            setError(p.error ?? "Scan failed");
          }
        },
        () => {
          setIsScanning(false);
          setError("Lost connection to the backend while streaming progress.");
        }
      );
    } catch {
      setIsScanning(false);
      setError("Backend unreachable. Start it with: cd backend && python run.py");
    }
  };

  const rate = elapsed > 0 ? Math.round(processed / elapsed) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-royal-deck relative w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-amber-400/30">
        <div className="reticle-bracket-tl" />
        <div className="reticle-bracket-br" />

        <div className="flex items-center justify-between border-b border-amber-500/20 dark:border-amber-400/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-amber-500/40 dark:border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Zap className="size-4" />
            </div>
            <h2 className="font-serif text-sm font-bold tracking-wider uppercase text-[#1E1B4B] dark:text-[#E2E8F0] flex items-center gap-2">
              <span>BATCH CATALOG SCAN</span>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#DDD6FE] dark:bg-amber-400/10 text-[#1E1B4B] dark:text-amber-300 border border-[#B48A28]/40 dark:border-amber-400/30">
                FASTAPI ASYNC JOB · SSE
              </span>
            </h2>
          </div>
          <button
            onClick={() => { sfx.playClick(800); onClose(); }}
            className="text-slate-500 hover:text-[#B48A28] dark:hover:text-amber-300 rounded-lg p-1.5 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-dashed border-amber-600/35 dark:border-amber-400/30 bg-[#DDD6FE]/20 dark:bg-amber-400/5 p-5 text-center">
            <Upload className="mx-auto size-8 text-[#B48A28] dark:text-amber-400 mb-2" />
            <p className="font-serif text-xs text-[#1E1B4B] dark:text-[#E2E8F0] font-bold tracking-wide">
              koi_cumulative.parquet &bull; toi_catalog.parquet
            </p>
            <p className="font-mono text-[11px] text-slate-600 dark:text-[#9BA6B8] mt-1 font-medium">
              Scores every catalog row with the vetting model and runs the centroid tripwire.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-mono text-red-600 dark:text-red-300">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          {(isScanning || isComplete) && (
            <div className="rounded-xl border border-amber-500/25 dark:border-amber-400/25 bg-[#FAF9F6]/80 dark:bg-[#070912]/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-[#9BA6B8] flex items-center gap-2">
                  {isScanning ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-[#B48A28] dark:text-amber-400" />
                      <span className="text-[#B48A28] dark:text-amber-300 font-bold">STREAMING PROGRESS (SSE)...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        SCAN COMPLETE — {total.toLocaleString()} SCORED
                      </span>
                    </>
                  )}
                </span>
                <span className="font-serif font-bold text-[#1E1B4B] dark:text-[#E2E8F0]">{progress}%</span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-[#EDEFF5] dark:bg-slate-800/80 overflow-hidden p-0.5 border border-slate-300 dark:border-amber-400/20">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    isComplete
                      ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                      : "bg-gradient-to-r from-[#B48A28] via-[#4F46E5] to-[#3B82F6] dark:from-amber-400 dark:via-amber-500 dark:to-cyan-400 shadow-[0_0_12px_rgba(180,138,40,0.8)]"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-[#9BA6B8] pt-1">
                <span>{processed.toLocaleString()} / {total.toLocaleString()} processed</span>
                <span className="text-[#3B82F6] dark:text-cyan-400 font-bold">{rate.toLocaleString()} obj/sec (measured)</span>
              </div>

              {isComplete && summary && (
                <div className="mt-2 border-t border-amber-500/20 pt-3 text-[11px] font-mono text-slate-700 dark:text-[#CBD5E1] space-y-1">
                  <div>Unlabelled candidates: <b>{summary.unlabelledCandidates?.toLocaleString()}</b> · score ≥ 0.9: <b>{summary.highScore_ge_0_9?.toLocaleString()}</b> · tripwire flags: <b>{summary.quarantinedByTripwire?.toLocaleString()}</b></div>
                  {summary.topUnlabelledCandidates && summary.topUnlabelledCandidates.length > 0 && (
                    <div>Top candidates: {summary.topUnlabelledCandidates.slice(0, 5).map((c) => `${c.id} (${c.score.toFixed(2)})`).join(", ")}</div>
                  )}
                  {summary.note && <div className="opacity-70">{summary.note}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-amber-500/20 dark:border-amber-400/20 pt-4">
          <button
            onClick={() => { sfx.playClick(800); onClose(); }}
            className="rounded-xl border border-slate-300 dark:border-slate-800 px-4 py-2 font-serif text-xs text-slate-700 dark:text-[#9BA6B8] hover:bg-[#EDEFF5] dark:hover:bg-slate-800 transition-all font-semibold"
          >
            DISMISS
          </button>
          <button
            onClick={startScan}
            disabled={isScanning}
            className="sheen-sweep flex items-center gap-2 rounded-xl border border-indigo-400/50 dark:border-amber-400/50 bg-gradient-to-r from-[#4F46E5] to-[#3B82F6] dark:from-amber-400/20 dark:via-amber-500/20 dark:to-yellow-500/20 hover:scale-105 px-5 py-2 font-serif text-xs font-bold text-white dark:text-amber-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] dark:shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 active:scale-95 transition-all"
          >
            <Play className="size-3.5 fill-current text-white dark:text-amber-200" />
            {isScanning ? "SCANNING..." : "START SCAN"}
          </button>
        </div>
      </div>
    </div>
  );
}
