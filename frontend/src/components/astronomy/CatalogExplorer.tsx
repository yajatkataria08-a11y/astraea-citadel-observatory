"use client";

import { fmt, fmtInt } from "@/lib/utils";
import React, { useState, useMemo, useCallback } from "react";
import { TargetRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Filter, Search, ChevronRight, XCircle, SortAsc } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";

interface CatalogExplorerProps {
  targets: TargetRecord[];
  selectedTargetId: string;
  onSelectTarget: (target: TargetRecord) => void;
}

export function CatalogExplorer({ targets, selectedTargetId, onSelectTarget }: CatalogExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBadge, setFilterBadge] = useState<string>("ALL");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredTargets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return targets.filter((t) => {
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.alias.toLowerCase().includes(q) ||
        t.catalog.toLowerCase().includes(q);
      const matchesBadge = filterBadge === "ALL" || t.statusBadge === filterBadge;
      return matchesSearch && matchesBadge;
    });
  }, [targets, searchTerm, filterBadge]);

  const filters = useMemo(() => {
    return [
      { id: "ALL", label: "ALL TARGETS", count: targets.length },
      { id: "CONFIRMED_PLANET", label: "PLANETS", count: targets.filter(t => t.statusBadge === "CONFIRMED_PLANET").length },
      { id: "QUARANTINED", label: "QUARANTINE", count: targets.filter(t => t.statusBadge === "QUARANTINED").length },
      { id: "FUOR_OUTBURST", label: "FUOR NOVAE", count: targets.filter(t => t.statusBadge === "FUOR_OUTBURST").length },
      { id: "CANDIDATE", label: "CANDIDATES", count: targets.filter(t => t.statusBadge === "CANDIDATE").length },
    ];
  }, [targets]);

  const handleSelect = useCallback((t: TargetRecord) => {
    sfx.playSelect();
    onSelectTarget(t);
  }, [onSelectTarget]);

  return (
    <div className="glass-royal-card relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-br" />

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-600/20 dark:border-amber-400/15 bg-[#F1F5F9]/80 dark:bg-[#0E1322]/90 p-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 size-4 text-[#B48A28] dark:text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Search TIC ID, KOI, TOI alias, coordinates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-[#070912]/90 pl-10 pr-9 py-2 text-xs font-mono text-[#1E1B4B] dark:text-[#F8FAFC] placeholder:text-slate-500 dark:placeholder:text-[#94A3B8] focus:border-[#B48A28] dark:focus:border-[#D4AF37] focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors"
            >
              <XCircle className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-wrap">
          <span className="text-[10.5px] font-sans font-bold text-[#1E1B4B] dark:text-[#E2E8F0] mr-1 flex items-center gap-1 shrink-0">
            <Filter className="size-3 text-[#B48A28] dark:text-[#D4AF37]" /> FILTER:
          </span>
          {filters.map((f) => {
            const isActive = filterBadge === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { sfx.playClick(940); setFilterBadge(f.id); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-mono font-bold transition-all duration-200 uppercase active:scale-95 shrink-0 shadow-sm ${
                  isActive
                    ? "bg-[#DDD6FE] dark:bg-[#1E2761] text-[#1E1B4B] dark:text-[#F8FAFC] border border-[#B48A28] dark:border-[#D4AF37] shadow-[0_0_12px_rgba(180,138,40,0.2)] font-black"
                    : "bg-white/80 dark:bg-[#0F1322]/70 text-slate-700 dark:text-[#CBD5E1] hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC] border border-slate-300 dark:border-slate-800"
                }`}
              >
                {f.label}
                <span className={`text-[9.5px] rounded-full px-1.5 py-0.5 ${isActive ? "bg-[#B48A28] text-white dark:bg-[#D4AF37]/30 dark:text-[#F8FAFC] font-black" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                  {f.count}
                </span>
              </button>
            );
          })}

          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-300 dark:border-slate-800">
            <SortAsc className="size-3.5 text-[#B48A28] dark:text-[#D4AF37]" />
            <span className="text-[10.5px] font-mono text-slate-600 dark:text-[#CBD5E1] font-medium">{filteredTargets.length} records</span>
          </div>
        </div>
      </div>

      {/* Catalog Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-slate-300 dark:border-slate-800 bg-[#EDEFF5]/90 dark:bg-[#0B0E14]/90 text-[10.5px] font-sans font-bold text-[#1E1B4B] dark:text-[#F8FAFC] uppercase tracking-wider select-none">
            <tr>
              <th className="py-3 px-4 font-serif">TARGET ID</th>
              <th className="py-3 px-3">DESIGNATION</th>
              <th className="py-3 px-3">CATALOG</th>
              <th className="py-3 px-3">RA / DEC (J2000)</th>
              <th className="py-3 px-3 text-right">PERIOD (d)</th>
              <th className="py-3 px-3 text-right">DEPTH (ppm)</th>
              <th className="py-3 px-3 text-right">RADIUS (R⊕)</th>
              <th className="py-3 px-3 text-right">VETTING PROB</th>
              <th className="py-3 px-3 text-center">STATUS</th>
              <th className="py-3 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-slate-200/80 dark:divide-slate-800/40">
            {filteredTargets.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="size-8 text-[#B48A28]/40" />
                    <p className="font-sans text-xs text-slate-600 dark:text-[#CBD5E1]">No celestial targets match query criteria.</p>
                    <button
                      onClick={() => { setSearchTerm(""); setFilterBadge("ALL"); }}
                      className="text-[11px] font-mono text-[#3B82F6] dark:text-[#A5F3FC] hover:underline font-bold"
                    >
                      Reset filter registry
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTargets.map((t) => {
                const isSelected = t.id === selectedTargetId;
                const isHovered = hoveredId === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    onMouseEnter={() => setHoveredId(t.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(t); } }}
                    className={`group cursor-pointer transition-colors duration-150 select-none ${
                      isSelected
                        ? "bg-[#DDD6FE]/40 dark:bg-[#1E2761]/70 border-l-4 border-l-[#B48A28] dark:border-l-[#D4AF37]"
                        : isHovered
                        ? "bg-slate-200/50 dark:bg-[#1E2761]/30"
                        : "hover:bg-slate-100/50 dark:hover:bg-[#12172A]/50"
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                      {t.id}
                    </td>
                    <td className="py-3 px-3 font-serif font-semibold text-[#1E1B4B] dark:text-[#F8FAFC]">
                      {t.alias}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-[#CBD5E1]">
                      {t.catalog}
                    </td>
                    <td className="py-3 px-3 text-[#B48A28] dark:text-[#D4AF37] font-semibold">
                      {fmt(t.ra, 3)}°, {t.dec > 0 ? "+" : ""}{fmt(t.dec, 3)}°
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 dark:text-[#E2E8F0]">
                      {fmt(t.periodDays, 3)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 dark:text-[#E2E8F0]">
                      {fmtInt(t.transitDepthPpm)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 dark:text-[#E2E8F0]">
                      {fmt(t.radiusEarth, 2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span className={t.vettingScore >= 0.8 ? "text-emerald-600 dark:text-emerald-400" : t.vettingScore >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>
                        {(t.vettingScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={t.statusBadge} />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <ChevronRight className={`size-4 text-[#B48A28] dark:text-[#D4AF37] transition-transform ${isSelected ? "translate-x-1" : "opacity-0 group-hover:opacity-100"}`} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
