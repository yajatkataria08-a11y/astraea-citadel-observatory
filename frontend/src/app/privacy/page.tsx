"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function PrivacyPage() {
  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      <main className="p-4 md:px-8 max-w-4xl mx-auto w-full py-12 space-y-8">
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-[#94A3B8] hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>RETURN TO OBSERVATORY HOME</span>
        </Link>

        <ScrollReveal direction="down" duration={600}>
        <div className="space-y-2 border-b border-slate-300 dark:border-slate-800 pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#B48A28] dark:text-[#D4AF37]">
            <ShieldCheck className="size-4" /> LEGAL &amp; DATA GOVERNANCE
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
            Observatory Privacy Policy
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">
            Effective Date: November 2026 &bull; NASA Astrophysics Open Science Compliant
          </p>
        </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={80} duration={650}>
        <div className="glass-royal-deck rounded-3xl p-6 sm:p-8 border border-amber-600/20 dark:border-amber-400/20 space-y-6 text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
              1. Open Science Data Architecture
            </h2>
            <p>
              ASTRÆA Citadel Observatory operates under the principles of open astrophysics. All astronomical telemetry, light curves, spectrophotometric cubes, and neural SHAP attribution weights published on this platform derive from publicly accessible NASA, ESA, and CDS Strasbourg missions (including Kepler, TESS, and SPHEREx).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
              2. Visitor Telemetry &amp; Analytics
            </h2>
            <p>
              We prioritize user privacy and minimize tracking. When you interact with our observatory consoles:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong>No Personal Tracking:</strong> We do not sell, rent, or monetize visitor interaction data.
              </li>
              <li>
                <strong>Client-Side Storage:</strong> Your theme preferences (Dark/Light) and tactile HUD audio states are stored solely in your local browser session via <code>localStorage</code>.
              </li>
              <li>
                <strong>Astronomical Triage Logs:</strong> Classifications submitted via the Human-in-the-Loop Triage Panel are pseudonymized and committed solely for model retraining audits.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
              3. Columnar In-Memory Processing
            </h2>
            <p>
              Our Parquet catalog service runs evaluations within isolated compute threads. Target searches, filtering criteria, and coordinate lookups execute with client privacy preserved.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
              4. Contact &amp; Data Rectification
            </h2>
            <p>
              For privacy queries or requests to purge submitted triage notes from the active learning corpus, reach out to{" "}
              <a href="mailto:privacy@astraea-observatory.org" className="text-[#3B82F6] dark:text-[#A5F3FC] hover:underline font-mono">
                privacy@astraea-observatory.org
              </a>.
            </p>
          </section>
        </div>
        </ScrollReveal>
      </main>
    </div>
  );
}

