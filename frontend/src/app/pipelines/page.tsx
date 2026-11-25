"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MOCK_TARGETS } from "@/lib/mock-astro-data";
import { useTargets } from "@/lib/hooks";
import { api } from "@/lib/api-client";
import { TargetRecord } from "@/lib/types";
import { formatRaDec } from "@/lib/utils";
function PanelSkeleton() {
  return <div className="glass-royal-card rounded-2xl min-h-[320px] animate-pulse" aria-hidden />;
}

const AladinSkyMap = dynamic(() => import("@/components/astronomy/AladinSkyMap").then((m) => m.AladinSkyMap), { ssr: false, loading: () => <PanelSkeleton /> });
const PlotlyChart = dynamic(() => import("@/components/astronomy/PlotlyChart").then((m) => m.PlotlyChart), { ssr: false, loading: () => <PanelSkeleton /> });
const TriagePanel = dynamic(() => import("@/components/astronomy/TriagePanel").then((m) => m.TriagePanel), { ssr: false, loading: () => <PanelSkeleton /> });
const CatalogExplorer = dynamic(() => import("@/components/astronomy/CatalogExplorer").then((m) => m.CatalogExplorer), { ssr: false, loading: () => <PanelSkeleton /> });
const BatchScanModal = dynamic(() => import("@/components/astronomy/BatchScanModal").then((m) => m.BatchScanModal), { ssr: false });
import { StatusBadge } from "@/components/ui/StatusBadge";
import { sfx } from "@/lib/audio-sfx";
import { Compass, ShieldAlert, UploadCloud, Database } from "lucide-react";

export default function PipelinesPage() {
  const { targets, setTargets, source, total } = useTargets(120);
  const [selectedTarget, setSelectedTarget] = useState<TargetRecord>(MOCK_TARGETS[0]);
  useEffect(() => {
    if (source === "api" && targets.length > 0 && !targets.some((t) => t.id === selectedTarget.id)) {
      setSelectedTarget(targets[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, targets]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const handleUpdateVerdict = (verdict: "CONFIRMED" | "BOGUS" | "UNRESOLVED", notes: string) => {
    const updated = targets.map((t) => {
      if (t.id === selectedTarget.id) {
        return {
          ...t,
          humanVerdict: verdict,
          triageNotes: notes,
          statusBadge:
            verdict === "CONFIRMED"
              ? ("CONFIRMED_PLANET" as const)
              : verdict === "BOGUS"
              ? ("FALSE_POSITIVE" as const)
              : t.statusBadge,
        };
      }
      return t;
    });
    setTargets(updated);
    // persist to the backend review log (reviewer comes from the bearer token; guests are logged as guest)
    api.postVerdict(selectedTarget.id, verdict, notes).catch(() => {});
    const active = updated.find((t) => t.id === selectedTarget.id);
    if (active) setSelectedTarget(active);
  };

  const selectTargetWithAudio = (t: TargetRecord) => {
    sfx.playSelect();
    setSelectedTarget(t);
  };

  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      
      {/* Top Header / Breadcrumb Hero */}
      <section className="pt-8 pb-6 px-4 md:px-8 max-w-[1780px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-amber-600/20 dark:border-amber-400/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-[#B48A28] dark:text-[#D4AF37]">
                ASTRONOMICAL CORE
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">
                2 INDEPENDENT SCIENTIFIC PIPELINES
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
              Observatory Pipelines &amp; Workflows
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1]">
              Switch between SPHEREx infrared spectrophotometry and high-cadence TESS transit vetting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sfx.playSelect();
                setIsBatchModalOpen(true);
              }}
              className="sheen-sweep interactive-press interactive-glow-cyan relative flex items-center gap-2 rounded-xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#1E1B4B] to-[#3B82F6] dark:from-[#2E4A9E] dark:to-[#7A2048] text-white px-4 py-2 font-serif text-xs font-bold tracking-wider shadow-md transition-all"
            >
              <UploadCloud className="size-4 text-[#A5F3FC]" />
              <span>RUN BATCH CATALOG SCAN</span>
            </button>
          </div>
        </div>

        {/* Global Target Switcher Strip */}
        <div className="mt-4 flex items-center justify-between gap-3 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10.5px] font-mono font-bold tracking-widest uppercase text-[#B48A28] dark:text-[#D4AF37] flex items-center gap-1.5 shrink-0">
              <Compass className="size-3 text-[#B48A28] dark:text-[#D4AF37]" />
              ACTIVE TARGET:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {targets.map((t) => {
                const isSelected = t.id === selectedTarget.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTargetWithAudio(t)}
                    className={`interactive-press group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 shrink-0 ${
                      isSelected
                        ? "bg-[#DDD6FE]/60 dark:bg-[#1E2761]/90 text-[#1E1B4B] dark:text-[#F8FAFC] border border-[#B48A28] dark:border-[#D4AF37] shadow-[0_0_15px_rgba(180,138,40,0.25)] font-bold scale-105"
                        : "bg-[#F1F5F9]/80 dark:bg-[#0E1322]/60 text-slate-700 dark:text-[#94A3B8] hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC] border border-slate-300 dark:border-slate-800 hover:border-[#B48A28]/40 dark:hover:border-[#D4AF37]/40 hover:shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        isSelected
                          ? "bg-[#B48A28] dark:bg-[#D4AF37] shadow-[0_0_8px_rgba(180,138,40,1)] dark:shadow-[0_0_8px_rgba(212,175,55,1)]"
                          : "bg-slate-400 group-hover:bg-[#B48A28]"
                      }`}
                    />
                    <span className="font-serif">{t.alias}</span>
                    <span className="text-[9.5px] opacity-60">[{t.catalog}]</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-[#94A3B8]">
            <span>Coordinates:</span>
            <strong className="text-[#B48A28] dark:text-[#D4AF37]">
              {formatRaDec(selectedTarget.ra, selectedTarget.dec)}
            </strong>
          </div>
        </div>
      </section>

      {/* Main Content Areas */}
      <main className="p-4 md:px-8 space-y-12 max-w-[1780px] mx-auto w-full pb-16">
        
        {/* ========================================================================= */}
        {/* PROJECT 1: SPHEREx 102-Channel Spectrophotometry Sky Engine */}
        {/* ========================================================================= */}
        <section id="spherex" className="scroll-mt-24 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3B82F6]/30 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,1)]" />
                <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
                  <span>PROJECT I // SPHEREx 102-Channel Spectrophotometry</span>
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#CBD5E1] font-mono mt-0.5">
                Infrared Spectral Cubes (0.75 - 5.00 μm) &bull; Linear Variable Filter Spectroscopy &bull; Aladin Sky Map
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] dark:text-[#A5F3FC] border border-[#3B82F6]/30">
              Target: {selectedTarget.alias} ({selectedTarget.id})
            </span>
          </div>

          {/* Dual Visualizers: Aladin Sky Map + SPHEREx 102-Ch Spectrum */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AladinSkyMap
              ra={selectedTarget.ra}
              dec={selectedTarget.dec}
              targetId={selectedTarget.id}
              alias={selectedTarget.alias}
            />

            <PlotlyChart
              targetId={selectedTarget.id}
              mode="spectrum"
              wavelengths={selectedTarget.spectralWavelengths}
              fluxes={selectedTarget.spectralFluxes}
              errors={selectedTarget.spectralErrors}
              periodDays={selectedTarget.periodDays}
              depthPpm={selectedTarget.transitDepthPpm}
            />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PROJECT 2: TESS / Kepler High-Precision Transit Vetting & Archive */}
        {/* ========================================================================= */}
        <section id="tess-kepler" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#4F46E5]/30 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#4F46E5] shadow-[0_0_8px_rgba(79,70,229,1)]" />
                <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
                  <span>PROJECT II // TESS &amp; Kepler Transit Vetting Citadel</span>
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#CBD5E1] font-mono mt-0.5">
                Box Least Squares (BLS) &bull; §1.3 Centroid Shift Tripwire &bull; Active Learning Triage &bull; Parquet Archive
              </p>
            </div>
            <StatusBadge status={selectedTarget.statusBadge} />
          </div>

          {/* Anomaly Quarantine Diagnostic Alert Banner */}
          {selectedTarget.isQuarantined && selectedTarget.quarantineReason && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/50 bg-rose-50/90 dark:bg-rose-950/40 backdrop-blur-xl p-4 text-xs font-mono text-rose-900 dark:text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.18)]">
              <ShieldAlert className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <strong className="font-serif text-sm font-bold tracking-wider text-rose-700 dark:text-rose-300 uppercase mr-2">
                  PIPELINE QUARANTINE TRIPWIRE TRIGGERED (§1.3 CENTROID SHIFT):
                </strong>
                <span className="leading-relaxed font-sans">{selectedTarget.quarantineReason}</span>
              </div>
            </div>
          )}

          {/* Phase-Folded Transit Chart & Human-in-the-Loop Triage Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlotlyChart
              targetId={selectedTarget.id}
              mode="transit"
              transitPoints={selectedTarget.transitPoints}
              periodDays={selectedTarget.periodDays}
              depthPpm={selectedTarget.transitDepthPpm}
            />

            <TriagePanel
              target={selectedTarget}
              onUpdateVerdict={handleUpdateVerdict}
            />
          </div>

          {/* Multi-Catalog Parquet Archive */}
          <div id="archive" className="scroll-mt-24 space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
                <Database className="size-4 text-emerald-500" />
                <span>Multi-Catalog Parquet Archive</span>
              </h3>
              <span className="font-mono text-xs text-slate-500 dark:text-[#94A3B8]">
                {total.toLocaleString()} Real Targets in Parquet Database &bull; {targets.length} Loaded Active
              </span>
            </div>

            <CatalogExplorer
              targets={targets}
              selectedTargetId={selectedTarget.id}
              onSelectTarget={(target) => setSelectedTarget(target)}
            />
          </div>
        </section>
      </main>

      {/* Batch Scan Modal */}
      {isBatchModalOpen && (
      <BatchScanModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
      />
      )}
    </div>
  );
}

