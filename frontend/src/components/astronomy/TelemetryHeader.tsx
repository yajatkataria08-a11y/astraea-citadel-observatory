"use client";

import React, { useEffect, useState } from "react";
import { Database, Server, UploadCloud, Volume2, VolumeX, Sun, Moon, Compass, Sparkles } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { useTheme } from "@/lib/theme-provider";

interface TelemetryHeaderProps {
  onOpenBatchScan: () => void;
}

export function TelemetryHeader({ onOpenBatchScan }: TelemetryHeaderProps) {
  const [utcTime, setUtcTime] = useState("");
  const [julianDate, setJulianDate] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");

      const jd = now.getTime() / 86400000 + 2440587.5;
      setJulianDate(`JD ${jd.toFixed(4)}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    sfx.enabled = nextState;
    setSoundEnabled(nextState);
    if (nextState) {
      sfx.playSuccess();
    }
  };

  const handleThemeChange = () => {
    sfx.playClick(1200);
    toggleTheme();
  };

  return (
    <header className="glass-royal-deck sticky top-0 z-50 px-4 md:px-6 py-3 transition-all duration-300 border-b border-amber-400/20 dark:border-amber-400/15">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-[1780px] mx-auto">
        {/* Left: Royal Astronavigation Insignia */}
        <div className="flex items-center gap-3.5">
          <div
            className="relative group cursor-pointer"
            onClick={() => sfx.playBlip()}
            title="ASTRÆA Citadel Observatory Core"
          >
            {/* Luminous Emblem */}
            <div className="flex size-10 items-center justify-center rounded-xl border border-amber-500/40 dark:border-amber-400/40 bg-gradient-to-br from-amber-400/20 via-indigo-900/10 to-purple-900/10 dark:via-indigo-900/30 dark:to-purple-900/30 text-amber-700 dark:text-amber-300 font-serif font-black text-base shadow-[0_0_20px_rgba(180,138,40,0.18)] dark:shadow-[0_0_20px_rgba(212,175,55,0.25)] group-hover:scale-105 group-hover:border-amber-500 transition-all duration-300">
              <Compass className="size-5 text-amber-700 dark:text-amber-300 group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(180,138,40,1)]" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-base sm:text-lg font-bold tracking-wider text-[#1E1B4B] dark:text-[#F3F5FA] flex items-center gap-2">
                <span>ASTRÆA</span>
                <span className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full border border-amber-600/30 dark:border-amber-400/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 tracking-normal flex items-center gap-1 shadow-sm">
                  <Sparkles className="size-3 text-amber-600 dark:text-amber-400" /> CITADEL OBSERVATORY
                </span>
              </h1>
            </div>
            <p className="font-mono text-[11px] text-slate-600 dark:text-[#9BA6B8] flex items-center gap-2">
              <span className="text-[#3B82F6] dark:text-cyan-300 font-semibold">SPHEREx 102-Ch Calibrated</span>
              <span className="opacity-40">&bull;</span>
              <span>TESS/Kepler Vetting</span>
              <span className="opacity-40">&bull;</span>
              <span className="text-[#6D28D9] dark:text-purple-300 font-medium">Active Learning Rev 5</span>
            </p>
          </div>
        </div>

        {/* Center: Imperial Astronomical Clock */}
        <div className="hidden lg:flex items-center gap-8 border-x border-amber-600/15 dark:border-amber-400/10 px-8 font-mono text-[11.5px]">
          <div className="flex flex-col">
            <span className="text-[9.5px] font-sans font-semibold text-slate-500 dark:text-amber-300/80 uppercase tracking-widest flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              UNIVERSAL COORDINATED TIME
            </span>
            <span className="text-[#1E1B4B] dark:text-[#E2E8F0] font-bold tracking-wide font-mono">
              {utcTime || "CALIBRATING CHRONOMETER..."}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9.5px] font-sans font-semibold text-slate-500 dark:text-cyan-300/80 uppercase tracking-widest">
              ASTRONOMICAL JULIAN EPOCH
            </span>
            <span className="text-[#4F46E5] dark:text-cyan-300 font-bold font-mono tracking-wide">
              {julianDate || "SYNCING J2000.0..."}
            </span>
          </div>
        </div>

        {/* Right: Telemetry Status, Theme Switcher & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tactical Audio Synthesizer */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Tactile Audio HUD Active (Click to Mute)" : "Tactile Audio HUD Muted (Click to Enable)"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all duration-200 active:scale-95 shadow-sm ${
              soundEnabled
                ? "border-amber-500/50 dark:border-amber-400/50 bg-amber-500/15 dark:bg-amber-400/15 text-amber-900 dark:text-amber-300 shadow-[0_0_15px_rgba(180,138,40,0.2)] font-bold"
                : "border-slate-300 dark:border-slate-800 bg-[#F1F5F9]/80 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {soundEnabled ? <Volume2 className="size-3.5 text-amber-600 dark:text-amber-400 animate-pulse" /> : <VolumeX className="size-3.5" />}
            <span className="hidden sm:inline font-sans">HUD AUDIO:</span>
            <span className="font-bold">{soundEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={handleThemeChange}
            title={theme === "dark" ? "Switch to Royal Celestial Light Mode (Starlight & Marble)" : "Switch to Deep Space Void Dark Mode"}
            className="flex items-center justify-center size-9 rounded-xl border border-amber-600/25 dark:border-amber-400/20 bg-[#F1F5F9]/90 dark:bg-[#12172A]/70 text-[#1E1B4B] dark:text-amber-300 hover:border-amber-500 shadow-sm active:scale-90 transition-all duration-300"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-300 transition-transform hover:rotate-90 duration-500" />
            ) : (
              <Moon className="size-4 text-[#1E1B4B] transition-transform hover:-rotate-12 duration-500" />
            )}
          </button>

          {/* DuckDB Status */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-600/30 dark:border-emerald-400/20 bg-emerald-500/10 dark:bg-emerald-950/30 px-3 py-1.5 text-[11px] font-mono shadow-sm">
            <Database className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-600 dark:text-slate-400 font-sans">DuckDB:</span>
            <span className="text-emerald-800 dark:text-emerald-300 font-bold">PARQUET LIVE</span>
          </div>

          {/* Celery Status */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-indigo-600/30 dark:border-cyan-400/20 bg-[#DDD6FE]/40 dark:bg-indigo-950/30 px-3 py-1.5 text-[11px] font-mono shadow-sm">
            <Server className="size-3.5 text-[#4F46E5] dark:text-cyan-400" />
            <span className="text-slate-600 dark:text-slate-400 font-sans">Celery:</span>
            <span className="text-[#1E1B4B] dark:text-cyan-300 font-bold">4 WORKERS</span>
          </div>

          {/* Batch Scan CTA Button with Cosmic Cobalt & Burnished Gold Accent */}
          <button
            onClick={() => {
              sfx.playSelect();
              onOpenBatchScan();
            }}
            className="sheen-sweep relative flex items-center gap-2 rounded-xl border border-amber-500/40 dark:border-amber-400/50 bg-gradient-to-r from-[#4F46E5] to-[#3B82F6] dark:from-amber-400/20 dark:via-amber-500/20 dark:to-yellow-500/20 hover:scale-105 text-white dark:text-amber-200 px-4 py-2 font-serif text-xs font-bold tracking-wider shadow-[0_0_20px_rgba(79,70,229,0.3)] dark:shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 transition-all duration-200"
          >
            <UploadCloud className="size-4 text-white dark:text-amber-200" />
            <span>BATCH SCAN PARQUET</span>
          </button>
        </div>
      </div>
    </header>
  );
}
