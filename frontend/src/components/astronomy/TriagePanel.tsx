"use client";

import React, { useState } from "react";
import { TargetRecord } from "@/lib/types";
import { Check, CheckCircle, Database, HelpCircle, MessageSquare, Send, XCircle, Crown } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";

interface TriagePanelProps {
  target: TargetRecord;
  onUpdateVerdict: (verdict: "CONFIRMED" | "BOGUS" | "UNRESOLVED", notes: string) => void;
}

export function TriagePanel({ target, onUpdateVerdict }: TriagePanelProps) {
  const [selectedVerdict, setSelectedVerdict] = useState<"CONFIRMED" | "BOGUS" | "UNRESOLVED">(
    target.humanVerdict || "UNRESOLVED"
  );
  const [notes, setNotes] = useState(target.triageNotes || "");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.playSuccess();
    onUpdateVerdict(selectedVerdict, notes);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <div className="glass-royal-card relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 dark:border-amber-400/15 bg-[#F1F5F9]/80 dark:bg-[#0E1322]/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-lg border border-amber-500/40 dark:border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Database className="size-3.5" />
          </div>
          <span className="font-serif font-bold tracking-wider text-[#1E1B4B] dark:text-[#E2E8F0]">
            ACTIVE LEARNING TRIAGE &amp; REVIEW LOG
          </span>
        </div>
        <span className="font-sans text-[11px] text-[#B48A28] dark:text-amber-300/90 font-bold flex items-center gap-1.5">
          <Crown className="size-3.5 text-[#B48A28] dark:text-amber-400" /> Astronomer-in-the-Loop
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-[#FAF9F6]/40 dark:bg-[#070912]/80 transition-colors duration-300">
        {/* Verdict Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-sans font-bold text-[#1E1B4B] dark:text-[#9BA6B8] uppercase tracking-wider block">
            CLASSIFICATION VERDICT:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* CONFIRM */}
            <button
              type="button"
              onClick={() => { sfx.playClick(1040); setSelectedVerdict("CONFIRMED"); }}
              className={`flex flex-col items-center justify-center gap-2 py-3.5 px-2 rounded-xl border text-xs font-mono font-bold transition-all duration-200 active:scale-95 ${
                selectedVerdict === "CONFIRMED"
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500 font-black"
                  : "border-slate-300 dark:border-slate-800/80 bg-[#FAF9F6] dark:bg-[#0B0E17]/60 text-slate-700 dark:text-[#9BA6B8] hover:border-emerald-500/60 hover:text-emerald-700 dark:hover:text-emerald-400"
              }`}
            >
              <CheckCircle className={`size-5 ${selectedVerdict === "CONFIRMED" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
              <span className="font-serif">CONFIRM</span>
              <span className="text-[9.5px] font-sans font-normal opacity-75">Valid Exoplanet</span>
            </button>

            {/* BOGUS */}
            <button
              type="button"
              onClick={() => { sfx.playClick(620); setSelectedVerdict("BOGUS"); }}
              className={`flex flex-col items-center justify-center gap-2 py-3.5 px-2 rounded-xl border text-xs font-mono font-bold transition-all duration-200 active:scale-95 ${
                selectedVerdict === "BOGUS"
                  ? "border-rose-500 bg-rose-500/20 text-rose-900 dark:text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-500 font-black"
                  : "border-slate-300 dark:border-slate-800/80 bg-[#FAF9F6] dark:bg-[#0B0E17]/60 text-slate-700 dark:text-[#9BA6B8] hover:border-rose-500/60 hover:text-rose-700 dark:hover:text-rose-400"
              }`}
            >
              <XCircle className={`size-5 ${selectedVerdict === "BOGUS" ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`} />
              <span className="font-serif">FLAG BOGUS</span>
              <span className="text-[9.5px] font-sans font-normal opacity-75">False Positive</span>
            </button>

            {/* UNRESOLVED */}
            <button
              type="button"
              onClick={() => { sfx.playClick(840); setSelectedVerdict("UNRESOLVED"); }}
              className={`flex flex-col items-center justify-center gap-2 py-3.5 px-2 rounded-xl border text-xs font-mono font-bold transition-all duration-200 active:scale-95 ${
                selectedVerdict === "UNRESOLVED"
                  ? "border-[#B48A28] bg-amber-500/20 text-amber-950 dark:text-amber-300 shadow-[0_0_20px_rgba(180,138,40,0.3)] ring-1 ring-[#B48A28] font-black"
                  : "border-slate-300 dark:border-slate-800/80 bg-[#FAF9F6] dark:bg-[#0B0E17]/60 text-slate-700 dark:text-[#9BA6B8] hover:border-[#B48A28]/60 hover:text-[#B48A28]"
              }`}
            >
              <HelpCircle className={`size-5 ${selectedVerdict === "UNRESOLVED" ? "text-[#B48A28] dark:text-amber-400" : "text-slate-400"}`} />
              <span className="font-serif">UNRESOLVED</span>
              <span className="text-[9.5px] font-sans font-normal opacity-75">Centroid Anomaly</span>
            </button>
          </div>
        </div>

        {/* Triage Reviewer Notes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-sans font-bold text-[#1E1B4B] dark:text-[#9BA6B8] uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="size-3 text-[#B48A28] dark:text-amber-400" />
            VETTING REMARKS &amp; SPHEREx FOLLOW-UP:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Document centroid shift observations, limb-darkening anomalies, or spectrophotometric PAH flags..."
            className="w-full rounded-xl border border-amber-600/30 dark:border-amber-400/20 bg-[#FAF9F6] dark:bg-[#0B0E17]/70 backdrop-blur-md px-3.5 py-2.5 text-xs font-mono text-[#1E1B4B] dark:text-[#E2E8F0] placeholder:text-slate-500 dark:placeholder:text-[#9BA6B8]/50 focus:border-[#B48A28] focus:outline-none focus:ring-2 focus:ring-[#B48A28]/25 transition-all shadow-inner"
          />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 dark:border-amber-400/15">
          <div className="flex flex-col gap-0.5 font-mono text-[10.5px] text-slate-600 dark:text-[#9BA6B8]">
            <span>Active Target: <strong className="text-[#1E1B4B] dark:text-[#E2E8F0] font-serif font-bold">{target.id}</strong></span>
            <span>Host Designation: <strong className="text-[#B48A28] dark:text-amber-300 font-bold">{target.hostKey}</strong></span>
          </div>

          <button
            type="submit"
            className={`sheen-sweep flex items-center gap-2 rounded-xl border px-5 py-2.5 font-serif text-xs font-bold tracking-wider transition-all duration-200 active:scale-95 shadow-lg ${
              submitted
                ? "border-emerald-500 bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                : "border-indigo-500/40 dark:border-amber-400/50 bg-gradient-to-r from-[#4F46E5] to-[#3B82F6] dark:from-amber-400/20 dark:via-amber-500/20 dark:to-yellow-500/20 hover:scale-105 text-white dark:text-amber-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] dark:shadow-[0_0_15px_rgba(212,175,55,0.25)]"
            }`}
          >
            {submitted ? (
              <>
                <Check className="size-4 text-emerald-600 dark:text-emerald-300 animate-bounce" />
                SAVED TO REVIEW LOG!
              </>
            ) : (
              <>
                <Send className="size-3.5 text-white dark:text-amber-200" />
                COMMIT VERDICT
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
