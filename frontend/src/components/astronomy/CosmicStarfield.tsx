"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-provider";

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  color: string;        // halo rgba prefix e.g. "rgba(165, 243, 252,"
  coreColor: string;    // core rgba prefix
  hasSpikes: boolean;
  glowMultiplier: number;
  haloIntensity: number;
}

interface CosmicRipple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  coreFlashColor: string;
  alphaBoost: number;
  sparks: {
    angle: number;
    speed: number;
    size: number;
    color: string;
  }[];
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  dx: number;
  dy: number;
  alpha: number;
  fadeSpeed: number;
  headColor: string;
  tailColor: string;
  coreSize: number;
}

interface CloudLobe {
  relX: number;
  relY: number;
  radius: number;
  freq: number;
  phase: number;
  dispX: number;
  dispY: number;
  vx: number;
  vy: number;
  colorInner: string;
  colorMid: string;
  sprite?: HTMLCanvasElement;
}

interface CoronalProminence {
  baseAngle: number;
  spanAngle: number;
  height: number;
  phase: number;
  speed: number;
  color: string;
}

interface SolarEjection {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

interface VaporWisp {
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  radius: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  decay: number;
  colorInner: string;
  colorMid: string;
}

interface UrjaCloud {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  driftVx: number;
  driftVy: number;
  spreadRadius: number;
  lobes: CloudLobe[];
  colorOuter: string;
  speed: number;
  phase: number;
  dispX: number;
  dispY: number;
  vx: number;
  vy: number;
  sunbeam: number;
  scatter: number;
  flarePower: number;
  flareRelX: number;
  flareRelY: number;
  wisps: VaporWisp[];
  rotAngle: number;
  rotSpeed: number;
  prominences: CoronalProminence[];
}

interface SolarMote {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  haloMult: number;
  baseAlpha: number;
  maxAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  color: string;
  coreColor: string;
  haloSprite?: HTMLCanvasElement;
}

export function CosmicStarfield() {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme, clickRings } = useTheme();
  const clickRingsRef = useRef(clickRings);

  useEffect(() => {
    clickRingsRef.current = clickRings;
  }, [clickRings]);

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;
    const bgCtx = bgCanvas.getContext("2d", { alpha: true });
    const fgCtx = fgCanvas.getContext("2d", { alpha: true });
    if (!bgCtx || !fgCtx) return;

    const isUrja    = theme === "urja";
    const isJungo   = theme === "jungo";
    const isDarkMode = theme === "dark";
    const isLight   = theme === "light";

    // --- DPR-aware sizing (optimized at 1.5× max to maximize GPU throughput and prevent frame drops) ---
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.5);
    let cssW = window.innerWidth;
    let cssH = window.innerHeight;

    const resizeCanvases = () => {
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssH * dpr);

      bgCanvas.width  = w;
      bgCanvas.height = h;
      bgCanvas.style.width  = cssW + "px";
      bgCanvas.style.height = cssH + "px";
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      fgCanvas.width  = w;
      fgCanvas.height = h;
      fgCanvas.style.width  = cssW + "px";
      fgCanvas.style.height = cssH + "px";
      fgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvases();

    let animationFrameId: number;
    let running = true;

    const handleResize = () => {
      resizeCanvases();
      initStars();
      initUrja();
    };
    window.addEventListener("resize", handleResize);

    // Tab-visibility pause
    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // --- Cursor + Ripples ---
    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      ringX: -2000,
      ringY: -2000,
      prevRingX: -2000,
      prevRingY: -2000,
      vx: 0,
      vy: 0,
      active: false,
      isInteractive: false,
      hoverScale: 1.0,
      clickScale: 1.0,
    };
    const ripples: CosmicRipple[] = [];

    const handlePointerMove = (e: PointerEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
      const target = e.target as HTMLElement | null;
      if (target) {
        mouse.isInteractive = Boolean(
          target.closest("button, a, input, select, textarea, [role='button'], .interactive-press, .glass-royal-card, .interactive-row")
        );
      }
    };
    const handlePointerLeave = () => {
      mouse.active = false;
      mouse.targetX = -2000;
      mouse.targetY = -2000;
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!clickRingsRef.current) return;
      mouse.clickScale = 0.72; // Instant tactile spring compression

      let primaryColor: string;
      let secondaryColor: string;
      let tertiaryColor: string;
      let coreFlashColor: string;
      const sparks: { angle: number; speed: number; size: number; color: string }[] = [];

      if (isLight) {
        // Celestial Light Mode: Pure royal cobalt, periwinkle, sky blue
        primaryColor   = "rgba(37, 99, 235,";  // Vivid Royal Blue
        secondaryColor = "rgba(79, 70, 229,";  // Electric Indigo / Periwinkle
        tertiaryColor  = "rgba(14, 165, 233,"; // Cyan / Sky Blue
        coreFlashColor = "rgba(59, 130, 246,"; // Soft Blue Flash
        for (let i = 0; i < 8; i++) {
          sparks.push({
            angle: (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4,
            speed: Math.random() * 1.8 + 1.2,
            size: Math.random() * 1.2 + 1.0,
            color: Math.random() > 0.4 ? "rgba(37, 99, 235," : "rgba(180, 138, 40,",
          });
        }
      } else if (isUrja) {
        // URJA: Sunburst gold, amethyst, solar orange
        primaryColor   = "rgba(197, 155, 39,";   // Astrolabe Gold
        secondaryColor = "rgba(91, 75, 138,";    // Astral Amethyst
        tertiaryColor  = "rgba(234, 179, 8,";    // Warm Solar Yellow
        coreFlashColor = "rgba(251, 191, 36,";   // Solar Flare Flash
        for (let i = 0; i < 10; i++) {
          sparks.push({
            angle: (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.35,
            speed: Math.random() * 2.0 + 1.3,
            size: Math.random() * 1.4 + 1.0,
            color: Math.random() > 0.5 ? "rgba(197, 155, 39," : "rgba(91, 75, 138,",
          });
        }
      } else if (isJungo) {
        // Jungo Mode: Radiant Champagne Gold, Astral Cyan, Nebula Amethyst
        primaryColor   = "rgba(212, 175, 55,";  // Champagne Gold
        secondaryColor = "rgba(165, 243, 252,"; // Astral Cyan
        tertiaryColor  = "rgba(192, 132, 252,"; // Nebula Amethyst
        coreFlashColor = "rgba(229, 193, 88,";  // Gold Flash
        for (let i = 0; i < 10; i++) {
          sparks.push({
            angle: (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.35,
            speed: Math.random() * 2.2 + 1.4,
            size: Math.random() * 1.5 + 1.2,
            color: Math.random() > 0.5 ? "rgba(212, 175, 55," : "rgba(165, 243, 252,",
          });
        }
      } else {
        // Dark Mode: Deep Space Astral Cyan, Royal Blue, Platinum
        primaryColor   = "rgba(165, 243, 252,"; // Astral Cyan
        secondaryColor = "rgba(64, 142, 198,";  // Royal Cobalt
        tertiaryColor  = "rgba(226, 232, 240,"; // Platinum Starlight
        coreFlashColor = "rgba(165, 243, 252,"; // Cyan Flash
        for (let i = 0; i < 8; i++) {
          sparks.push({
            angle: (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4,
            speed: Math.random() * 1.8 + 1.2,
            size: Math.random() * 1.2 + 1.0,
            color: Math.random() > 0.5 ? "rgba(165, 243, 252," : "rgba(226, 232, 240,",
          });
        }
      }

      ripples.push({
        x: e.clientX,
        y: e.clientY,
        startTime: performance.now(),
        duration: 850,
        maxRadius: 185,
        primaryColor,
        secondaryColor,
        tertiaryColor,
        coreFlashColor,
        alphaBoost: isLight || isUrja ? 2.0 : 1.0,
        sparks,
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    // --- Star palette ---
    const starPalette = [
      { halo: "rgba(165, 243, 252,", core: "rgba(255, 255, 255," }, // Astral Cyan
      { halo: "rgba(229, 193, 88,",  core: "rgba(255, 250, 235," }, // Champagne Gold
      { halo: "rgba(221, 214, 254,", core: "rgba(255, 255, 255," }, // Nebula Amethyst
      { halo: "rgba(110, 231, 183,", core: "rgba(240, 253, 250," }, // Emerald Aurora
      { halo: "rgba(248, 250, 252,", core: "rgba(255, 255, 255," }, // Starlight White
    ];

    let stars: Star[] = [];

    const initStars = () => {
      stars = [];
      if (isLight || isUrja) return; // no stars in light/urja mode

      const palette = isJungo ? starPalette : starPalette; // dark & jungo use same palette
      const count = Math.min(220, Math.floor((cssW * cssH) / 5800));

      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const p = palette[Math.floor(Math.random() * palette.length)];

        let radius: number;
        let baseAlpha: number;
        let glowMultiplier: number;
        let haloIntensity: number;
        let hasSpikes = false;

        if (isDarkMode) {
          // Plain dark: ALL stars are Tier 0 pinpricks — no glow at all
          radius = Math.random() * 0.5 + 0.3;
          baseAlpha = Math.random() * 0.45 + 0.25;
          glowMultiplier = 0;
          haloIntensity = 0;
        } else {
          // JUNGO MODE: 4-tier distribution (approved by user)
          if (roll < 0.52) {
            // Tier 0: crisp pinpricks, zero glow (52%)
            radius = Math.random() * 0.35 + 0.35;
            baseAlpha = Math.random() * 0.4 + 0.35;
            glowMultiplier = 0;
            haloIntensity = 0;
          } else if (roll < 0.84) {
            // Tier 1: faint background glow (32%)
            radius = Math.random() * 0.35 + 0.6;
            baseAlpha = Math.random() * 0.3 + 0.3;
            glowMultiplier = Math.random() * 0.5 + 1.4;
            haloIntensity = 0.16;
          } else if (roll < 0.93) {
            // Tier 2: mid-magnitude (9%)
            radius = Math.random() * 0.4 + 0.95;
            baseAlpha = Math.random() * 0.25 + 0.5;
            glowMultiplier = Math.random() * 0.8 + 2.4;
            haloIntensity = 0.45;
          } else {
            // Tier 3: rare bright anchors (7%)
            radius = Math.random() * 0.7 + 1.4;
            baseAlpha = Math.random() * 0.25 + 0.75;
            glowMultiplier = Math.random() * 1.5 + 4.8;
            haloIntensity = 0.92;
            hasSpikes = radius > 1.7;
          }
        }

        stars.push({
          x: Math.random() * cssW,
          y: Math.random() * cssH,
          radius,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.035 + 0.012,
          phase: Math.random() * Math.PI * 2,
          color: p.halo,
          coreColor: p.core,
          hasSpikes,
          glowMultiplier,
          haloIntensity,
        });
      }
    };
    initStars();

        // ─── URJA Mode: Natural Procedural Smooth Clouds & Daylight Motes ────────
    let uClouds: UrjaCloud[] = [];
    let uMotes: SolarMote[] = [];
    let solarEjections: SolarEjection[] = [];

    // Pre-rendered volumetric hardware-accelerated sprites
    const makeRadialSprite = (size: number, stops: [number, string][]): HTMLCanvasElement => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return c;
      const r = size / 2;
      const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
      for (const [stop, color] of stops) {
        grad.addColorStop(stop, color);
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      return c;
    };

    const makeLinearSprite = (w: number, h: number, stops: [number, string][]): HTMLCanvasElement => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return c;
      const grad = ctx.createLinearGradient(0, h / 2, w, h / 2);
      for (const [stop, color] of stops) {
        grad.addColorStop(stop, color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return c;
    };

    let spriteHighlight: HTMLCanvasElement | null = null;
    let spriteWisp: HTMLCanvasElement | null = null;
    let spriteCorona: HTMLCanvasElement | null = null;
    let spriteSunbeam: HTMLCanvasElement | null = null;
    let spriteCore: HTMLCanvasElement | null = null;

    const initUrja = () => {
      uClouds = [];
      uMotes  = [];
      solarEjections = [];
      if (!isUrja) return;

      // Volumetric cloud lobe radial sprites
      const spriteGA = makeRadialSprite(192, [
        [0.0,  "rgba(248, 170, 25, 0.95)"],
        [0.20, "rgba(248, 170, 25, 0.85)"],
        [0.45, "rgba(255, 200, 60, 0.52)"],
        [0.70, "rgba(255, 200, 60, 0.22)"],
        [0.88, "rgba(255, 248, 200, 0.06)"],
        [1.0,  "rgba(250, 248, 245, 0)"],
      ]);

      const spriteGB = makeRadialSprite(192, [
        [0.0,  "rgba(255, 205, 60, 0.95)"],
        [0.20, "rgba(255, 205, 60, 0.85)"],
        [0.45, "rgba(255, 230, 105, 0.52)"],
        [0.70, "rgba(255, 230, 105, 0.22)"],
        [0.88, "rgba(255, 248, 200, 0.06)"],
        [1.0,  "rgba(250, 248, 245, 0)"],
      ]);

      const spriteGD = makeRadialSprite(192, [
        [0.0,  "rgba(255, 185, 35, 0.95)"],
        [0.20, "rgba(255, 185, 35, 0.85)"],
        [0.45, "rgba(255, 215, 80, 0.52)"],
        [0.70, "rgba(255, 215, 80, 0.22)"],
        [0.88, "rgba(255, 248, 200, 0.06)"],
        [1.0,  "rgba(250, 248, 245, 0)"],
      ]);

      spriteHighlight = makeRadialSprite(192, [
        [0.0,  "rgba(255, 255, 255, 0.55)"],
        [0.30, "rgba(255, 245, 180, 0.35)"],
        [0.65, "rgba(255, 235, 130, 0.12)"],
        [1.0,  "rgba(255, 248, 200, 0)"],
      ]);

      spriteWisp = makeRadialSprite(128, [
        [0.0,  "rgba(255, 205, 60, 0.90)"],
        [0.35, "rgba(255, 228, 105, 0.55)"],
        [0.70, "rgba(255, 248, 200, 0.18)"],
        [1.0,  "rgba(250, 248, 245, 0)"],
      ]);

      spriteCorona = makeRadialSprite(256, [
        [0.0,  "rgba(255, 250, 210, 0.85)"],
        [0.25, "rgba(254, 215, 170, 0.55)"],
        [0.60, "rgba(251, 191, 36, 0.25)"],
        [1.0,  "rgba(250, 248, 245, 0)"],
      ]);

      spriteSunbeam = makeLinearSprite(256, 32, [
        [0.0,  "rgba(255, 255, 230, 0.80)"],
        [0.30, "rgba(245, 175, 25, 0.50)"],
        [0.70, "rgba(217, 119, 6, 0.18)"],
        [1.0,  "rgba(250, 248, 245, 0)"],
      ]);

      spriteCore = makeRadialSprite(128, [
        [0.0,  "rgba(255, 255, 255, 1.0)"],
        [0.25, "rgba(254, 240, 138, 0.98)"],
        [0.55, "rgba(245, 158, 11, 0.92)"],
        [0.85, "rgba(220, 38, 38, 0.75)"],
        [1.0,  "rgba(180, 83, 9, 0)"],
      ]);

      const GD = { inner: "rgba(255, 185, 35,",  mid: "rgba(255, 215, 80,", sprite: spriteGD };
      const GB = { inner: "rgba(255, 205, 60,",  mid: "rgba(255, 230, 105,", sprite: spriteGB };
      const GA = { inner: "rgba(248, 170, 25,",  mid: "rgba(255, 200, 60,", sprite: spriteGA };
      const outerCol = "rgba(255, 248, 200,";
      const goldProms = ["rgba(251, 191, 36,", "rgba(245, 158, 11,", "rgba(255, 220, 90,"];

      const mkLobe = (relX: number, relY: number, r: number, c: {inner: string; mid: string; sprite: HTMLCanvasElement}): CloudLobe => ({
        relX, relY, radius: r,
        freq: 0.00016 + Math.random() * 0.00020,
        phase: Math.random() * Math.PI * 2,
        dispX: 0, dispY: 0, vx: 0, vy: 0,
        colorInner: c.inner, colorMid: c.mid,
        sprite: c.sprite,
      });
      const jit = (n: number) => n + (Math.random() - 0.5) * n * 0.35;

      // 1. Towering Cumulus Cloud (Upper Left/Center Sky)
      const c1: CloudLobe[] = [
        mkLobe(jit(-108), jit(82), jit(50), GA), mkLobe(jit(-54), jit(80), jit(53), GA),
        mkLobe(jit(0),    jit(84), jit(51), GA), mkLobe(jit(54),  jit(79), jit(52), GA),
        mkLobe(jit(108),  jit(83), jit(50), GA),
        mkLobe(jit(-92), jit(45), jit(66), GB), mkLobe(jit(-46), jit(50), jit(70), GB),
        mkLobe(jit(0),   jit(43), jit(76), GB), mkLobe(jit(46),  jit(48), jit(68), GB),
        mkLobe(jit(92),  jit(44), jit(64), GB),
        mkLobe(jit(-78), jit(10), jit(80), GD), mkLobe(jit(-38), jit(7),  jit(86), GD),
        mkLobe(jit(0),   jit(4),  jit(90), GD), mkLobe(jit(38),  jit(9),  jit(84), GD),
        mkLobe(jit(78),  jit(13), jit(78), GD),
        mkLobe(jit(-58), jit(-31), jit(76), GD), mkLobe(jit(-22), jit(-37), jit(82), GD),
        mkLobe(jit(0),   jit(-41), jit(86), GD), mkLobe(jit(22),  jit(-35), jit(80), GD),
        mkLobe(jit(58),  jit(-29), jit(74), GD),
        mkLobe(jit(-36), jit(-67), jit(68), GB), mkLobe(jit(-11), jit(-77), jit(74), GB),
        mkLobe(jit(11),  jit(-74), jit(72), GB), mkLobe(jit(36),  jit(-65), jit(66), GB),
        mkLobe(jit(-14), jit(-107), jit(58), GB), mkLobe(jit(14), jit(-104), jit(60), GB),
      ];

      // 2. Stratocumulus Horizon Roll (Right Mid-Sky)
      const c2: CloudLobe[] = [
        mkLobe(jit(-224), jit(44), jit(53), GA), mkLobe(jit(-150), jit(46), jit(57), GA),
        mkLobe(jit(-76),  jit(44), jit(59), GA), mkLobe(jit(-4),   jit(48), jit(55), GA),
        mkLobe(jit(70),   jit(45), jit(57), GA), mkLobe(jit(144),  jit(43), jit(54), GA),
        mkLobe(jit(218),  jit(45), jit(52), GA),
        mkLobe(jit(-234), jit(10), jit(70), GB), mkLobe(jit(-162), jit(12), jit(74), GB),
        mkLobe(jit(-96),  jit(8),  jit(79), GB), mkLobe(jit(-28),  jit(14), jit(77), GB),
        mkLobe(jit(42),   jit(9),  jit(79), GB), mkLobe(jit(112),  jit(11), jit(74), GB),
        mkLobe(jit(180),  jit(13), jit(72), GB), mkLobe(jit(242),  jit(9),  jit(68), GB),
        mkLobe(jit(-204), jit(-23), jit(64), GD), mkLobe(jit(-136), jit(-27), jit(68), GD),
        mkLobe(jit(-68),  jit(-21), jit(72), GD), mkLobe(jit(0),    jit(-29), jit(70), GD),
        mkLobe(jit(68),   jit(-23), jit(69), GD), mkLobe(jit(136),  jit(-25), jit(67), GD),
        mkLobe(jit(204),  jit(-21), jit(63), GD),
        mkLobe(jit(-166), jit(-56), jit(55), GD), mkLobe(jit(-58), jit(-61), jit(58), GD),
        mkLobe(jit(50),   jit(-55), jit(57), GD), mkLobe(jit(162), jit(-59), jit(55), GD),
      ];

      // 3. Dense Rounded Puffball (Lower Center Sky)
      const c3: CloudLobe[] = [
        mkLobe(jit(-26), jit(-8),  jit(88), GD), mkLobe(jit(26),  jit(-6),  jit(86), GD),
        mkLobe(jit(0),   jit(14),  jit(83), GD), mkLobe(jit(0),   jit(-33), jit(80), GD),
        mkLobe(jit(-68), jit(-4),  jit(74), GB), mkLobe(jit(68),  jit(-2),  jit(72), GB),
        mkLobe(jit(-48), jit(-50), jit(70), GB), mkLobe(jit(48),  jit(-48), jit(70), GB),
        mkLobe(jit(-48), jit(42),  jit(66), GA), mkLobe(jit(48),  jit(44),  jit(65), GA),
        mkLobe(jit(-115), jit(10), jit(60), GA), mkLobe(jit(115), jit(12),  jit(60), GA),
        mkLobe(jit(-88),  jit(-66), jit(58), GB), mkLobe(jit(88), jit(-64), jit(58), GB),
        mkLobe(jit(-88),  jit(63), jit(56), GA), mkLobe(jit(88),  jit(65),  jit(55), GA),
        mkLobe(jit(-102), jit(84), jit(51), GA), mkLobe(jit(-44), jit(89), jit(53), GA),
        mkLobe(jit(0),    jit(91), jit(52), GA), mkLobe(jit(44),  jit(87), jit(51), GA),
        mkLobe(jit(102),  jit(85), jit(50), GA),
        mkLobe(jit(-38), jit(-86), jit(63), GB), mkLobe(jit(0), jit(-96), jit(68), GB),
        mkLobe(jit(38),  jit(-84), jit(61), GB),
        mkLobe(jit(-38), jit(-24), jit(68), GD), mkLobe(jit(38),  jit(-22), jit(66), GD),
      ];

      const makeProms = (): CoronalProminence[] =>
        Array.from({ length: 5 }, (_, p) => ({
          baseAngle: (Math.PI * 2 * p) / 5 + (Math.random() - 0.5) * 0.4,
          spanAngle: Math.random() * 0.45 + 0.35,
          height:    Math.random() * 45 + 35,
          phase:     Math.random() * Math.PI * 2,
          speed:     Math.random() * 0.022 + 0.012,
          color:     goldProms[p % goldProms.length],
        }));

      [
        { bx: cssW * 0.22, by: cssH * 0.26, sr: 220, lobes: c1, dvx: 0.16, dvy: 0.04 },
        { bx: cssW * 0.68, by: cssH * 0.40, sr: 310, lobes: c2, dvx: -0.14, dvy: -0.03 },
        { bx: cssW * 0.40, by: cssH * 0.74, sr: 230, lobes: c3, dvx: 0.15, dvy: 0.03 },
      ].forEach((def, idx) => {
        uClouds.push({
          id: idx,
          x: def.bx, y: def.by, baseX: def.bx, baseY: def.by,
          driftVx: def.dvx, driftVy: def.dvy,
          spreadRadius: def.sr, lobes: def.lobes, colorOuter: outerCol,
          speed: 0.00014 + Math.random() * 0.00016,
          phase: Math.random() * Math.PI * 2,
          dispX: 0, dispY: 0, vx: 0, vy: 0,
          sunbeam: 0, scatter: 0,
          flarePower: 0, flareRelX: 0, flareRelY: 0,
          wisps: [],
          rotAngle: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.0005,
          prominences: makeProms(),
        });
      });

      // 12 Stable, Restrained, Uneven Daylight Solar Motes
      const moteProfiles = [
        { radius: 3.2, maxAlpha: 0.52, haloMult:  8.0, color: "rgba(217, 155, 30,",  core: "#C59B27" },
        { radius: 2.8, maxAlpha: 0.48, haloMult:  7.5, color: "rgba(145, 105, 210,", core: "#7C3AED" },
        { radius: 3.5, maxAlpha: 0.50, haloMult:  8.5, color: "rgba(234, 165, 12,",  core: "#D97706" },
        { radius: 2.6, maxAlpha: 0.45, haloMult:  7.0, color: "rgba(217, 155, 30,",  core: "#B48A28" },
        { radius: 3.0, maxAlpha: 0.49, haloMult:  7.5, color: "rgba(145, 105, 210,", core: "#6D28D9" },
        { radius: 4.2, maxAlpha: 0.65, haloMult:  9.0, color: "rgba(245, 158, 11,",  core: "#F59E0B" },
        { radius: 4.0, maxAlpha: 0.62, haloMult:  8.5, color: "rgba(217, 130, 10,",  core: "#D97706" },
        { radius: 3.8, maxAlpha: 0.60, haloMult:  8.0, color: "rgba(167, 139, 250,", core: "#8B5CF6" },
        { radius: 4.5, maxAlpha: 0.68, haloMult:  9.5, color: "rgba(234, 179, 8,",   core: "#EAB308" },
        { radius: 5.5, maxAlpha: 0.80, haloMult: 10.0, color: "rgba(245, 158, 11,",  core: "#FBBF24" },
        { radius: 5.0, maxAlpha: 0.75, haloMult: 10.0, color: "rgba(197, 155, 39,",  core: "#EAB308" },
        { radius: 6.0, maxAlpha: 0.85, haloMult: 11.0, color: "rgba(167, 139, 250,", core: "#A78BFA" },
      ];
      for (let i = 0; i < moteProfiles.length; i++) {
        const prof = moteProfiles[i];
        const bx = cssW * (0.05 + (i / moteProfiles.length) * 0.90 + (Math.random() - 0.5) * 0.10);
        const by = cssH * (0.08 + Math.random() * 0.84);
        const haloSprite = makeRadialSprite(128, [
          [0.0,  `${prof.color}0.65)`],
          [0.35, `${prof.color}0.25)`],
          [0.70, `${prof.color}0.08)`],
          [1.0,  "rgba(0, 0, 0, 0)"],
        ]);
        uMotes.push({
          x: bx, y: by, baseX: bx, baseY: by,
          radius: prof.radius, haloMult: prof.haloMult,
          baseAlpha: prof.maxAlpha * 0.60, maxAlpha: prof.maxAlpha, alpha: prof.maxAlpha * 0.70,
          twinkleSpeed: Math.random() * 0.014 + 0.006,
          phase: Math.random() * Math.PI * 2,
          color: prof.color, coreColor: prof.core,
          haloSprite,
        });
      }
    };
    initUrja();

    // --- Shooting Stars (JUNGO only) ---
    const shootingStars: ShootingStar[] = [];
    let nextSpawnTime = Date.now() + 800;

    const spawnShootingStar = () => {
      const startFromTop = Math.random() > 0.3;
      const x = startFromTop
        ? Math.random() * cssW
        : Math.random() < 0.5 ? -40 : cssW + 40;
      const y = startFromTop ? -30 : Math.random() * (cssH * 0.45);

      const direction = x > cssW * 0.55 ? -1 : 1;
      const angleDeg = Math.random() * 35 + 25;
      const angle = (angleDeg * Math.PI) / 180;
      const speed = Math.random() * 10 + 16;

      const colorRoll = Math.random();
      let headColor = "#FFFFFF";
      let tailColor = "rgba(165, 243, 252,";
      if (colorRoll > 0.6) {
        headColor = "#FFF8E7";
        tailColor = "rgba(229, 193, 88,";
      } else if (colorRoll > 0.85) {
        headColor = "#FAF5FF";
        tailColor = "rgba(192, 132, 252,";
      }

      shootingStars.push({
        x, y,
        length: Math.random() * 160 + 160,
        speed,
        dx: Math.cos(angle) * speed * direction,
        dy: Math.sin(angle) * speed,
        alpha: 1.0,
        fadeSpeed: Math.random() * 0.012 + 0.009,
        headColor,
        tailColor,
        coreSize: Math.random() * 1.2 + 1.8,
      });

      nextSpawnTime = Date.now() + Math.random() * 2000 + 1200;
    };

    // ─── RENDER LOOP (High-Precision Delta-Time & Zero-Allocation Texture Pipeline) ──
    let lastRenderTime = performance.now();

    const render = () => {
      if (!running) return;

      if (!isTabVisible) {
        lastRenderTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const now = performance.now();
      const dt = Math.min(2.0, Math.max(0.1, (now - lastRenderTime) / 16.667));
      lastRenderTime = now;

      bgCtx.clearRect(0, 0, cssW, cssH);
      fgCtx.clearRect(0, 0, cssW, cssH);

      // ─── Silky Responsive Cursor Tracking ─────────────────────────────────
      if (mouse.active) {
        const prevX = mouse.ringX;
        const prevY = mouse.ringY;
        const lerpFactor = 1 - Math.pow(0.70, dt);
        mouse.ringX += (mouse.targetX - mouse.ringX) * lerpFactor;
        mouse.ringY += (mouse.targetY - mouse.ringY) * lerpFactor;
        mouse.vx = mouse.ringX - prevX;
        mouse.vy = mouse.ringY - prevY;
      } else {
        mouse.ringX += (-2000 - mouse.ringX) * 0.06 * dt;
        mouse.ringY += (-2000 - mouse.ringY) * 0.06 * dt;
        mouse.vx = 0;
        mouse.vy = 0;
      }

      const mx = mouse.ringX, my = mouse.ringY;
      const inBounds = mx > -1500 && my > -1500;

      if (inBounds) {
        if (isLight) {
          // ─── LIGHT MODE AURA (Prominent Celestial Blueish Tint) ──────────────
          const a = fgCtx.createRadialGradient(mx, my, 0, mx, my, 250);
          a.addColorStop(0,    "rgba(59, 130, 246, 0.24)");
          a.addColorStop(0.25, "rgba(96, 165, 250, 0.15)");
          a.addColorStop(0.55, "rgba(147, 197, 253, 0.08)");
          a.addColorStop(0.80, "rgba(191, 219, 254, 0.03)");
          a.addColorStop(1,    "rgba(219, 234, 254, 0)");
          fgCtx.fillStyle = a;
          fgCtx.beginPath();
          fgCtx.arc(mx, my, 250, 0, Math.PI * 2);
          fgCtx.fill();
        } else if (isUrja) {
          // ─── URJA MODE AURA (Warm Solar Gold + Amethyst Radiant Flare) ──
          const a = fgCtx.createRadialGradient(mx, my, 0, mx, my, 220);
          a.addColorStop(0,    "rgba(197, 155, 39, 0.20)");
          a.addColorStop(0.30, "rgba(234, 179,  8, 0.11)");
          a.addColorStop(0.60, "rgba(91,  75, 138, 0.06)");
          a.addColorStop(0.85, "rgba(167,139, 250, 0.02)");
          a.addColorStop(1,    "rgba(250,248,245,  0)");
          fgCtx.fillStyle = a;
          fgCtx.beginPath();
          fgCtx.arc(mx, my, 220, 0, Math.PI * 2);
          fgCtx.fill();
        } else if (isJungo) {
          // ─── JUNGO MODE AURA (Gold + Cyan Radiant Flare) ────────────────
          const a = fgCtx.createRadialGradient(mx, my, 0, mx, my, 165);
          a.addColorStop(0,    "rgba(229, 193, 88, 0.12)");
          a.addColorStop(0.35, "rgba(165, 243, 252, 0.07)");
          a.addColorStop(0.70, "rgba(192, 132, 252, 0.03)");
          a.addColorStop(1,    "rgba(0, 0, 0, 0)");
          fgCtx.fillStyle = a;
          fgCtx.beginPath();
          fgCtx.arc(mx, my, 165, 0, Math.PI * 2);
          fgCtx.fill();
        } else {
          // ─── DARK MODE AURA (Astral Cyan & Cobalt - Expanded) ───────────
          const a = fgCtx.createRadialGradient(mx, my, 0, mx, my, 240);
          a.addColorStop(0,    "rgba(165, 243, 252, 0.15)");
          a.addColorStop(0.25, "rgba(96, 165, 250, 0.09)");
          a.addColorStop(0.55, "rgba(64, 142, 198, 0.045)");
          a.addColorStop(0.80, "rgba(46, 74, 158, 0.018)");
          a.addColorStop(1,    "rgba(0, 0, 0, 0)");
          fgCtx.fillStyle = a;
          fgCtx.beginPath();
          fgCtx.arc(mx, my, 240, 0, Math.PI * 2);
          fgCtx.fill();
        }
      }

      // ─── Click Ripples (Theme-matched & Physics-smoothed) ─────────────────
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rip = ripples[r];
        const elapsed = now - rip.startTime;
        const progress = Math.min(1, elapsed / rip.duration);

        if (progress >= 1) {
          ripples.splice(r, 1);
          continue;
        }

        // Cubic ease-out expansion curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRadius = 6 + (rip.maxRadius - 6) * easeOut;
        const baseAlpha = Math.sin((1 - progress) * Math.PI * 0.5);
        const boost = rip.alphaBoost ?? 1.0;
        const currentAlpha = Math.min(1, baseAlpha * boost);

        // Core flash at start
        if (progress < 0.35) {
          const flashProgress = progress / 0.35;
          const flashRadius = 36 * (1 - Math.pow(1 - flashProgress, 2));
          const flashAlpha = Math.min(1, (1 - flashProgress) * 0.75 * boost);
          const flashGrad = fgCtx.createRadialGradient(rip.x, rip.y, 0, rip.x, rip.y, flashRadius);
          flashGrad.addColorStop(0, `${rip.coreFlashColor}${flashAlpha})`);
          flashGrad.addColorStop(0.5, `${rip.coreFlashColor}${flashAlpha * 0.4})`);
          flashGrad.addColorStop(1, "rgba(0,0,0,0)");
          fgCtx.fillStyle = flashGrad;
          fgCtx.beginPath();
          fgCtx.arc(rip.x, rip.y, flashRadius, 0, Math.PI * 2);
          fgCtx.fill();
        }

        // Outer Primary Wave Ring
        fgCtx.strokeStyle = `${rip.primaryColor}${Math.min(1, currentAlpha * 0.9)})`;
        fgCtx.lineWidth = Math.max(0.8, 2.2 * (1 - progress * 0.6));
        fgCtx.beginPath();
        fgCtx.arc(rip.x, rip.y, currentRadius, 0, Math.PI * 2);
        fgCtx.stroke();

        // Mid Secondary Harmonic Ring
        if (currentRadius > 16) {
          const midRadius = currentRadius * 0.65;
          fgCtx.strokeStyle = `${rip.secondaryColor}${Math.min(1, currentAlpha * 0.65)})`;
          fgCtx.lineWidth = Math.max(0.6, 1.6 * (1 - progress * 0.6));
          fgCtx.beginPath();
          fgCtx.arc(rip.x, rip.y, midRadius, 0, Math.PI * 2);
          fgCtx.stroke();
        }

        // Inner Tertiary Harmonic Ring
        if (currentRadius > 36) {
          const innerRadius = currentRadius * 0.38;
          fgCtx.strokeStyle = `${rip.tertiaryColor}${Math.min(1, currentAlpha * 0.45)})`;
          fgCtx.lineWidth = Math.max(0.5, 1.1 * (1 - progress * 0.6));
          fgCtx.beginPath();
          fgCtx.arc(rip.x, rip.y, innerRadius, 0, Math.PI * 2);
          fgCtx.stroke();
        }

        // Radial Orbital Micro-Sparks
        if (rip.sparks && rip.sparks.length > 0) {
          for (let s = 0; s < rip.sparks.length; s++) {
            const sp = rip.sparks[s];
            const dist = sp.speed * easeOut * 52;
            const sx = rip.x + Math.cos(sp.angle) * dist;
            const sy = rip.y + Math.sin(sp.angle) * dist;
            const spAlpha = Math.min(1, currentAlpha * boost);
            fgCtx.fillStyle = `${sp.color}${spAlpha})`;
            fgCtx.beginPath();
            fgCtx.arc(sx, sy, sp.size * (1 - progress * 0.5), 0, Math.PI * 2);
            fgCtx.fill();
          }
        }
      }

      // ─── URJA Mode: Prominent Solar Flare & Synchronous Cloud Dispersion ───
      if (isUrja) {
        const t = now * 0.001;

        // 1. Autonomous Continuous Natural Cloud Drift & Volumetric Rendering
        for (const c of uClouds) {
          c.rotAngle += c.rotSpeed * dt;

          // Continuous gentle weather drift across the horizon
          c.x += c.driftVx * dt;
          c.y += c.driftVy * dt;
          const waveX = Math.sin(t * 0.22 + c.phase) * 20;
          const waveY = Math.cos(t * 0.18 + c.phase * 1.3) * 14;

          // Seamless horizon wrap
          if (c.x > cssW + c.spreadRadius * 1.2) {
            c.x = -c.spreadRadius * 1.1;
          } else if (c.x < -c.spreadRadius * 1.2) {
            c.x = cssW + c.spreadRadius * 1.1;
          }
          if (c.y > cssH + c.spreadRadius) {
            c.y = -c.spreadRadius * 0.5;
          } else if (c.y < -c.spreadRadius) {
            c.y = cssH + c.spreadRadius * 0.5;
          }

          // Inertial momentum dampening
          c.vx *= Math.pow(0.94, dt);
          c.vy *= Math.pow(0.94, dt);
          c.dispX += c.vx * dt;
          c.dispY += c.vy * dt;
          c.dispX += (0 - c.dispX) * (1 - Math.pow(0.978, dt));
          c.dispY += (0 - c.dispY) * (1 - Math.pow(0.978, dt));

          const drawCx = c.x + c.dispX + waveX;
          const drawCy = c.y + c.dispY + waveY;

          // Check if cursor touches the cloud
          if (inBounds) {
            const dx = drawCx - mx;
            const dy = drawCy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Cloud boundary interaction
            if (dist < c.spreadRadius * 1.05) {
              const prox = 1 - dist / (c.spreadRadius * 1.05);

              // Steer cloud flight path with cursor momentum (no outward repulsion!)
              c.vx += mouse.vx * 0.10 * prox * dt;
              c.vy += mouse.vy * 0.10 * prox * dt;


            }
          }

          // Lobes spring gently back to rest position (no dispersion)
          for (const lobe of c.lobes) {
            lobe.dispX *= Math.pow(0.82, dt);
            lobe.dispY *= Math.pow(0.82, dt);
          }

          // ─── Render as ONE Smooth Volumetric Cloud Mass (Zero-Allocation Hardware Sprites) ───
          const visibleAlpha = Math.max(0, 1 - c.scatter * 0.88);
          const baseCloudAlpha = (0.50 + c.flarePower * 0.30) * visibleAlpha;

          if (baseCloudAlpha > 0.015) {
            bgCtx.globalAlpha = baseCloudAlpha;
            for (const lobe of c.lobes) {
              const lx = drawCx + lobe.relX + lobe.dispX;
              const ly = drawCy + lobe.relY + lobe.dispY;
              const diam = lobe.radius * 2;
              if (lobe.sprite) {
                bgCtx.drawImage(lobe.sprite, lx - lobe.radius, ly - lobe.radius, diam, diam);
              }
            }

            // Secondary softer pass for luminous golden highlights
            if (spriteHighlight) {
              for (let l = 0; l < c.lobes.length; l += 2) {
                const lobe = c.lobes[l];
                const lx = drawCx + lobe.relX + lobe.dispX;
                const ly = drawCy + lobe.relY + lobe.dispY - lobe.radius * 0.15;
                const hr = lobe.radius * 0.70;
                bgCtx.drawImage(spriteHighlight, lx - hr, ly - hr, hr * 2, hr * 2);
              }
            }
            bgCtx.globalAlpha = 1.0;
          }

          // ─── Render Textural Vapor Wisps (Torn pieces that drift & dissipate) ───
          if (c.wisps.length > 0 && spriteWisp) {
            for (let wi = c.wisps.length - 1; wi >= 0; wi--) {
              const w = c.wisps[wi];
              w.cx += w.vx * dt;
              w.cy += w.vy * dt;
              w.vy -= 0.008 * dt;
              w.vx *= Math.pow(0.985, dt);
              w.rotation += w.rotSpeed * dt;
              w.alpha -= w.decay * dt;

              if (w.alpha <= 0) {
                c.wisps.splice(wi, 1);
                continue;
              }

              const wx = drawCx + w.cx;
              const wy = drawCy + w.cy;

              bgCtx.save();
              bgCtx.translate(wx, wy);
              bgCtx.rotate(w.rotation);
              bgCtx.scale(w.scaleX, w.scaleY);
              bgCtx.globalAlpha = w.alpha;
              bgCtx.drawImage(spriteWisp, -w.radius, -w.radius, w.radius * 2, w.radius * 2);
              bgCtx.restore();
            }
            bgCtx.globalAlpha = 1.0;
          }


        }

        // Active CME Particles
        for (let eIdx = solarEjections.length - 1; eIdx >= 0; eIdx--) {
          const ej = solarEjections[eIdx];
          ej.x += ej.vx * dt;
          ej.y += ej.vy * dt;
          ej.vx *= Math.pow(0.96, dt);
          ej.vy *= Math.pow(0.96, dt);
          ej.alpha -= ej.decay * dt;

          if (ej.alpha <= 0) {
            solarEjections.splice(eIdx, 1);
            continue;
          }

          const tailLen = 8 * ej.alpha;
          const streakGrad = bgCtx.createLinearGradient(ej.x, ej.y, ej.x - ej.vx * tailLen, ej.y - ej.vy * tailLen);
          streakGrad.addColorStop(0, `${ej.color}${ej.alpha})`);
          streakGrad.addColorStop(1, "rgba(250, 248, 245, 0)");
          bgCtx.strokeStyle = streakGrad;
          bgCtx.lineWidth = ej.size;
          bgCtx.beginPath();
          bgCtx.moveTo(ej.x, ej.y);
          bgCtx.lineTo(ej.x - ej.vx * tailLen, ej.y - ej.vy * tailLen);
          bgCtx.stroke();

          bgCtx.fillStyle = `rgba(255, 255, 255, ${ej.alpha})`;
          bgCtx.beginPath();
          bgCtx.arc(ej.x, ej.y, ej.size * 0.8, 0, Math.PI * 2);
          bgCtx.fill();
        }

        // 3. Stable Daylight Motes (Restrained Glow & Magnetic Cursor Reactivity)
        for (const m of uMotes) {
          m.phase += m.twinkleSpeed * dt;
          const pulse = (Math.sin(m.phase) + 1) * 0.5;
          m.alpha = m.baseAlpha + pulse * (m.maxAlpha - m.baseAlpha);

          // Stable pinned location with calm micro-breathing
          m.x = m.baseX + Math.sin(t * 0.35 + m.phase) * 2.2;
          m.y = m.baseY + Math.cos(t * 0.28 + m.phase * 1.3) * 1.8;

          let drawMx = m.x;
          let drawMy = m.y;
          let ea = Math.max(0.35, Math.min(m.maxAlpha, m.alpha));

          // Gentle magnetic deflection & glow flare when cursor nears (Jungo style)
          if (inBounds) {
            const mdx = m.x - mx;
            const mdy = m.y - my;
            const dist2 = mdx * mdx + mdy * mdy;
            const reactR = 190;
            if (dist2 < reactR * reactR && dist2 > 0.01) {
              const mdist = Math.sqrt(dist2);
              const prox  = 1 - mdist / reactR;
              const ang   = Math.atan2(mdy, mdx);
              drawMx += Math.cos(ang) * prox * 22;
              drawMy += Math.sin(ang) * prox * 22;
              ea = Math.min(m.maxAlpha * 1.35, ea + prox * 0.55);
            }
          }

          // 1. Soft halo (Pre-rendered zero-allocation blit)
          const haloR = m.radius * m.haloMult;
          if (m.haloSprite) {
            fgCtx.globalAlpha = ea * 0.55;
            fgCtx.drawImage(m.haloSprite, drawMx - haloR, drawMy - haloR, haloR * 2, haloR * 2);
          }

          // 2. Coloured solid core disc
          fgCtx.globalAlpha = Math.min(1.0, ea * 0.92);
          fgCtx.fillStyle = m.coreColor;
          fgCtx.beginPath();
          fgCtx.arc(drawMx, drawMy, m.radius, 0, Math.PI * 2);
          fgCtx.fill();

          // 3. Starlight white pinpoint center
          fgCtx.globalAlpha = Math.min(1.0, ea * 0.80);
          fgCtx.fillStyle = "#FFFFFF";
          fgCtx.beginPath();
          fgCtx.arc(drawMx, drawMy, m.radius * 0.38, 0, Math.PI * 2);
          fgCtx.fill();
        }
        fgCtx.globalAlpha = 1.0;
      }

      // ─── Stars (Rendered on Background Deep-Space Canvas) ──────────────────
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.phase += star.twinkleSpeed * dt;
        const twinkleAmp = star.haloIntensity > 0.6 ? 0.32 : 0.18;
        star.alpha = star.baseAlpha + Math.sin(star.phase) * twinkleAmp;
        if (star.alpha < 0.08) star.alpha = 0.08;
        if (star.alpha > 1.0)  star.alpha = 1.0;

        let drawX = star.x;
        let drawY = star.y;
        let effectiveAlpha = star.alpha;

        // Cursor magnetic deflection + luminosity flare
        if (inBounds) {
          const mdx   = star.x - mx;
          const mdy   = star.y - my;
          const dist2 = mdx * mdx + mdy * mdy;
          if (dist2 < 140 * 140 && dist2 > 0.01) {
            const mdist = Math.sqrt(dist2);
            const prox  = 1 - mdist / 140;
            const ang   = Math.atan2(mdy, mdx);
            drawX += Math.cos(ang) * prox * 6;
            drawY += Math.sin(ang) * prox * 6;
            effectiveAlpha = Math.min(1.0, effectiveAlpha + prox * 0.4);
          }
        }

        // Halo — only Tier 2+ uses full radial gradient; Tier 1 uses cheap fill
        if (star.haloIntensity > 0 && star.glowMultiplier > 0) {
          const haloR = star.radius * star.glowMultiplier;
          const haloA = effectiveAlpha * star.haloIntensity;

          if (star.haloIntensity < 0.3) {
            bgCtx.globalAlpha = haloA;
            bgCtx.fillStyle = `${star.color}1)`;
            bgCtx.beginPath();
            bgCtx.arc(drawX, drawY, haloR, 0, Math.PI * 2);
            bgCtx.fill();
            bgCtx.globalAlpha = 1;
          } else {
            const g = bgCtx.createRadialGradient(drawX, drawY, 0, drawX, drawY, haloR);
            g.addColorStop(0,    `${star.color}${haloA})`);
            g.addColorStop(0.35, `${star.color}${haloA * 0.35})`);
            g.addColorStop(0.7,  `${star.color}${haloA * 0.1})`);
            g.addColorStop(1,    "rgba(0,0,0,0)");
            bgCtx.fillStyle = g;
            bgCtx.beginPath();
            bgCtx.arc(drawX, drawY, haloR, 0, Math.PI * 2);
            bgCtx.fill();
          }
        }

        // Star core
        bgCtx.fillStyle = `${star.coreColor}${Math.min(1, effectiveAlpha * 1.3)})`;
        bgCtx.beginPath();
        bgCtx.arc(drawX, drawY, star.radius, 0, Math.PI * 2);
        bgCtx.fill();

        // Diffraction spikes (Tier 3 only, JUNGO mode)
        if (isJungo && star.hasSpikes && effectiveAlpha > 0.6) {
          const spikeLen = star.radius * 3.8;
          bgCtx.strokeStyle = `${star.color}${effectiveAlpha * 0.45})`;
          bgCtx.lineWidth = 0.8;
          bgCtx.beginPath();
          bgCtx.moveTo(drawX - spikeLen, drawY);
          bgCtx.lineTo(drawX + spikeLen, drawY);
          bgCtx.moveTo(drawX, drawY - spikeLen);
          bgCtx.lineTo(drawX + spikeLen, drawY);
          bgCtx.stroke();
        }
      }

      // ─── Shooting Stars (Rendered on Background Canvas) ────────────────────
      if (isJungo) {
        const curTime = Date.now();
        if (curTime >= nextSpawnTime) spawnShootingStar();

        for (let j = shootingStars.length - 1; j >= 0; j--) {
          const m = shootingStars[j];
          m.x += m.dx * dt;
          m.y += m.dy * dt;
          m.alpha -= m.fadeSpeed * dt;

          if (m.alpha <= 0 || m.x < -200 || m.x > cssW + 200 || m.y > cssH + 200) {
            shootingStars.splice(j, 1);
            continue;
          }

          const tailX = m.x - (m.dx / m.speed) * m.length;
          const tailY = m.y - (m.dy / m.speed) * m.length;

          const tailGrad = bgCtx.createLinearGradient(m.x, m.y, tailX, tailY);
          tailGrad.addColorStop(0,   `${m.tailColor}${m.alpha * 0.95})`);
          tailGrad.addColorStop(0.2, `${m.tailColor}${m.alpha * 0.65})`);
          tailGrad.addColorStop(0.6, `${m.tailColor}${m.alpha * 0.2})`);
          tailGrad.addColorStop(1,   "rgba(0,0,0,0)");

          bgCtx.strokeStyle = tailGrad;
          bgCtx.lineWidth   = m.coreSize * 1.5;
          bgCtx.lineCap     = "round";
          bgCtx.beginPath();
          bgCtx.moveTo(m.x, m.y);
          bgCtx.lineTo(tailX, tailY);
          bgCtx.stroke();

          const headGrad = bgCtx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.coreSize * 4.5);
          headGrad.addColorStop(0,   `rgba(255,255,255,${m.alpha})`);
          headGrad.addColorStop(0.3, `${m.tailColor}${m.alpha * 0.85})`);
          headGrad.addColorStop(0.7, `${m.tailColor}${m.alpha * 0.25})`);
          headGrad.addColorStop(1,   "rgba(0,0,0,0)");

          bgCtx.fillStyle = headGrad;
          bgCtx.beginPath();
          bgCtx.arc(m.x, m.y, m.coreSize * 4.5, 0, Math.PI * 2);
          bgCtx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [theme]);

  // Dual-plane render: background stars behind content (z-0), foreground cursor aura & shockwaves in front (z-50)
  return (
    <>
      <canvas
        ref={bgCanvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ contain: "strict", transform: "translateZ(0)", opacity: 1 }}
      />
      <canvas
        ref={fgCanvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ contain: "strict", transform: "translateZ(0)", opacity: 1 }}
      />
    </>
  );
}