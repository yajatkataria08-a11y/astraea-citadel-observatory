"use client";

import React from "react";
import Link from "next/link";
import { Compass, Database } from "lucide-react";

export function Footer() {
  return (
    <footer className="glass-royal-deck relative border-t border-[#B48A28]/25 dark:border-[#D4AF37]/20 bg-[#FAF9F6]/90 dark:bg-[#070912]/95 backdrop-blur-2xl mt-12 py-10 px-4 md:px-8 z-20">
      <div className="max-w-[1780px] mx-auto space-y-8">
        {/* Top Tier: Brand, Descriptions, & Multi-Column Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Identity */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-[#B48A28]/40 dark:border-[#D4AF37]/40 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-[#1E1B4B] dark:text-[#E2E8F0]">
                <Compass className="size-4 text-[#B48A28] dark:text-[#D4AF37]" />
              </div>
              <span className="font-serif text-lg font-black tracking-wider text-[#1E1B4B] dark:text-[#F8FAFC]">
                ASTRÆA
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
              Citadel Observatory for high-cadence exoplanet discovery, SPHEREx 102-channel spectrophotometry, and explainable neural transit triage.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SPHEREx &bull; TESS &bull; Kepler Synced</span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-2">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#1E1B4B] dark:text-[#F8FAFC]">
              Navigation
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-[#CBD5E1]">
              <li>
                <Link href="/" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Observatory Home
                </Link>
              </li>
              <li>
                <Link href="/pipelines" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Pipelines &amp; Projects
                </Link>
              </li>
              <li>
                <Link href="/shap" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  SHAP Explainable AI
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  About &amp; Mission
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Observatory Settings
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Contact &amp; Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Astronomical Projects */}
          <div className="space-y-2">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#1E1B4B] dark:text-[#F8FAFC]">
              Observatory Projects
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-[#CBD5E1]">
              <li>
                <Link href="/pipelines#spherex" className="hover:text-[#3B82F6] dark:hover:text-[#A5F3FC] transition-colors flex items-center gap-1.5">
                  <span>Project 1: SPHEREx 102-Ch Engine</span>
                </Link>
              </li>
              <li>
                <Link href="/pipelines#tess-kepler" className="hover:text-[#4F46E5] dark:hover:text-[#A5F3FC] transition-colors flex items-center gap-1.5">
                  <span>Project 2: TESS/Kepler Vetting</span>
                </Link>
              </li>
              <li>
                <Link href="/shap#drivers" className="hover:text-[#6D28D9] dark:hover:text-[#A5F3FC] transition-colors flex items-center gap-1.5">
                  <span>LightGBM SHAP Attribution</span>
                </Link>
              </li>
              <li>
                <Link href="/pipelines#archive" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
                  <span>Parquet Catalog Archive</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal, Scientific Data & Compliance */}
          <div className="space-y-2">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#1E1B4B] dark:text-[#F8FAFC]">
              Scientific &amp; Legal
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-[#CBD5E1]">
              <li>
                <Link href="/privacy" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/citations" className="hover:text-[#B48A28] dark:hover:text-[#D4AF37] transition-colors">
                  Data Citation &amp; Open Access
                </Link>
              </li>
              <li className="pt-1 text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">
                NASA Astrophysics Data System Compliant
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Tier: Copyright, Hackathon Attribution & Telemetry Seal */}
        <div className="pt-6 border-t border-slate-300/50 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span>&copy; {new Date().getFullYear()} ASTRÆA Citadel Observatory.</span>
            <span className="opacity-40 hidden sm:inline">&bull;</span>
            <span className="text-[#B48A28] dark:text-[#D4AF37] font-semibold">
              VIT Bhopal University &bull; Internal Hackathon 2026
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 dark:text-[#CBD5E1] hidden xl:inline">
              Team: <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">Yajat Kataria</strong> (25BCE10191), <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">Anushka Mathur</strong> (25BCE10039), <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">Saurjyesh Mekap</strong> (25BAI10312) &amp; <strong className="text-[#1E1B4B] dark:text-[#F8FAFC]">Aklesh Swain</strong> (25BAI11184)
            </span>
            <span className="opacity-40 hidden lg:inline">&bull;</span>
            <span className="flex items-center gap-1 text-[#3B82F6] dark:text-[#A5F3FC]">
              <Database className="size-3" /> Parquet Catalogs
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

