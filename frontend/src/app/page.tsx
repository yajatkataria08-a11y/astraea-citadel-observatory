"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MOCK_TARGETS } from "@/lib/mock-astro-data";
import { useTargets, useApiHealth } from "@/lib/hooks";
import { TargetRecord } from "@/lib/types";
import { formatRaDec, fmt, fmtInt } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { sfx } from "@/lib/audio-sfx";
import { Radio, Activity, ArrowRight, Layers, ChevronRight, BarChart3, Zap } from "lucide-react";

export default function HomePage() {
  const [selectedTarget, setSelectedTarget] = useState<TargetRecord>(MOCK_TARGETS[0]);
  const { targets, source } = useTargets(60);
  const { health } = useApiHealth(30000);
  useEffect(() => {
    if (source === "api" && targets.length > 0 && !targets.some((t) => t.id === selectedTarget.id)) {
      setSelectedTarget(targets[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, targets]);

  const selectTarget = (t: TargetRecord) => {
    sfx.playSelect();
    setSelectedTarget(t);
  };

  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      
      {/* 1. Hero: Royal Astronomical Front Door */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 md:px-8 max-w-[1780px] mx-auto w-full">
        <ScrollReveal direction="up" delay={50} className="text-center max-w-4xl mx-auto space-y-6">
          
          {/* Top Royal Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#B48A28]/40 dark:border-[#D4AF37]/40 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/50 text-xs font-mono text-[#1E1B4B] dark:text-[#E2E8F0] shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-serif font-bold tracking-wider text-[#B48A28] dark:text-[#D4AF37]">
              CITADEL OBSERVATORY DECK
            </span>
            <span className="opacity-40">&bull;</span>
            <span>NEXT-GEN EXOPLANET &amp; SKY CHANGE EXPLORER</span>
          </div>

          {/* Majestic Royal Serif Title */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#1E1B4B] dark:text-[#F8FAFC] leading-[1.15]">
            Unlocking The Cosmos With{" "}
            <span className="bg-gradient-to-r from-[#1E1B4B] via-[#4F46E5] to-[#3B82F6] dark:from-[#D4AF37] dark:via-[#A5F3FC] dark:to-[#E2E8F0] bg-clip-text text-transparent">
              Precision Astrometry
            </span>
          </h1>

          {/* Clear Value Proposition */}
          <p className="text-base sm:text-lg text-slate-700 dark:text-[#CBD5E1] leading-relaxed max-w-3xl mx-auto font-sans">
            ASTRÆA powers exoplanet validation through two distinct scientific architectures: the{" "}
            <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">SPHEREx 102-channel spectrophotometric sky engine</strong>{" "}
            and the{" "}
            <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">TESS &amp; Kepler high-precision transit vetting pipeline</strong>,{" "}
            grounded by human-in-the-loop Active Learning and explainable SHAP neural feature attributions.
          </p>

          {/* Standout CTA Group */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              href="/pipelines"
              onClick={() => sfx.playSelect()}
              className="sheen-sweep interactive-press interactive-glow-cyan relative flex items-center gap-2 rounded-2xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#1E1B4B] via-[#2E4A9E] to-[#4F46E5] dark:from-[#2E4A9E] dark:via-[#5C1D42] dark:to-[#7A2048] text-white font-serif text-sm font-bold tracking-wider px-6 py-3.5 shadow-xl transition-all duration-200"
            >
              <Zap className="size-4 text-[#A5F3FC]" />
              <span>EXPLORE THE 2 PIPELINES</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/shap"
              onClick={() => sfx.playClick(900)}
              className="interactive-press interactive-glow-gold flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-800 bg-[#F1F5F9]/90 dark:bg-[#0F1322]/80 text-[#1E1B4B] dark:text-[#E2E8F0] font-serif text-sm font-bold tracking-wider px-6 py-3.5 shadow-md transition-all duration-200"
            >
              <BarChart3 className="size-4 text-[#3B82F6] dark:text-[#A5F3FC]" />
              <span>SHAP EXPLAINABILITY NOTION</span>
            </Link>
          </div>

          {/* 4 Credibility Metric Badges with Staggered Scroll Reveal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 font-mono text-left max-w-3xl mx-auto">
            <ScrollReveal direction="up" delay={80}>
              <div className="glass-royal-card interactive-press interactive-glow-cyan rounded-2xl p-3 border border-[#B48A28]/20 dark:border-[#D4AF37]/20 cursor-default h-full">
                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                  Spectral Resolution
                </div>
                <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                  102 Bands
                </div>
                <div className="text-[10px] text-[#3B82F6] dark:text-[#A5F3FC]">0.75 - 5.00 μm IR</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={160}>
              <div className="glass-royal-card interactive-press interactive-glow-gold rounded-2xl p-3 border border-[#B48A28]/20 dark:border-[#D4AF37]/20 cursor-default h-full">
                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                  Held-out ROC-AUC
                </div>
                <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                  {typeof health?.model.metrics?.test_roc_auc === "number" ? (health.model.metrics.test_roc_auc as number).toFixed(3) : "—"}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">LightGBM · live from API</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={240}>
              <div className="glass-royal-card interactive-press interactive-glow-cyan rounded-2xl p-3 border border-[#B48A28]/20 dark:border-[#D4AF37]/20 cursor-default h-full">
                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                  Columnar Engine
                </div>
                <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                  Sub-10ms
                </div>
                <div className="text-[10px] text-[#4F46E5] dark:text-[#A5F3FC]">Parquet catalogs</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={320}>
              <div className="glass-royal-card interactive-press interactive-glow-gold rounded-2xl p-3 border border-[#B48A28]/20 dark:border-[#D4AF37]/20 cursor-default h-full">
                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                  Archive Depth
                </div>
                <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                  12,800+
                </div>
                <div className="text-[10px] text-[#B48A28] dark:text-[#D4AF37]">NASA, TESS &amp; KOI Targets</div>
              </div>
            </ScrollReveal>
          </div>
        </ScrollReveal>
      </section>

      {/* 2. The Two Distinct Astronomy Projects (Services Breakdown) */}
      <section className="py-12 px-4 md:px-8 max-w-[1780px] mx-auto w-full space-y-8">
        <ScrollReveal direction="up" delay={0} className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#B48A28] dark:text-[#D4AF37]">
            <Layers className="size-3.5" /> DUAL PIPELINE ARCHITECTURE
          </div>
          <h2 className="font-serif text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
            Two Dedicated Astronomical Pipelines
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#CBD5E1]">
            Engineered to handle distinct astronomical regimes: all-sky infrared spectrophotometry and millimag transit light curve vetting.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Project 1: SPHEREx 102-Channel Spectrophotometry */}
          <ScrollReveal direction="left" delay={100} className="h-full">
            <div className="glass-royal-deck relative rounded-3xl p-6 sm:p-8 border border-amber-600/25 dark:border-amber-400/25 flex flex-col justify-between overflow-hidden group hover:border-[#3B82F6] dark:hover:border-[#408EC6] transition-all duration-300 h-full">
              <div className="reticle-bracket-tl" />
              <div className="reticle-bracket-br" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-[#3B82F6]/40 dark:border-[#408EC6]/40 bg-[#3B82F6]/10 text-[#3B82F6] dark:text-[#A5F3FC]">
                    PROJECT I // SPECTROPHOTOMETRY
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">0.75 - 5.0 μm</span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
                  <Radio className="size-6 text-[#3B82F6]" />
                  <span>SPHEREx 102-Channel Sky Explorer</span>
                </h3>

                <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                  Full-sky infrared spectral cubes delivering 102 contiguous spectrophotometric bands per pixel. Designed to map celestial water-ice features, polycyclic aromatic hydrocarbon (PAH) emissions, and stellar atmospheric signatures.
                </p>

                <div className="space-y-2 pt-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                    <div className="size-1.5 rounded-full bg-[#3B82F6]" />
                    <span>Integrated Aladin Lite v3 Pan-STARRS &amp; 2MASS celestial projection</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                    <div className="size-1.5 rounded-full bg-[#3B82F6]" />
                    <span>Real-time flux density and photometric covariance matrix estimation</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                    <div className="size-1.5 rounded-full bg-[#3B82F6]" />
                    <span>Sexagesimal coordinate targeting with synchronized crosshairs</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 relative z-10">
                <Link
                  href="/pipelines#spherex"
                  onClick={() => sfx.playSelect()}
                  className="interactive-press interactive-glow-cyan inline-flex items-center gap-2 text-xs font-serif font-bold tracking-wider px-5 py-2.5 rounded-xl bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 dark:bg-[#408EC6]/20 dark:hover:bg-[#408EC6]/30 text-[#1E1B4B] dark:text-[#A5F3FC] border border-[#3B82F6]/40 transition-all duration-200"
                >
                  <span>OPEN SPHEREx CONSOLE</span>
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Project 2: TESS / Kepler High-Precision Transit Vetting */}
          <ScrollReveal direction="right" delay={200} className="h-full">
            <div className="glass-royal-deck relative rounded-3xl p-6 sm:p-8 border border-amber-600/25 dark:border-amber-400/25 flex flex-col justify-between overflow-hidden group hover:border-[#4F46E5] dark:hover:border-[#7A2048] transition-all duration-300 h-full">
              <div className="reticle-bracket-tl" />
              <div className="reticle-bracket-br" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-[#4F46E5]/40 dark:border-[#5C1D42]/60 bg-[#DDD6FE]/30 dark:bg-[#5C1D42]/30 text-[#4F46E5] dark:text-[#E2E8F0]">
                    PROJECT II // TRANSIT VETTING
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">BLS + Columnar</span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
                  <Activity className="size-6 text-[#4F46E5] dark:text-purple-400" />
                  <span>TESS &amp; Kepler Transit Vetting Citadel</span>
                </h3>

                <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                  Sub-part-per-million phase-folded photometry vetting. Automated §1.3 centroid shift tripwire alerts flag background eclipsing binaries, accompanied by human-in-the-loop Active Learning triage backed by local Parquet catalogs and an SQLite review log.
                </p>

                <div className="space-y-2 pt-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                    <div className="size-1.5 rounded-full bg-[#4F46E5]" />
                    <span>Phase-folded Kepler &amp; TESS transit light curves with Mandel-Agol fit</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                    <div className="size-1.5 rounded-full bg-[#4F46E5]" />
                    <span>§1.3 Centroid Shift Quarantine Tripwire for binary contamination</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                    <div className="size-1.5 rounded-full bg-[#4F46E5]" />
                    <span>Active Learning human review panel with a persistent review log (SQLite)</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 relative z-10">
                <Link
                  href="/pipelines#tess-kepler"
                  onClick={() => sfx.playSelect()}
                  className="interactive-press interactive-glow-gold inline-flex items-center gap-2 text-xs font-serif font-bold tracking-wider px-5 py-2.5 rounded-xl bg-[#4F46E5]/15 hover:bg-[#4F46E5]/25 dark:bg-[#5C1D42]/30 dark:hover:bg-[#5C1D42]/45 text-[#1E1B4B] dark:text-[#E2E8F0] border border-[#4F46E5]/40 transition-all duration-200"
                >
                  <span>OPEN TRANSIT VETTING CONSOLE</span>
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 3. Interactive Orbital Telemetry Teaser */}
      <section className="py-12 px-4 md:px-8 max-w-[1780px] mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#B48A28] dark:bg-[#D4AF37] animate-pulse" />
              <h2 className="font-serif text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                Live Astrometric Dossier Preview
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#CBD5E1] font-mono mt-1">
              Select an orbital target to test live astrometric parameter inspection.
            </p>
          </div>

          {/* Quick Target Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {targets.slice(0, 8).map((t) => {
              const isSelected = t.id === selectedTarget.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTarget(t)}
                  className={`interactive-press flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 ${
                    isSelected
                      ? "bg-[#DDD6FE]/60 dark:bg-[#1E2761]/90 text-[#1E1B4B] dark:text-[#F8FAFC] border border-[#B48A28] dark:border-[#D4AF37] font-bold shadow-[0_0_12px_rgba(212,175,55,0.25)] scale-105"
                      : "bg-[#F1F5F9]/80 dark:bg-[#0D111E]/70 text-slate-600 dark:text-[#94A3B8] border border-slate-300 dark:border-slate-800 hover:border-[#B48A28]/50 dark:hover:border-[#D4AF37]/50 hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  <span className={`size-2 rounded-full ${isSelected ? "bg-[#B48A28] dark:bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,1)]" : "bg-slate-400"}`} />
                  <span>{t.alias}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Target Dossier Pods */}
        <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/25 dark:border-amber-400/25 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-2xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                  {selectedTarget.alias}
                </h3>
                <span className="font-mono text-sm text-[#3B82F6] dark:text-[#A5F3FC]">
                  ({selectedTarget.id})
                </span>
                <StatusBadge status={selectedTarget.statusBadge} />
              </div>
              <p className="font-mono text-xs text-slate-600 dark:text-[#94A3B8] mt-1">
                Catalog: <strong>{selectedTarget.catalog}</strong> &bull; Host: <strong>{selectedTarget.hostKey}</strong> &bull; Coordinates:{" "}
                <strong className="text-[#B48A28] dark:text-[#D4AF37]">
                  {formatRaDec(selectedTarget.ra, selectedTarget.dec)}
                </strong>
              </p>
            </div>

            <Link
              href="/pipelines"
              onClick={() => sfx.playSelect()}
              className="interactive-press interactive-glow-gold inline-flex items-center gap-2 rounded-xl border border-[#B48A28]/40 dark:border-[#D4AF37]/40 bg-[#FAF9F6]/80 dark:bg-[#1E2761]/40 hover:bg-[#DDD6FE]/30 text-xs font-serif font-bold text-[#1E1B4B] dark:text-[#E2E8F0] px-4 py-2 transition-all duration-200"
            >
              <span>VET IN FULL PIPELINE</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="glass-royal-card interactive-press interactive-glow-gold rounded-2xl p-4 border border-amber-600/20 dark:border-amber-400/20 cursor-default">
              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                Orbital Period
              </span>
              <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC] mt-1">
                {fmt(selectedTarget.periodDays, 3)} <span className="text-xs font-mono font-normal">days</span>
              </div>
            </div>

            <div className="glass-royal-card interactive-press interactive-glow-cyan rounded-2xl p-4 border border-amber-600/20 dark:border-amber-400/20 cursor-default">
              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                Planet Radius
              </span>
              <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC] mt-1">
                {fmt(selectedTarget.radiusEarth, 2)} <span className="text-xs font-mono font-normal">R⊕</span>
              </div>
            </div>

            <div className="glass-royal-card interactive-press interactive-glow-gold rounded-2xl p-4 border border-amber-600/20 dark:border-amber-400/20 cursor-default">
              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                Insolation Flux
              </span>
              <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC] mt-1">
                {fmt(selectedTarget.insolationEarth, 2)} <span className="text-xs font-mono font-normal">S⊕</span>
              </div>
            </div>

            <div className="glass-royal-card rounded-2xl p-4 border border-amber-600/20 dark:border-amber-400/20">
              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-sans font-semibold">
                Stellar Teff
              </span>
              <div className="text-xl font-serif font-black text-[#1E1B4B] dark:text-[#F8FAFC] mt-1">
                {fmtInt(selectedTarget.teffKelvin)} <span className="text-xs font-mono font-normal">K</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Explainable AI & Notion Breakdown Spotlight */}
      <section className="py-12 px-4 md:px-8 max-w-[1780px] mx-auto w-full">
        <div className="glass-royal-deck rounded-3xl p-8 border border-amber-600/30 dark:border-amber-400/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300">
              EXPLAINABLE AI ENGINE
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
              Deep SHAP Feature Attribution &amp; Knowledge Base
            </h2>
            <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
              Explore how the LightGBM vetting model breaks down every decision into interpretable Shapley values. Read our detailed Notion-style scientific breakdown of transit depth, orbital stability, centroid shifts, and stellar gravity.
            </p>
          </div>

          <Link
            href="/shap"
            onClick={() => sfx.playSelect()}
            className="sheen-sweep flex items-center gap-2 rounded-2xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#6D28D9] to-[#4F46E5] text-white px-6 py-3.5 font-serif text-sm font-bold tracking-wider hover:scale-105 transition-all duration-200 active:scale-95 shadow-lg shrink-0"
          >
            <BarChart3 className="size-4 text-[#A5F3FC]" />
            <span>OPEN SHAP KNOWLEDGE NOTION</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
