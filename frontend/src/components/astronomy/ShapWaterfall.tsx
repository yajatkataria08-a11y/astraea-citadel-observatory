"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import "d3-transition"; // side-effect import: adds selection.transition (tree-shaking drops it with `import * as d3`)
import { ShapDriver } from "@/lib/types";
import { Cpu, Info, Zap } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { useTheme } from "@/lib/theme-provider";

interface ShapWaterfallProps {
  drivers: ShapDriver[];
  vettingScore: number;
}

export function ShapWaterfall({ drivers, vettingScore }: ShapWaterfallProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDriver, setActiveDriver] = useState<ShapDriver | null>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const { theme } = useTheme();
  const isDark = theme !== "light"; // "jungo" (default) is a dark theme too

  // Responsive width tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(Math.max(320, entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const renderChart = useCallback(() => {
    if (!svgRef.current || !drivers.length) return;

    const margin = { top: 25, right: 70, bottom: 25, left: Math.min(200, containerWidth * 0.32) };
    const totalWidth = containerWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = drivers.length * 38;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${totalWidth} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxAbs = Math.max(0.25, d3.max(drivers, (d) => Math.abs(d.impact)) || 0.4);
    const x = d3.scaleLinear().domain([-maxAbs * 1.25, maxAbs * 1.25]).range([0, width]);
    const y = d3.scaleBand().domain(drivers.map((d) => d.feature)).range([0, height]).padding(0.3);

    // Subtle background alternating bars (Soft Lavender Mist in light mode)
    g.selectAll(".row-bg")
      .data(drivers)
      .enter()
      .append("rect")
      .attr("x", -margin.left + 10)
      .attr("y", (d) => y(d.feature)!)
      .attr("width", width + margin.left + margin.right - 20)
      .attr("height", y.bandwidth())
      .attr("fill", isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(221, 214, 254, 0.22)")
      .attr("rx", 4);

    // Zero baseline indicator (Burnished Gold in light mode)
    g.append("line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", isDark ? "rgba(212, 175, 55, 0.4)" : "rgba(180, 138, 40, 0.45)")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-width", 1.5);

    // Light mode: Cosmic Cobalt #3B82F6 for positive driver | Dusty Amethyst #6D28D9 for penalty
    const posColor = isDark ? "#6EE7B7" : "#3B82F6"; // Astral Cyan / Cosmic Cobalt
    const negColor = isDark ? "#7A2048" : "#6D28D9"; // Deep Plum / Dusty Amethyst
    const posTextColor = isDark ? "#A5F3FC" : "#2563EB";
    const negTextColor = isDark ? "#F43F5E" : "#6D28D9";

    // Animated Enter Horizontal Bars
    g.selectAll(".driver-bar")
      .data(drivers)
      .enter()
      .append("rect")
      .attr("class", "driver-bar cursor-pointer transition-all duration-200")
      .attr("x", x(0))
      .attr("y", (d) => y(d.feature)!)
      .attr("width", 0)
      .attr("height", y.bandwidth())
      .attr("fill", (d) => (d.impact >= 0 ? posColor : negColor))
      .attr("rx", 4)
      .on("mouseenter", function (_, d) {
        sfx.playClick(1100);
        setActiveDriver(d);
        g.selectAll<SVGRectElement, ShapDriver>(".driver-bar").attr("opacity", (item) => (item.feature === d.feature ? "1" : "0.3"));
        d3.select(this)
          .attr("stroke", isDark ? "#D4AF37" : "#B48A28")
          .attr("stroke-width", 2)
          .attr("filter", isDark ? "drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))" : "drop-shadow(0 0 8px rgba(180, 138, 40, 0.4))");
      })
      .on("mouseleave", function () {
        setActiveDriver(null);
        g.selectAll(".driver-bar")
          .attr("opacity", "1")
          .attr("stroke", "none")
          .attr("filter", "none");
      })
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr("x", (d) => (d.impact >= 0 ? x(0) : x(d.impact)))
      .attr("width", (d) => Math.abs(x(d.impact) - x(0)));

    // Impact text tags with fade-in
    g.selectAll(".driver-val")
      .data(drivers)
      .enter()
      .append("text")
      .attr("class", "driver-val select-none pointer-events-none")
      .attr("x", (d) => (d.impact >= 0 ? x(d.impact) + 8 : x(d.impact) - 8))
      .attr("y", (d) => y(d.feature)! + y.bandwidth() / 2 + 3.5)
      .attr("text-anchor", (d) => (d.impact >= 0 ? "start" : "end"))
      .text((d) => (d.impact > 0 ? `+${d.impact.toFixed(3)}` : d.impact.toFixed(3)))
      .attr("fill", (d) => (d.impact >= 0 ? posTextColor : negTextColor))
      .attr("font-size", "11px")
      .attr("font-family", "var(--font-mono), monospace")
      .attr("font-weight", "700")
      .attr("opacity", 0)
      .transition()
      .delay(200)
      .duration(300)
      .attr("opacity", 1);

    // Y Axis Feature Labels (Deep Royal Indigo #1E1B4B in Light Mode)
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .call((axis) => axis.select(".domain").remove())
      .selectAll("text")
      .attr("fill", isDark ? "#E2E8F0" : "#1E1B4B")
      .attr("font-size", "11.5px")
      .attr("font-family", "var(--font-mono), monospace")
      .attr("font-weight", "600")
      .attr("dx", "-10px");
  }, [drivers, isDark, containerWidth]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  return (
    <div className="glass-royal-card relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-400/15 dark:border-amber-400/15 bg-white/40 dark:bg-[#0E1322]/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-500 dark:text-amber-300">
            <Cpu className="size-3.5 animate-pulse" />
          </div>
          <span className="font-serif font-bold tracking-wider text-slate-900 dark:text-[#E2E8F0]">
            SHAP MODEL ATTRIBUTIONS (LIGHTGBM VETTING MODEL)
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-500 dark:text-[#9BA6B8]">Vetting Probability:</span>
          <span className="font-serif font-bold text-amber-800 dark:text-amber-300 px-3 py-0.5 bg-amber-400/10 border border-amber-400/40 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.2)]">
            {(vettingScore * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="p-4 bg-white/40 dark:bg-[#070912]/80 transition-colors duration-300">
        <div ref={containerRef} className="w-full">
          <svg ref={svgRef} className="w-full h-auto" />
        </div>

        {/* Dynamic active driver explanation tooltip with glassmorphism */}
        <div className="mt-3 min-h-[52px] rounded-xl border border-amber-400/20 bg-white/60 dark:bg-[#0B0E17]/85 backdrop-blur-md px-4 py-2.5 text-xs flex items-start gap-3 shadow-md transition-all duration-200">
          {activeDriver ? (
            <Zap className="size-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0 animate-pulse" />
          ) : (
            <Info className="size-4 text-slate-400 dark:text-[#9BA6B8] mt-0.5 shrink-0" />
          )}

          {activeDriver ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-serif font-bold text-slate-900 dark:text-[#E2E8F0] text-xs">
                  {activeDriver.feature}:
                </span>
                <span className={`text-[11px] font-bold ${activeDriver.impact > 0 ? "text-cyan-600 dark:text-cyan-300" : "text-rose-600 dark:text-rose-300"}`}>
                  ({activeDriver.impact > 0 ? `+${activeDriver.impact.toFixed(3)}` : activeDriver.impact.toFixed(3)})
                </span>
              </div>
              <p className="text-slate-600 dark:text-[#9BA6B8] text-[11px] leading-relaxed">
                {activeDriver.description}
              </p>
            </div>
          ) : (
            <span className="text-slate-500 dark:text-[#9BA6B8] italic font-sans text-[11.5px] self-center">
              Hover over any astrophysical driver bar to isolate its physical contribution rationale.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
