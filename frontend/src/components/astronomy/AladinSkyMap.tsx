"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { Compass, Layers, ZoomIn, ZoomOut, Crosshair, Copy, Check } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";

interface AladinSkyMapProps {
  ra: number;
  dec: number;
  targetId: string;
  alias: string;
}

interface AladinInstance {
  gotoRaDec: (ra: number, dec: number) => void;
  setImageSurvey: (survey: string) => void;
  setFov: (fov: number) => void;
  addCatalog: (catalog: unknown) => void;
}

declare global {
  interface Window {
    A: {
      aladin: (selector: string, options: Record<string, unknown>) => AladinInstance;
      catalog: (options: Record<string, unknown>) => { addSources: (sources: unknown[]) => void };
      marker: (ra: number, dec: number, options: Record<string, unknown>) => unknown;
    };
  }
}

export function AladinSkyMap({ ra, dec, targetId, alias }: AladinSkyMapProps) {
  const containerId = `aladin-container-${targetId.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const aladinInstance = useRef<AladinInstance | null>(null);
  const [currentSurvey, setCurrentSurvey] = useState("P/DSS2/color");
  const [fov, setFov] = useState(0.12);
  const [copied, setCopied] = useState(false);

  const initAladin = useCallback(() => {
    if (window.A && !aladinInstance.current) {
      try {
        const inst = window.A.aladin(`#${containerId}`, {
          survey: currentSurvey,
          fov: fov,
          target: `${ra} ${dec}`,
          showReticle: true,
          showLayersControl: false,
          showGotoControl: false,
          showZoomControl: false,
          showFullscreenControl: false,
        });

        const targetCat = window.A.catalog({
          name: "Target Marker",
          sourceSize: 18,
          color: "#D4AF37",
        });
        inst.addCatalog(targetCat);
        targetCat.addSources([
          window.A.marker(ra, dec, {
            popupTitle: `${targetId} (${alias})`,
            popupDesc: `RA: ${ra.toFixed(4)}° | Dec: ${dec.toFixed(4)}°`,
          }),
        ]);

        aladinInstance.current = inst;
      } catch (err) {
        console.error("Aladin Lite init error:", err);
      }
    } else if (aladinInstance.current) {
      aladinInstance.current.gotoRaDec(ra, dec);
    }
  }, [alias, containerId, currentSurvey, dec, fov, ra, targetId]);

  const switchSurvey = (surveyId: string) => {
    sfx.playClick(980);
    setCurrentSurvey(surveyId);
    if (aladinInstance.current) {
      aladinInstance.current.setImageSurvey(surveyId);
    }
  };

  const adjustZoom = (delta: number) => {
    sfx.playClick(1300);
    if (aladinInstance.current) {
      const newFov = Math.max(0.01, Math.min(1.0, fov * delta));
      aladinInstance.current.setFov(newFov);
      setFov(newFov);
    }
  };

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${ra.toFixed(6)}, ${dec.toFixed(6)}`);
    sfx.playSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (window.A) {
      initAladin();
    }
  }, [initAladin]);

  return (
    <div className="glass-royal-card relative flex flex-col rounded-2xl overflow-hidden shadow-2xl group transition-all duration-300">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-br" />

      <Script
        src="https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js"
        strategy="lazyOnload"
        onReady={initAladin}
      />

      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b border-amber-500/20 dark:border-amber-400/15 bg-[#F1F5F9]/80 dark:bg-[#0E1322]/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-lg border border-amber-500/40 dark:border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Compass className="size-3.5" />
          </div>
          <div>
            <span className="font-serif font-bold tracking-wider text-[#1E1B4B] dark:text-[#E2E8F0]">
              ALADIN LITE v3
            </span>
            <span className="text-[10px] font-sans text-[#B48A28] dark:text-amber-300/80 ml-2 font-bold">
              CDS STRASBOURG
            </span>
          </div>
        </div>

        {/* Survey Band Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-600 dark:text-[#9BA6B8] mr-1 hidden sm:flex items-center gap-1 font-semibold">
            <Layers className="size-3 text-[#B48A28] dark:text-amber-400" /> BAND:
          </span>
          {[
            { id: "P/DSS2/color", label: "DSS2 OPTICAL" },
            { id: "P/2MASS/color", label: "2MASS NIR" },
            { id: "P/allWISE/color", label: "WISE MIR" },
          ].map((s) => {
            const isCurrent = currentSurvey === s.id;
            return (
              <button
                key={s.id}
                onClick={() => switchSurvey(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-all duration-200 active:scale-95 shadow-sm ${
                  isCurrent
                    ? "bg-[#DDD6FE] dark:bg-amber-400/20 text-[#1E1B4B] dark:text-amber-200 border border-[#B48A28] dark:border-amber-400/60 font-black shadow-[0_0_12px_rgba(180,138,40,0.25)]"
                    : "bg-[#FAF9F6] dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 hover:text-[#1E1B4B] dark:hover:text-amber-300 border border-slate-300 dark:border-slate-800"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Celestial Viewport */}
      <div className="relative h-[360px] w-full bg-[#03060a]">
        <div id={containerId} className="h-full w-full" />

        {/* Reticle Overlay Box with Glassmorphism */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 bg-[#FAF9F6]/95 dark:bg-[#0B0E17]/85 backdrop-blur-xl border border-amber-600/30 dark:border-amber-400/25 rounded-xl p-2.5 font-mono text-[11px] shadow-2xl max-w-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 font-serif font-bold text-[#1E1B4B] dark:text-amber-300">
              <Crosshair className="size-3.5 text-[#B48A28] dark:text-amber-400 animate-pulse" />
              <span>{targetId}</span>
            </div>
            <button
              onClick={copyCoordinates}
              title="Copy RA/Dec decimal coordinates"
              className="text-slate-500 hover:text-[#B48A28] dark:hover:text-amber-300 transition-colors p-1"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </button>
          </div>
          <span className="text-slate-600 dark:text-[#9BA6B8] text-[10.5px]">
            RA: <strong className="text-[#1E1B4B] dark:text-cyan-300 font-bold">{ra.toFixed(4)}°</strong> | Dec: <strong className="text-[#1E1B4B] dark:text-cyan-300 font-bold">{dec.toFixed(4)}°</strong>
          </span>
          <span className="text-slate-600 dark:text-[#9BA6B8] text-[10px] flex items-center justify-between">
            <span>FOV: {(fov * 60).toFixed(1)}′</span>
            <span className="text-[#B48A28] dark:text-amber-400 font-bold">EPOCH J2000.0</span>
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 bg-[#FAF9F6]/95 dark:bg-[#0B0E17]/85 backdrop-blur-xl p-1 rounded-xl border border-amber-600/30 dark:border-amber-400/25 shadow-2xl">
          <button
            onClick={() => adjustZoom(0.7)}
            title="Zoom In"
            className="p-1.5 rounded-lg hover:bg-[#DDD6FE]/60 dark:hover:bg-amber-400/20 text-[#1E1B4B] dark:text-[#E2E8F0] hover:text-[#B48A28] dark:hover:text-amber-300 active:scale-90 transition-all"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={() => adjustZoom(1.3)}
            title="Zoom Out"
            className="p-1.5 rounded-lg hover:bg-[#DDD6FE]/60 dark:hover:bg-amber-400/20 text-[#1E1B4B] dark:text-[#E2E8F0] hover:text-[#B48A28] dark:hover:text-amber-300 active:scale-90 transition-all"
          >
            <ZoomOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
