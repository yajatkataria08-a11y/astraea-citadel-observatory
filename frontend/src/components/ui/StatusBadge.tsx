import React from "react";
import { TargetBadge } from "@/lib/types";

interface StatusBadgeProps {
  status: TargetBadge;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const configs: Record<
    TargetBadge,
    { label: string; bg: string; text: string; border: string; dot: string; glow: string }
  > = {
    CONFIRMED_PLANET: {
      label: "CONFIRMED PLANET",
      bg: "bg-emerald-500/15 dark:bg-emerald-950/50 backdrop-blur-md",
      text: "text-emerald-800 dark:text-emerald-300 font-bold",
      border: "border-emerald-500/40 dark:border-emerald-400/40",
      dot: "bg-emerald-500 dark:bg-emerald-400 animate-pulse",
      glow: "shadow-[0_0_12px_rgba(52,211,153,0.35)]",
    },
    QUARANTINED: {
      label: "QUARANTINED §1.3",
      bg: "bg-rose-500/15 dark:bg-rose-950/60 backdrop-blur-md",
      text: "text-rose-800 dark:text-rose-300 font-black",
      border: "border-rose-500/50 dark:border-rose-400/50",
      dot: "bg-rose-500 dark:bg-rose-400 animate-ping",
      glow: "shadow-[0_0_14px_rgba(244,63,94,0.4)]",
    },
    FUOR_OUTBURST: {
      label: "FUOR OUTBURST",
      bg: "bg-amber-500/15 dark:bg-amber-950/50 backdrop-blur-md",
      text: "text-[#B48A28] dark:text-amber-300 font-bold",
      border: "border-[#B48A28]/40 dark:border-amber-400/40",
      dot: "bg-[#B48A28] dark:bg-amber-400",
      glow: "shadow-[0_0_12px_rgba(180,138,40,0.3)]",
    },
    CANDIDATE: {
      label: "VETTING CANDIDATE",
      bg: "bg-[#3B82F6]/15 dark:bg-sky-950/40 backdrop-blur-md",
      text: "text-[#1E1B4B] dark:text-cyan-300 font-bold",
      border: "border-[#3B82F6]/40 dark:border-cyan-400/40",
      dot: "bg-[#3B82F6] dark:bg-cyan-400",
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]",
    },
    FALSE_POSITIVE: {
      label: "FALSE POSITIVE",
      bg: "bg-[#EDEFF5] dark:bg-slate-900/60 backdrop-blur-md",
      text: "text-slate-700 dark:text-slate-400 font-semibold",
      border: "border-slate-300 dark:border-slate-700",
      dot: "bg-slate-500",
      glow: "shadow-none",
    },
  };

  const conf = configs[status] || configs.CANDIDATE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10.5px] font-mono tracking-wider uppercase transition-all duration-300 ${conf.bg} ${conf.text} ${conf.border} ${conf.glow} hover:scale-105 cursor-default ${className}`}
    >
      <span className="relative flex size-2 items-center justify-center">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${conf.dot}`} />
        <span className={`relative inline-flex size-1.5 rounded-full ${conf.dot.replace('animate-ping', '').replace('animate-pulse', '')}`} />
      </span>
      {conf.label}
    </span>
  );
}
