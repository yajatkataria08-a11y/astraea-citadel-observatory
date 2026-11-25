"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MOCK_TARGETS } from "@/lib/mock-astro-data";
import { useTargets } from "@/lib/hooks";
import { TargetRecord } from "@/lib/types";
const ShapWaterfall = dynamic(() => import("@/components/astronomy/ShapWaterfall").then((m) => m.ShapWaterfall), {
  ssr: false,
  loading: () => <div className="glass-royal-card rounded-2xl min-h-[420px] animate-pulse" aria-hidden />,
});
import { StatusBadge } from "@/components/ui/StatusBadge";
import { sfx } from "@/lib/audio-sfx";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from "lucide-react";

export default function ShapExplainabilityPage() {
  const [selectedTarget, setSelectedTarget] = useState<TargetRecord>(MOCK_TARGETS[0]);
  const { targets, source } = useTargets(60);
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

  const positiveDrivers = selectedTarget.shapDrivers.filter((d) => d.impact > 0);
  const negativeDrivers = selectedTarget.shapDrivers.filter((d) => d.impact < 0);

  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      
      {/* 1. Header & Breadcrumb Hero */}
      <ScrollReveal direction="down" duration={650}>
      <section className="pt-8 pb-6 px-4 md:px-8 max-w-[1780px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-amber-600/20 dark:border-amber-400/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                EXPLAINABLE AI ENGINE (XAI)
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">
                LIGHTGBM FEATURE ATTRIBUTION
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
              SHAP Score Attribution &amp; Astronomical Knowledge Notion
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1]">
              Mathematical breakdown of Shapley value feature contributions with detailed astrophysical derivations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={selectedTarget.statusBadge} />
            <div className="glass-royal-card px-3 py-1.5 rounded-xl border border-amber-600/25 dark:border-amber-400/20 font-mono text-xs text-slate-600 dark:text-[#CBD5E1]">
              Neural Vetting Score:{" "}
              <strong className="text-lg text-[#3B82F6] dark:text-[#A5F3FC]">
                {(selectedTarget.vettingScore * 100).toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>

        {/* Target Switcher Strip */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[10.5px] font-mono font-bold tracking-widest uppercase text-[#B48A28] dark:text-[#D4AF37] flex items-center gap-1.5 shrink-0">
            <Compass className="size-3 text-[#B48A28] dark:text-[#D4AF37]" />
            EXAMINE TARGET:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {targets.slice(0, 8).map((t) => {
              const isSelected = t.id === selectedTarget.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTarget(t)}
                  className={`interactive-press flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 shrink-0 ${
                    isSelected
                      ? "bg-[#DDD6FE]/60 dark:bg-[#1E2761]/90 text-[#1E1B4B] dark:text-[#F8FAFC] border border-[#B48A28] dark:border-[#D4AF37] font-bold shadow-[0_0_12px_rgba(212,175,55,0.25)] scale-105"
                      : "bg-[#F1F5F9]/80 dark:bg-[#0E1322]/60 text-slate-700 dark:text-[#94A3B8] border border-slate-300 dark:border-slate-800 hover:border-[#B48A28]/50 dark:hover:border-[#D4AF37]/50 hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  <span className={`size-2 rounded-full ${isSelected ? "bg-[#B48A28] dark:bg-[#D4AF37]" : "bg-slate-400"}`} />
                  <span>{t.alias}</span>
                  <span className="text-[9.5px] opacity-60">[{t.catalog}]</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* 2. Interactive SHAP Waterfall & Summary Drivers */}
      <main className="p-4 md:px-8 space-y-12 max-w-[1780px] mx-auto w-full pb-16">
        
        {/* Waterfall Container */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
              <BarChart3 className="size-5 text-[#3B82F6]" />
              <span>I. Active SHAP Waterfall Contribution Chart</span>
            </h2>
            <span className="font-mono text-xs text-slate-500 dark:text-[#94A3B8]">
              Baseline E[f(x)] = {(selectedTarget.shapBaseline ?? 0.5).toFixed(3)} &rarr; Target f(x) = {selectedTarget.vettingScore.toFixed(3)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: D3.js Waterfall Chart */}
            <div className="lg:col-span-2">
              <ShapWaterfall
                drivers={selectedTarget.shapDrivers}
                vettingScore={selectedTarget.vettingScore}
              />
            </div>

            {/* Right Col: Driver Summary Cards */}
            <div className="space-y-4 font-mono text-xs">
              {/* Positive Drivers */}
              <div className="glass-royal-card rounded-2xl p-4 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-serif font-bold text-sm">
                  <CheckCircle2 className="size-4" />
                  <span>Positive Planetary Drivers ({positiveDrivers.length})</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] font-sans">
                  Astrophysical attributes pulling the neural model toward planet confirmation.
                </p>
                <div className="space-y-1.5 pt-1">
                  {positiveDrivers.map((d) => (
                    <div key={d.feature} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="font-semibold text-slate-800 dark:text-[#E2E8F0]">{d.feature}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{d.impact.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Drivers */}
              <div className="glass-royal-card rounded-2xl p-4 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-serif font-bold text-sm">
                  <AlertTriangle className="size-4" />
                  <span>Negative Penalty Drivers ({negativeDrivers.length})</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] font-sans">
                  Attributes reducing model confidence, indicating potential binary stars or instrumental noise.
                </p>
                <div className="space-y-1.5 pt-1">
                  {negativeDrivers.map((d) => (
                    <div key={d.feature} className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <span className="font-semibold text-slate-800 dark:text-[#E2E8F0]">{d.feature}</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{d.impact.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Detailed Notion Knowledge Base */}
        <section id="drivers" className="scroll-mt-24 space-y-6">
          <div className="border-b border-amber-600/25 dark:border-amber-400/20 pb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#B48A28] dark:text-[#D4AF37] mb-1">
              <BookOpen className="size-3.5" /> SCIENTIFIC COMPENDIUM
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
              Detailed Notion: Astronomical Feature Specifications
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] font-sans max-w-3xl mt-1">
              In-depth technical breakdown of every LightGBM feature vector, underlying physics principles, mathematical formulations, and failure modes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Notion Card 1: Transit Depth */}
            <div className="glass-royal-card rounded-2xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-[#A5F3FC] border border-blue-500/30 font-bold">
                  VECTOR // 01
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">ppm / fractional flux</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                1. Transit Depth (&delta;) &amp; Planet-to-Star Radius Ratio
              </h3>

              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#070912]/80 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC]">
                {"\u03B4 = \u0394F / F \u2248 (R_p / R_\u22C6)\u00B2 = (R_p / R_\u2299)\u00B2 \u00D7 (R_\u2299 / R_\u22C6)\u00B2"}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-sans">
                <p>
                  <strong>Physical Meaning:</strong> The fractional decrease in observed stellar flux when the companion transits across the stellar disk. Under the assumption of uniform stellar surface brightness (or after limb-darkening correction), the depth equals the geometric area ratio.
                </p>
                <p>
                  <strong>Diagnostic Limits:</strong> Earth-sized planets around Solar-type stars produce depths of &approx; 84 ppm. Jupiter-sized gas giants produce depths of &approx; 10,000 ppm = 1%. Depths exceeding 2.5% strongly indicate a stellar companion (eclipsing binary) rather than an exoplanet.
                </p>
                <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  SHAP Contribution: High positive weights for depths between 50 ppm and 12,000 ppm corresponding to terrestrial to Jovian radii.
                </p>
              </div>
            </div>

            {/* Notion Card 2: §1.3 Centroid Shift Tripwire */}
            <div className="glass-royal-card rounded-2xl p-6 border border-rose-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold">
                  TRIPWIRE // 02
                </span>
                <span className="text-xs font-mono text-rose-500">&sect;1.3 Quarantine</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                2. &sect;1.3 Centroid Shift Tripwire (&Delta;x_cen)
              </h3>

              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#070912]/80 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC]">
                {"\u0394x_cen = x_diff - x_star = [\u2211 (I_out - I_in) x_i] / [\u2211 (I_out - I_in)] - x_star"}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-sans">
                <p>
                  <strong>Physical Meaning:</strong> Difference image analysis compares the center of light during the transit dip against the out-of-transit stellar coordinates. If the light loss originates from an unresolved faint background star (Background Eclipsing Binary or BEB), the difference image centroid shifts significantly away from the primary star.
                </p>
                <p>
                  <strong>Diagnostic Limits:</strong> If |&Delta;x| &gt; 3.0 &sigma;_cen (typically &gt; 0.5 pixels in Kepler or &gt; 0.2 pixels in TESS), the pipeline flags the target for automatic quarantine.
                </p>
                <p className="text-[11px] font-mono text-rose-700 dark:text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  SHAP Contribution: Heaviest negative penalty in LightGBM. A centroid offset of 3.5&sigma; drops vetting scores by -0.450 to -0.600.
                </p>
              </div>
            </div>

            {/* Notion Card 3: Orbital Period & Stability */}
            <div className="glass-royal-card rounded-2xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-[#A5F3FC] border border-purple-500/30 font-bold">
                  VECTOR // 03
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">days / Keplerian</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                3. Orbital Period (P) &amp; Geometric Transit Probability
              </h3>

              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#070912]/80 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC]">
                {"a = [G M_\u22C6 P\u00B2 / (4\u03C0\u00B2)]^(1/3),    p_transit \u2248 (R_\u22C6 + R_p) / [a (1 - e\u00B2)]"}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-sans">
                <p>
                  <strong>Physical Meaning:</strong> Semi-major axis (a) determined strictly by Kepler&apos;s Third Law given the stellar mass estimate (M_star). The geometric probability of transit alignment drops inversely with distance (1/a).
                </p>
                <p>
                  <strong>Diagnostic Limits:</strong> Ultra-short period planets (P &lt; 1 day) undergo intense tidal dissipation and Roche lobe proximity. Long-period candidates (P &gt; 100 days) require multi-year baselines to verify periodicity without aliasing.
                </p>
                <p className="text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                  SHAP Contribution: Stable multi-epoch periods with at least 3 distinct transits yield high confidence boosts (+0.120).
                </p>
              </div>
            </div>

            {/* Notion Card 4: Secondary Eclipse Depth */}
            <div className="glass-royal-card rounded-2xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-[#A5F3FC] border border-cyan-500/30 font-bold">
                  VECTOR // 04
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">phase 0.5 occultation</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                4. Secondary Eclipse Depth (&delta;_sec) Test
              </h3>

              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#070912]/80 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC]">
                {"\u03B4_sec = (R_p / R_\u22C6)\u00B2 \u00D7 [B_\u03BD(T_day) / B_\u03BD(T_\u22C6)] + A_g (R_p / a)\u00B2"}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-sans">
                <p>
                  <strong>Physical Meaning:</strong> At phase 0.5 (or shifted by eccentricity), the companion passes behind the host star. For true planets, this optical depth is virtually zero (&lt; 10 ppm). If a deep occultation is detected (&gt; 200 ppm), the secondary body is luminous—confirming an eclipsing binary.
                </p>
                <p>
                  <strong>Diagnostic Limits:</strong> A secondary eclipse greater than 10% of primary transit depth triggers an immediate False Positive flag.
                </p>
                <p className="text-[11px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                  SHAP Contribution: Non-detection of a secondary eclipse confirms dark planetary companion nature (+0.180).
                </p>
              </div>
            </div>

            {/* Notion Card 5: Odd-Even Transit Depth Consistency */}
            <div className="glass-royal-card rounded-2xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  VECTOR // 05
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">Student&apos;s t-test</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                5. Odd-Even Transit Depth Consistency (t_stat)
              </h3>

              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#070912]/80 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC]">
                {"t_stat = (\u03B4_odd - \u03B4_even) / \u221A(\u03C3_odd\u00B2 / N_odd + \u03C3_even\u00B2 / N_even)"}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-sans">
                <p>
                  <strong>Physical Meaning:</strong> If an eclipsing binary has identical primary and secondary stars or is folded at half the true orbital period, the odd and even transits represent two different stars occulting each other, yielding unequal depths.
                </p>
                <p>
                  <strong>Diagnostic Limits:</strong> If |t_stat| &gt; 3.0, the depths differ at &gt; 99.7% significance, indicating an eclipsing binary system.
                </p>
                <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  SHAP Contribution: High consistency (|t| &lt; 1.0) contributes +0.145 to planet probability.
                </p>
              </div>
            </div>

            {/* Notion Card 6: Transit Signal-to-Noise Ratio (MES) */}
            <div className="glass-royal-card rounded-2xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-[#A5F3FC] border border-amber-500/30 font-bold">
                  VECTOR // 06
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">MES &sigma;</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                6. Multiple Event Statistic (MES / SNR)
              </h3>

              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#070912]/80 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC]">
                {"MES = (\u03B4 / \u03C3_CDPP) \u00D7 \u221A[N_transits \u00D7 (T_duration / \u0394t_cadence)]"}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed font-sans">
                <p>
                  <strong>Physical Meaning:</strong> Combined Photometric Precision (CDPP) across the folded transit duration. Quantifies whether the transit signal stands out above photon noise and stellar granulation.
                </p>
                <p>
                  <strong>Diagnostic Limits:</strong> NASA Kepler &amp; TESS standards require MES &ge; 7.1&sigma; for a signal to be admitted into the TCE (Threshold Crossing Event) pipeline.
                </p>
                <p className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  SHAP Contribution: Strong correlation above 15&sigma; guarantees robust planetary vetting (+0.210).
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
