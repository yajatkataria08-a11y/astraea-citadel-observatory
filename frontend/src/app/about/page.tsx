"use client";

import React from "react";
import Link from "next/link";
import { Compass, Sparkles, ShieldCheck, Database, Cpu, Users, CheckCircle2, FileCode2, Globe2, ArrowRight, GraduationCap, Trophy, BrainCircuit, Binary } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function AboutPage() {
  const teamMembers = [
    {
      name: "Yajat Kataria",
      role: "Team Leader & Astrometric Architecture Lead",
      regNo: "25BCE10191",
      degree: "B.Tech Computer Science and Engineering (CORE)",
      institution: "VIT Bhopal University",
      badgeColor: "bg-amber-500/20 text-[#B48A28] dark:text-[#D4AF37] border-amber-500/40",
      contributions: [
        "Full-stack Next.js 15 & Turbopack reactive observatory architecture",
        "Dual-pipeline orchestration (SPHEREx 102-ch & TESS transit vetting engine)",
        "In-memory Parquet catalog queries via the FastAPI backend (pandas)",
        "CDS Aladin Lite v3 celestial WebGL coordinate synchronization",
        "Web Audio API HUD tactile synthesizer and Royal Cosmic 60-30-10 design system",
      ],
    },
    {
      name: "Anushka Mathur",
      role: "Core Researcher & Systems Engineering Lead",
      regNo: "25BCE10039",
      degree: "B.Tech Computer Science and Engineering (CORE)",
      institution: "VIT Bhopal University",
      badgeColor: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40",
      contributions: [
        "Astrometric data modeling & active learning human-in-the-loop triage loop",
        "Mandel-Agol analytical limb-darkened transit light curve fitting routines",
        "SPHEREx linear variable filter (0.75-5.0 µm) flux density error propagation",
        "Cross-matching Kepler KOI and TESS TOI multi-epoch catalog schema validation",
        "State synchronization between client telemetry decks and backend repositories",
      ],
    },
    {
      name: "Saurjyesh Mekap",
      role: "AI & Neural Vetting Specialist",
      regNo: "25BAI10312",
      degree: "B.Tech Computer Science and Engineering (AI & ML)",
      institution: "VIT Bhopal University",
      badgeColor: "bg-blue-500/20 text-blue-700 dark:text-[#A5F3FC] border-blue-500/40",
      contributions: [
        "LightGBM vetting classifier training and evaluation",
        "TreeSHAP explainability kernel for computing Shapley feature contributions",
        "Neural attribution weighting across transit depth, period, and stellar surface gravity",
        "Model benchmark validation against synthetic Kepler transit injection datasets",
        "Explainable AI (XAI) feature importance ranking and diagnostic visualization",
      ],
    },
    {
      name: "Aklesh Swain",
      role: "Machine Learning & Astrophysical Data Lead",
      regNo: "25BAI11184",
      degree: "B.Tech Computer Science and Engineering (AI & ML)",
      institution: "VIT Bhopal University",
      badgeColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
      contributions: [
        "§1.3 difference-image centroid shift quarantine tripwire algorithm implementation",
        "Background Eclipsing Binary (BEB) statistical false-positive rejection filters",
        "Odd-Even transit depth consistency Student's t-test statistical pipeline",
        "Multiple Event Statistic (MES / SNR) noise thresholding and Box Least Squares (BLS)",
        "Secondary eclipse depth ratio detection to identify luminous companion occultations",
      ],
    },
  ];

  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      
      {/* 1. Header Hero with Hackathon Distinction */}
      <ScrollReveal direction="down" duration={700}>
      <section className="pt-12 pb-10 px-4 md:px-8 max-w-[1780px] mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-600/30 dark:border-amber-400/30 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-xs font-mono text-[#1E1B4B] dark:text-[#E2E8F0] shadow-sm">
          <Trophy className="size-3.5 text-[#B48A28] dark:text-[#D4AF37]" />
          <span className="font-bold">VIT BHOPAL UNIVERSITY // INTERNAL HACKATHON 2026</span>
          <span className="opacity-40">&bull;</span>
          <span className="text-[#3B82F6] dark:text-[#A5F3FC]">4-MEMBER ENGINEERING SQUAD</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black text-[#1E1B4B] dark:text-[#F8FAFC] tracking-tight max-w-4xl mx-auto leading-tight">
          Engineered for Discovery at{" "}
          <span className="bg-gradient-to-r from-[#1E1B4B] via-[#4F46E5] to-[#3B82F6] dark:from-[#D4AF37] dark:via-[#A5F3FC] dark:to-[#E2E8F0] bg-clip-text text-transparent">
            VIT Bhopal
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-700 dark:text-[#CBD5E1] max-w-3xl mx-auto leading-relaxed font-sans">
          Developed by Computer Science &amp; Engineering students (Core and AI/ML) at <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">VIT Bhopal University</strong> for the Internal Hackathon. ASTRÆA replaces opaque &ldquo;black-box&rdquo; deep learning with interpretable, mathematically rigorous exoplanet validation grounded in real astrophysical laws.
        </p>

        {/* Hackathon Project Highlights */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-[#A5F3FC] border border-blue-500/20 flex items-center gap-1.5">
            <GraduationCap className="size-3.5" /> B.Tech CSE (Core) &amp; (AI &amp; ML)
          </span>
          <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1.5">
            <BrainCircuit className="size-3.5" /> LightGBM &amp; TreeSHAP
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Database className="size-3.5" /> Parquet Catalogs
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-[#B48A28] dark:text-[#D4AF37] border border-amber-500/20 flex items-center gap-1.5">
            <Binary className="size-3.5" /> SPHEREx 102-Ch Spectrophotometry
          </span>
        </div>
      </section>
      </ScrollReveal>

      {/* 2. Team Section: All 4 Members */}
      <main className="p-4 md:px-8 space-y-12 max-w-[1780px] mx-auto w-full pb-16">
        
        <section className="space-y-6">
          <ScrollReveal direction="up" duration={650}>
          <div className="border-b border-amber-600/25 dark:border-amber-400/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#B48A28] dark:text-[#D4AF37]">
                <Users className="size-3.5" /> HACKATHON INNOVATION TEAM
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                Project Creators &amp; System Architects
              </h2>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-[#B48A28] dark:text-[#D4AF37] border border-amber-500/30">
              VIT Bhopal University &bull; Internal Hackathon 2026
            </span>
          </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamMembers.map((member, idx) => (
              <ScrollReveal key={member.name} direction={idx % 2 === 0 ? "left" : "right"} delay={idx * 80} duration={700}>
              <div
                className="glass-royal-deck relative rounded-3xl p-6 sm:p-8 border border-amber-600/25 dark:border-amber-400/25 flex flex-col justify-between space-y-6 group hover:border-[#B48A28] dark:hover:border-[#D4AF37] transition-all duration-300"
              >
                <div className="reticle-bracket-tl" />
                <div className="reticle-bracket-br" />

                <div className="space-y-4">
                  {/* Member Name & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-2xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
                          {member.name}
                        </h3>
                        {member.role.includes("Leader") && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-[#B48A28] dark:text-[#D4AF37] border border-amber-500/40 font-bold">
                            TEAM LEADER
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-serif font-bold text-[#3B82F6] dark:text-[#A5F3FC] mt-0.5">
                        {member.role}
                      </div>
                    </div>

                    <div className="text-right sm:text-right font-mono">
                      <span className="text-xs font-bold text-[#1E1B4B] dark:text-[#F8FAFC] px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-[#1E2761]/60 border border-slate-300 dark:border-slate-700 inline-block shadow-sm">
                        {member.regNo}
                      </span>
                    </div>
                  </div>

                  {/* Academic Credentials */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1]">
                      <GraduationCap className="size-4 text-[#B48A28] dark:text-[#D4AF37] shrink-0" />
                      <span>{member.degree}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-[#94A3B8]">
                      <Compass className="size-4 text-emerald-500 shrink-0" />
                      <span>{member.institution}</span>
                    </div>
                  </div>

                  {/* Engineering Contributions */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] block">
                      Core Engineering Ownership:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-[#CBD5E1] font-sans">
                      {member.contributions.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] flex items-center justify-between">
                  <span>VIT Bhopal University</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">&bull; Internal Hackathon 2026</span>
                </div>
              </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* 3. Core Innovation Pillars */}
        <section className="space-y-6 pt-4">
          <div className="text-center space-y-1 max-w-2xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
              Astronomical Innovation Pillars
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1]">
              How our 4-member VIT Bhopal team solved real astrophysical data bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-3">
              <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-[#A5F3FC] border border-blue-500/20">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                Physical Law Verification
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                Every candidate must survive strict physical tripwires, including difference-image centroid shifts (§1.3), secondary occultation depths, and odd-even transit duration equality.
              </p>
            </div>

            <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-3">
              <div className="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-300 border border-purple-500/20">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                Explainable SHAP AI
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                No arbitrary probabilities. Our LightGBM gradient-boosted model reports cooperative game theory Shapley values for every photometric, astrometric, and stellar feature.
              </p>
            </div>

            <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Database className="size-5" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                Parquet Catalog Engine
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                Columnar Parquet storage for over 5,500 Kepler (KOI) and TESS (TOI) multi-epoch targets, delivering instantaneous client-side filtering and phase folding.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Architectural Stack */}
        <section className="glass-royal-deck rounded-3xl p-8 border border-amber-600/25 dark:border-amber-400/20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B48A28] dark:text-[#D4AF37]">
                TECHNICAL STACK ARCHITECTURE
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                Enterprise Astronomical Engineering
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-[#94A3B8]">
              VIT Bhopal University &bull; Hackathon Production Build
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="glass-royal-card rounded-2xl p-4 border border-slate-300 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-[#3B82F6] dark:text-[#A5F3FC] font-serif font-bold">
                <Database className="size-4" />
                <span>Columnar Storage</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] font-sans">
                FastAPI backend loading Parquet catalogs into typed in-memory pandas frames.
              </p>
            </div>

            <div className="glass-royal-card rounded-2xl p-4 border border-slate-300 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-[#4F46E5] dark:text-purple-400 font-serif font-bold">
                <Cpu className="size-4" />
                <span>Asynchronous Workers</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] font-sans">
                Asynchronous batch catalog scanning in the FastAPI backend, streamed live to the UI over Server-Sent Events.
              </p>
            </div>

            <div className="glass-royal-card rounded-2xl p-4 border border-slate-300 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-serif font-bold">
                <Globe2 className="size-4" />
                <span>CDS Sky Mapping</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] font-sans">
                Aladin Lite v3 WebGL engine projecting HiPS all-sky surveys with crosshair coordinate sync.
              </p>
            </div>

            <div className="glass-royal-card rounded-2xl p-4 border border-slate-300 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-[#B48A28] dark:text-[#D4AF37] font-serif font-bold">
                <FileCode2 className="size-4" />
                <span>Scientific Plotly &amp; D3</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] font-sans">
                Sub-millisecond Plotly.react charts and responsive D3.js SHAP waterfall visualizations.
              </p>
            </div>
          </div>
        </section>

        {/* 5. CTA Button */}
        <section className="text-center pt-6">
          <Link
            href="/pipelines"
            onClick={() => sfx.playSelect()}
            className="sheen-sweep inline-flex items-center gap-2 rounded-2xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#1E1B4B] via-[#2E4A9E] to-[#4F46E5] text-white px-8 py-4 font-serif text-sm font-bold tracking-wider hover:scale-105 shadow-xl transition-all duration-200"
          >
            <span>LAUNCH OBSERVATORY CONSOLE</span>
            <ArrowRight className="size-4" />
          </Link>
        </section>

      </main>
    </div>
  );
}
