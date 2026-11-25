"use client";

import React from "react";
import Link from "next/link";
import {
  Sliders,
  Sparkles,
  MousePointer2,
  Volume2,
  VolumeX,
  Palette,
  CheckCircle2,
  Cpu,
  Eye,
  Radio,
  Bug,
  Sun,
  Moon,
  Zap,
  UserCheck,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useTheme, Theme } from "@/lib/theme-provider";
import { sfx } from "@/lib/audio-sfx";
import { useAuth } from "@/lib/auth";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function SettingsPage() {
  const { theme, setTheme, clickRings, toggleClickRings } = useTheme();
  const { user, guest, ready, logout } = useAuth();
  const [soundActive, setSoundActive] = React.useState(sfx.enabled);

  const handleToggleClickRings = () => {
    sfx.playClick(1100);
    toggleClickRings();
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    sfx.enabled = next;
    setSoundActive(next);
    if (next) sfx.playSuccess();
    else sfx.playClick(700);
  };

  const handleSelectTheme = (t: Theme) => {
    sfx.playClick(1200);
    setTheme(t);
  };

  const themeOptions: {
    id: Theme;
    name: string;
    tagline: string;
    icon: React.ReactNode;
    auraDesc: string;
    badge: string;
  }[] = [
    {
      id: "jungo",
      name: "JUNGO MODE ✦",
      tagline: "Celestial void with Champagne Gold, Astral Cyan flares, & shooting stars.",
      icon: <Bug className="size-5 text-[#A5F3FC]" />,
      auraDesc: "165px radiant Gold & Cyan flare with diffraction spikes",
      badge: "Signature Hackathon Theme",
    },
    {
      id: "urja",
      name: "URJA MODE ⚡",
      tagline: "Vibrant daylight solar canvas with atmospheric cloud swells & golden solar motes.",
      icon: <Zap className="size-5 text-[#C59B27] drop-shadow-[0_0_6px_rgba(197,155,39,0.9)]" />,
      auraDesc: "220px warm Astrolabe Gold & Astral Amethyst radiant flare with solar motes",
      badge: "Solar Energy Daytime Operations",
    },
    {
      id: "dark",
      name: "DARK VOID",
      tagline: "Deep space observatory with 240px expanded Astral Cyan aura.",
      icon: <Moon className="size-5 text-[#93C5FD]" />,
      auraDesc: "240px expanded Astral Cyan & Cobalt aura with starlight pinpricks",
      badge: "Astrophysics Standard",
    },
    {
      id: "light",
      name: "CELESTIAL LIGHT",
      tagline: "High-contrast marble starlight canvas with 250px luminous blue aura.",
      icon: <Sun className="size-5 text-amber-500" />,
      auraDesc: "250px expanded Celestial Cobalt & Sky Blue aura",
      badge: "Daylight Operations",
    },
  ];

  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      {/* 1. Header Hero */}
      <ScrollReveal direction="down" duration={700}>
        <section className="pt-12 pb-10 px-4 md:px-8 max-w-[1780px] mx-auto w-full text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-600/30 dark:border-amber-400/30 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-xs font-mono text-[#1E1B4B] dark:text-[#E2E8F0]">
            <Sliders className="size-3.5 text-[#B48A28] dark:text-[#D4AF37]" />
            <span>OBSERVATORY CONTROLS &amp; PREFERENCES</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-black text-[#1E1B4B] dark:text-[#F8FAFC] tracking-tight max-w-3xl mx-auto leading-tight">
            Citadel Settings &amp; Visual HUD
          </h1>

          <p className="text-base sm:text-lg text-slate-700 dark:text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed font-sans">
            Customize cursor kinematics, click shockwave rings, astrometric color palettes, and audio feedback.
          </p>
        </section>
      </ScrollReveal>

      {/* 2. Main Settings Grid */}
      <main className="p-4 md:px-8 space-y-8 max-w-[1780px] mx-auto w-full pb-16">
        
        {/* Settings Deck 1: Cursor & Click Shockwaves */}
        <ScrollReveal direction="up" delay={60} duration={650}>
          <div className="glass-royal-deck rounded-3xl p-6 md:p-8 border border-amber-600/20 dark:border-amber-400/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300/40 dark:border-slate-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-500/10 dark:bg-[#1E2761]/70 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#A5F3FC]">
                  <MousePointer2 className="size-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-2">
                    <span>Click Rings &amp; Shockwaves</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        clickRings
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-300/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-400/20"
                      }`}
                    >
                      {clickRings ? "ENABLED" : "MUTED"}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-[#CBD5E1]">
                    Toggle multi-harmonic expanding wave rings and orbital micro-sparks on mouse clicks.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleClickRings}
                className={`interactive-press relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 ease-in-out focus:outline-none ${
                  clickRings
                    ? "bg-gradient-to-r from-[#B48A28] to-[#D4AF37] border-[#B48A28] shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    : "bg-slate-300 dark:bg-slate-800 border-slate-400/40 dark:border-slate-700"
                }`}
                role="switch"
                aria-checked={clickRings}
                aria-label="Toggle click rings"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out mt-[2px] ${
                    clickRings ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Click test sandbox area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-[#0D111E]/80 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="text-xs font-mono font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <Zap className="size-3.5 text-[#B48A28] dark:text-[#D4AF37]" />
                  <span>CURRENT CONFIGURATION</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                  {clickRings ? (
                    <>
                      Harmonic waves are <strong>active</strong>. Each click produces a core flash, primary expansion wave, secondary harmonic ring, and 8-10 radial orbital micro-sparks.
                    </>
                  ) : (
                    <>
                      Harmonic rings are <strong>disabled</strong>. Pointer clicks will maintain smooth interaction without spawning radial shockwaves or sparks.
                    </>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF9F6] to-[#DDD6FE]/20 dark:from-[#0F1322] dark:to-[#1E2761]/30 border border-[#B48A28]/30 dark:border-[#D4AF37]/30 flex flex-col justify-between gap-3">
                <div className="text-xs font-mono font-bold text-[#1E1B4B] dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#3B82F6] dark:text-[#A5F3FC]" />
                  <span>LIVE INTERACTIVE TEST DECK</span>
                </div>
                <button
                  onClick={() => sfx.playClick(1000)}
                  className="interactive-press w-full py-2.5 px-4 rounded-xl font-serif text-xs font-bold tracking-wider text-white bg-gradient-to-r from-[#1E1B4B] via-[#2E4A9E] to-[#4F46E5] dark:from-[#2E4A9E] dark:via-[#5C1D42] dark:to-[#7A2048] border border-amber-500/30 shadow-md hover:shadow-lg transition-all"
                >
                  CLICK HERE TO TEST SHOCKWAVES
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Settings Deck 2: Theme Selection & Cosmic Aura */}
        <ScrollReveal direction="up" delay={120} duration={650}>
          <div className="glass-royal-deck rounded-3xl p-6 md:p-8 border border-amber-600/20 dark:border-amber-400/20 space-y-6">
            <div className="border-b border-slate-300/40 dark:border-slate-800/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/10 dark:bg-[#1E2761]/70 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-[#D4AF37]">
                  <Palette className="size-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                    Theme &amp; Cosmic Aura Atmosphere
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-[#CBD5E1]">
                    Select your preferred observatory aesthetic. Cursor aura dimensions adapt in real-time.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Theme Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectTheme(opt.id)}
                    className={`interactive-press text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "bg-[#DDD6FE]/60 dark:bg-[#1E2761]/80 border-[#B48A28] dark:border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]"
                        : "bg-slate-100/60 dark:bg-[#0D111E]/70 border-slate-200 dark:border-slate-800/70 hover:border-[#B48A28]/40 dark:hover:border-[#D4AF37]/40"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-[#070912] border border-slate-300/50 dark:border-slate-800">
                            {opt.icon}
                          </div>
                          <span className="font-serif font-black text-sm text-[#1E1B4B] dark:text-[#F8FAFC]">
                            {opt.name}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="size-4 text-[#B48A28] dark:text-[#D4AF37]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                        {opt.tagline}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-300/40 dark:border-slate-800/60 text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-[#A5F3FC]">
                        <Eye className="size-3" />
                        <span>Aura: {opt.auraDesc}</span>
                      </div>
                      <span className="inline-block text-[10px] font-bold text-[#B48A28] dark:text-[#D4AF37]">
                        {opt.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Settings Deck 3: Telemetry Audio HUD & Account Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Tactical Audio Feedback */}
          <ScrollReveal direction="left" delay={160} duration={650}>
            <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-5 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-300/40 dark:border-slate-800/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-purple-500/10 dark:bg-[#1E2761]/70 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-[#DDD6FE]">
                      <Radio className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                        Tactile Audio HUD
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-[#CBD5E1]">
                        Synthesizer audio clicks, blips, and alerts.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`interactive-press p-2 rounded-xl border transition-all ${
                      soundActive
                        ? "bg-[#DDD6FE]/60 dark:bg-[#1E2761]/90 border-[#B48A28] dark:border-[#D4AF37] text-[#1E1B4B] dark:text-[#F8FAFC]"
                        : "bg-slate-200/50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500"
                    }`}
                    title={soundActive ? "Mute SFX" : "Enable SFX"}
                  >
                    {soundActive ? <Volume2 className="size-4 animate-pulse" /> : <VolumeX className="size-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono text-slate-600 dark:text-[#94A3B8]">
                    Sound Trigger Previews:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => sfx.playClick()}
                      className="interactive-press py-1.5 px-2 rounded-lg bg-slate-200/60 dark:bg-[#070912] border border-slate-300 dark:border-slate-800 text-[11px] font-mono hover:border-[#B48A28]/40"
                    >
                      Click (1000Hz)
                    </button>
                    <button
                      onClick={() => sfx.playBlip()}
                      className="interactive-press py-1.5 px-2 rounded-lg bg-slate-200/60 dark:bg-[#070912] border border-slate-300 dark:border-slate-800 text-[11px] font-mono hover:border-[#B48A28]/40"
                    >
                      Blip (1600Hz)
                    </button>
                    <button
                      onClick={() => sfx.playSuccess()}
                      className="interactive-press py-1.5 px-2 rounded-lg bg-slate-200/60 dark:bg-[#070912] border border-slate-300 dark:border-slate-800 text-[11px] font-mono hover:border-[#B48A28]/40"
                    >
                      Success Chime
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] pt-3 border-t border-slate-300/40 dark:border-slate-800/60 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Audio Engine: Web Audio API Oscillator</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Account & Security Hub */}
          <ScrollReveal direction="right" delay={180} duration={650}>
            <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-5 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-300/40 dark:border-slate-800/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-emerald-500/10 dark:bg-[#1E2761]/70 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                        Operator Identity
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-[#CBD5E1]">
                        Authentication session &amp; review credentials.
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    user
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}>
                    {ready ? (user ? "AUTHENTICATED" : guest ? "GUEST MODE" : "UNAUTHENTICATED") : "LOADING"}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/60 dark:bg-[#070912] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-[#94A3B8]">Reviewer Alias:</span>
                    <span className="font-bold text-[#B48A28] dark:text-[#D4AF37]">
                      {user ? user.name : guest ? "Guest Observer" : "Anonymous"}
                    </span>
                  </div>
                  {user && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/60 dark:bg-[#070912] border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-[#94A3B8]">Email / Account:</span>
                      <span className="text-[#3B82F6] dark:text-[#A5F3FC] truncate max-w-[200px]">{user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/60 dark:bg-[#070912] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-[#94A3B8]">Password Encryption:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Scrypt Salted Hashes</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-300/40 dark:border-slate-800/60 flex items-center justify-between">
                {user ? (
                  <button
                    onClick={() => { sfx.playClick(800); logout(); }}
                    className="interactive-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-500 dark:text-red-400 font-mono text-xs hover:bg-red-500/20"
                  >
                    <LogOut className="size-3.5" /> Sign Out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => sfx.playClick(800)}
                    className="interactive-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#B48A28]/50 dark:border-[#D4AF37]/50 bg-gradient-to-r from-[#1E1B4B] to-[#3B82F6] text-white font-serif text-xs font-bold tracking-wide"
                  >
                    <LogIn className="size-3.5" /> Sign In / Create Account
                  </Link>
                )}

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  <span>SQLite Verified</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>

        {/* Engine Specs Pod */}
        <ScrollReveal direction="up" delay={200} duration={650}>
          <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-300/40 dark:border-slate-800/60 pb-3">
              <div className="size-9 rounded-xl bg-blue-500/10 dark:bg-[#1E2761]/70 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#A5F3FC]">
                <Cpu className="size-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                  Rendering &amp; Pipeline Architecture
                </h3>
                <p className="text-xs text-slate-600 dark:text-[#CBD5E1]">
                  Hardware acceleration parameters, inertial damping, and GPU canvas details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-[#070912] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 dark:text-[#94A3B8] block text-[10px]">CANVAS RATIO</span>
                <span className="font-bold text-[#B48A28] dark:text-[#D4AF37]">Adaptive DPR 1.5x</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-[#070912] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 dark:text-[#94A3B8] block text-[10px]">INERTIAL LERP</span>
                <span className="font-bold text-[#3B82F6] dark:text-[#A5F3FC]">0.16 Fluid Damping</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-[#070912] border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 dark:text-[#94A3B8] block text-[10px]">BACKGROUND SUSPEND</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">requestAnimationFrame</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

      </main>
    </div>
  );
}
