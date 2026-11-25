"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import Script from "next/script";
import { TransitPoint } from "@/lib/types";
import { Activity, Radio, Play, Pause, RotateCcw } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { sfx } from "@/lib/audio-sfx";

interface PlotlyChartProps {
  targetId: string;
  mode: "spectrum" | "transit";
  wavelengths?: number[];
  fluxes?: number[];
  errors?: number[];
  transitPoints?: TransitPoint[];
  periodDays?: number;
  depthPpm?: number;
}

declare global {
  interface Window {
    Plotly: {
      newPlot: (
        element: HTMLElement,
        data: unknown[],
        layout: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => void;
      react: (
        element: HTMLElement,
        data: unknown[],
        layout: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => void;
    };
  }
}

export function PlotlyChart({
  targetId,
  mode,
  wavelengths = [],
  fluxes = [],
  errors = [],
  transitPoints = [],
  periodDays = 1.0,
  depthPpm = 1000,
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme !== "light"; // "jungo" (default) is a dark theme too

  // Phase animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  const renderPlot = useCallback(() => {
    if (!window.Plotly || !containerRef.current) return;

    // Royal Cosmic Palette Colors (Starlight & Marble in Light | Deep Space Void in Dark)
    const textColor = isDark ? "#E2E8F0" : "#1E1B4B"; // Starlight Silver / Deep Royal Indigo
    const gridColor = isDark ? "rgba(226, 232, 240, 0.08)" : "rgba(30, 27, 75, 0.06)";
    const zeroLineColor = isDark ? "rgba(212, 175, 55, 0.3)" : "rgba(180, 138, 40, 0.35)"; // Burnished Gold zero line
    const primaryLineColor = isDark ? "#A5F3FC" : "#3B82F6"; // Astral Cyan / Cosmic Cobalt
    const markerColor = isDark ? "#D4AF37" : "#B48A28"; // Crown Champagne Gold / Antique Burnished Gold

    if (mode === "spectrum" && wavelengths.length === 0) {
      window.Plotly.react(containerRef.current, [], {
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        xaxis: { visible: false }, yaxis: { visible: false },
        annotations: [{ text: "No SPHEREx spectrum loaded for this target", showarrow: false, xref: "paper", yref: "paper", x: 0.5, y: 0.5,
          font: { color: textColor, size: 13, family: "var(--font-mono), monospace" } }],
      }, { responsive: true, displayModeBar: false });
      return;
    }

    if (mode === "spectrum") {
      const trace = {
        x: wavelengths,
        y: fluxes,
        error_y: {
          type: "data",
          array: errors,
          visible: true,
          color: isDark ? "rgba(165, 243, 252, 0.4)" : "rgba(59, 130, 246, 0.35)",
          thickness: 1,
          width: 2,
        },
        type: "scatter",
        mode: "lines+markers",
        name: "SPHEREx Calibrated Flux",
        line: { color: primaryLineColor, width: 2.2 },
        marker: { size: 4, color: markerColor },
        hovertemplate:
          "<b>λ:</b> %{x:.3f} µm<br><b>Flux:</b> %{y:.2f} mJy<br><b>±σ:</b> %{error_y.array:.2f}<extra></extra>",
      };

      const layout = {
        margin: { l: 55, r: 25, t: 25, b: 45 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "var(--font-mono), monospace", color: textColor, size: 11 },
        xaxis: {
          title: `Wavelength λ (µm) — 102 Spectral Channels [${targetId}]`,
          gridcolor: gridColor,
          zerolinecolor: zeroLineColor,
          tickcolor: gridColor,
        },
        yaxis: {
          title: "Flux Density F_λ (mJy)",
          gridcolor: gridColor,
          zerolinecolor: zeroLineColor,
          tickcolor: gridColor,
        },
        shapes: [
          {
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: 3.27,
            x1: 3.37,
            y0: 0,
            y1: 1,
            fillcolor: isDark ? "rgba(212, 175, 55, 0.18)" : "rgba(180, 138, 40, 0.14)",
            line: { color: isDark ? "rgba(212, 175, 55, 0.7)" : "rgba(180, 138, 40, 0.7)", width: 1.5, dash: "dot" },
          },
        ],
        annotations: [
          {
            x: 3.32,
            y: 0.95,
            yref: "paper",
            text: "PAH 3.32 µm EMISSION",
            showarrow: false,
            font: { color: isDark ? "#D4AF37" : "#B48A28", size: 10, family: "var(--font-mono), monospace", weight: 700 },
            bgcolor: isDark ? "rgba(13, 17, 30, 0.9)" : "#FAF9F6",
            bordercolor: isDark ? "rgba(212, 175, 55, 0.5)" : "rgba(180, 138, 40, 0.5)",
            borderwidth: 1,
          },
        ],
        hoverlabel: {
          bgcolor: isDark ? "#090A0F" : "#FAF9F6",
          bordercolor: isDark ? "#D4AF37" : "#B48A28",
          font: { family: "var(--font-mono), monospace", color: isDark ? "#E2E8F0" : "#1E1B4B", size: 11 },
        },
      };

      window.Plotly.react(containerRef.current, [trace], layout, {
        responsive: true,
        displayModeBar: false,
      });
    } else {
      const phases = transitPoints.map((p) => p.phase);
      const obsFluxes = transitPoints.map((p) => p.flux);
      const modelFluxes = transitPoints.map((p) => p.model);

      const obsTrace = {
        x: phases,
        y: obsFluxes,
        type: "scatter",
        mode: "markers",
        name: "Photometric Observations",
        marker: { size: 4, color: isDark ? "#6EE7B7" : "#4F46E5", opacity: 0.75 }, // Electric Periwinkle
        hovertemplate: "<b>Phase Φ:</b> %{x:.4f}<br><b>Rel. Flux:</b> %{y:.5f}<extra></extra>",
      };

      const modelTrace = {
        x: phases,
        y: modelFluxes,
        type: "scatter",
        mode: "lines",
        name: "Mandel-Agol Limb-Darkened Fit",
        line: { color: isDark ? "#7A2048" : "#6D28D9", width: 2.5 }, // Dusty Amethyst
        hoverinfo: "skip",
      };

      // Current animated scrubber marker trace
      const activePoint = transitPoints[activePhaseIndex] || transitPoints[0];
      const scrubberTrace = {
        x: activePoint ? [activePoint.phase] : [0],
        y: activePoint ? [activePoint.model] : [1],
        type: "scatter",
        mode: "markers",
        name: "Transit Phase Scan",
        marker: { size: 13, color: isDark ? "#D4AF37" : "#B48A28", symbol: "diamond", line: { width: 2, color: "#ffffff" } },
        hoverinfo: "skip",
      };

      const layout = {
        margin: { l: 65, r: 25, t: 25, b: 45 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "var(--font-mono), monospace", color: textColor, size: 11 },
        xaxis: {
          title: `Orbital Phase Φ (P = ${periodDays.toFixed(3)} d) [${targetId}]`,
          gridcolor: gridColor,
          zerolinecolor: zeroLineColor,
          tickcolor: gridColor,
        },
        yaxis: {
          title: "Relative Normalized Flux",
          gridcolor: gridColor,
          zerolinecolor: zeroLineColor,
          tickcolor: gridColor,
        },
        annotations: [
          {
            x: 0,
            y: 0.05,
            yref: "paper",
            text: `Transit Depth: ${depthPpm.toLocaleString()} ppm`,
            showarrow: false,
            font: { color: isDark ? "#D4AF37" : "#B48A28", size: 10, family: "var(--font-mono), monospace", weight: 700 },
            bgcolor: isDark ? "rgba(13, 17, 30, 0.9)" : "#FAF9F6",
            bordercolor: isDark ? "rgba(212, 175, 55, 0.4)" : "rgba(180, 138, 40, 0.4)",
            borderwidth: 1,
          },
        ],
        legend: {
          x: 0.02,
          y: 0.05,
          bgcolor: isDark ? "rgba(13, 17, 30, 0.75)" : "rgba(250, 249, 246, 0.88)",
          font: { color: textColor, size: 10 },
        },
        hoverlabel: {
          bgcolor: isDark ? "#090A0F" : "#FAF9F6",
          bordercolor: isDark ? "#D4AF37" : "#B48A28",
          font: { family: "var(--font-mono), monospace", color: isDark ? "#E2E8F0" : "#1E1B4B", size: 11 },
        },
      };

      window.Plotly.react(containerRef.current, [obsTrace, modelTrace, scrubberTrace], layout, {
        responsive: true,
        displayModeBar: false,
      });
    }
  }, [activePhaseIndex, depthPpm, errors, fluxes, isDark, mode, periodDays, targetId, transitPoints, wavelengths]);

  // Handle transit animation playback
  useEffect(() => {
    if (!isPlaying || mode !== "transit" || !transitPoints.length) return;

    const interval = setInterval(() => {
      setActivePhaseIndex((prev) => (prev + 1) % transitPoints.length);
    }, 60);

    return () => clearInterval(interval);
  }, [isPlaying, mode, transitPoints.length]);

  useEffect(() => {
    if (window.Plotly) {
      renderPlot();
    }
  }, [renderPlot]);

  return (
    <div className="glass-royal-card relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-br" />

      <Script
        src="https://cdn.plot.ly/plotly-2.35.2.min.js"
        strategy="lazyOnload"
        onReady={renderPlot}
      />

      <div className="flex items-center justify-between border-b border-amber-400/15 dark:border-amber-400/15 bg-white/40 dark:bg-[#0E1322]/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-500 dark:text-amber-300">
            {mode === "spectrum" ? (
              <Radio className="size-3.5 animate-pulse" />
            ) : (
              <Activity className="size-3.5 animate-pulse" />
            )}
          </div>
          <div>
            <span className="font-serif font-bold tracking-wider text-slate-900 dark:text-[#E2E8F0]">
              {mode === "spectrum"
                ? "SPHEREx 102-CHANNEL SPECTROPHOTOMETRY"
                : "PHASE-FOLDED TRANSIT PHOTOMETRY"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "transit" && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                onClick={() => {
                  sfx.playClick();
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10.5px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/50 hover:bg-amber-500/25 active:scale-95 transition-all shadow-sm"
              >
                {isPlaying ? <Pause className="size-3 text-amber-400" /> : <Play className="size-3 text-amber-400 fill-current" />}
                <span>{isPlaying ? "PAUSE SCAN" : "SIMULATE ORBIT"}</span>
              </button>
              <button
                onClick={() => {
                  sfx.playClick(600);
                  setActivePhaseIndex(0);
                }}
                title="Reset Phase Orbit"
                className="p-1 rounded-lg hover:bg-amber-400/20 text-slate-500 dark:text-slate-400 hover:text-amber-300 active:scale-90"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          )}

          <span className="font-mono text-[10.5px] text-amber-600 dark:text-amber-300/80 hidden sm:inline font-semibold">
            {mode === "spectrum" ? "λ: 0.75 µm — 5.00 µm" : `P = ${periodDays.toFixed(3)} d`}
          </span>
        </div>
      </div>

      <div className="relative h-[360px] w-full bg-white/40 dark:bg-[#070912]/80 transition-colors duration-300">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
