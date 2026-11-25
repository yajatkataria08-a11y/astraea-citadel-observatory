"use client";

import React, { useState } from "react";
import { Mail, MapPin, Send, CheckCircle2, Radio } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    subject: "Astrometric Pipeline Collaboration",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.playSuccess();
    setFormSubmitted(true);
  };

  return (
    <div className="cosmic-void-canvas min-h-screen text-foreground flex flex-col font-sans relative">
      
      {/* 1. Header Hero */}
      <ScrollReveal direction="down" duration={700}>
      <section className="pt-12 pb-10 px-4 md:px-8 max-w-[1780px] mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-600/30 dark:border-amber-400/30 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-xs font-mono text-[#1E1B4B] dark:text-[#E2E8F0]">
          <Mail className="size-3.5 text-[#B48A28] dark:text-[#D4AF37]" />
          <span>COMMUNICATION FREQUENCIES</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl font-black text-[#1E1B4B] dark:text-[#F8FAFC] tracking-tight max-w-3xl mx-auto leading-tight">
          Connect With The ASTRÆA Observatory
        </h1>

        <p className="text-base sm:text-lg text-slate-700 dark:text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed font-sans">
          Inquire regarding astronomical research collaborations, dedicated SPHEREx data access, API keys, or pipeline bug reports.
        </p>
      </section>
      </ScrollReveal>

      {/* 2. Main Content Grid */}
      <main className="p-4 md:px-8 space-y-12 max-w-[1780px] mx-auto w-full pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Contact Info & Observatory Coordinates */}
          <ScrollReveal direction="left" delay={60} duration={650}>
          <div className="space-y-6">
            <div className="glass-royal-deck rounded-3xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-6">
              <h2 className="font-serif text-xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                Observatory Telemetry &amp; Coordinates
              </h2>

              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-[#A5F3FC] shrink-0 border border-blue-500/20">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <div className="font-sans font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Astrometric Operations Center
                    </div>
                    <div className="text-slate-600 dark:text-[#CBD5E1] mt-0.5">
                      Palomar &amp; Cerro Tololo Remote Terminal
                    </div>
                    <div className="text-[#B48A28] dark:text-[#D4AF37] mt-0.5">
                      30°10&apos;04&quot; S, 70°48&apos;21&quot; W (Elev. 2,200m)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0 border border-purple-500/20">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <div className="font-sans font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Direct Dispatch Email
                    </div>
                    <a
                      href="mailto:inquiries@astraea-observatory.org"
                      className="text-[#3B82F6] dark:text-[#A5F3FC] hover:underline"
                    >
                      inquiries@astraea-observatory.org
                    </a>
                    <div className="text-slate-500 dark:text-[#94A3B8] text-[11px] mt-0.5">
                      PGP Encrypted Inquiries Welcome
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                    <Radio className="size-4" />
                  </div>
                  <div>
                    <div className="font-sans font-bold text-slate-900 dark:text-[#F8FAFC]">
                      Network Frequencies
                    </div>
                    <div className="text-slate-600 dark:text-[#CBD5E1]">
                      Deep Space Network Band X // Node 42
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5">
                      Status shown live on the home page
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="glass-royal-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-2 text-xs">
              <span className="font-serif font-bold text-slate-900 dark:text-[#F8FAFC]">
                Academic Consortium
              </span>
              <p className="text-slate-600 dark:text-[#CBD5E1] font-sans text-xs leading-relaxed">
                Operating under NASA Open Data directives. Datasets are licensed under CC-BY 4.0 for non-commercial astronomical research.
              </p>
            </div>
          </div>
          </ScrollReveal>

          {/* Right 2 Columns: Interactive Contact Form */}
          <div className="lg:col-span-2">
            <ScrollReveal direction="right" delay={120} duration={650}>
            <div className="glass-royal-deck rounded-3xl p-6 sm:p-8 border border-amber-600/25 dark:border-amber-400/20">
              {formSubmitted ? (
                <div className="py-16 text-center space-y-4 animate-fade-in">
                  <div className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                    Transmission Dispatched Successfully
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-[#CBD5E1] max-w-md mx-auto">
                    Thank you, {formData.name}. Your inquiry has been routed to the Science Operations Directorate. Expect a response within 24 astronomical hours.
                  </p>
                  <button
                    onClick={() => {
                      sfx.playClick();
                      setFormSubmitted(false);
                    }}
                    className="mt-4 px-5 py-2.5 rounded-xl border border-amber-600/30 dark:border-amber-400/30 text-xs font-serif font-bold text-[#1E1B4B] dark:text-[#E2E8F0] hover:bg-[#DDD6FE]/30"
                  >
                    Send Another Transmission
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h2 className="font-serif text-2xl font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                      Transmit An Inquiry
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-[#CBD5E1] mt-1">
                      Fill out the parameters below to establish contact with the observatory team.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-slate-700 dark:text-[#CBD5E1]">
                        Observer / Researcher Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Dr. Carl Sagan"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-[#070912]/70 border border-slate-300 dark:border-slate-800 text-sm focus:border-[#B48A28] dark:focus:border-[#D4AF37] focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-slate-700 dark:text-[#CBD5E1]">
                        Institutional Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="researcher@observatory.edu"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-[#070912]/70 border border-slate-300 dark:border-slate-800 text-sm focus:border-[#B48A28] dark:focus:border-[#D4AF37] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-slate-700 dark:text-[#CBD5E1]">
                        University / Institute Affiliation
                      </label>
                      <input
                        type="text"
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                        placeholder="Harvard-Smithsonian CfA"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-[#070912]/70 border border-slate-300 dark:border-slate-800 text-sm focus:border-[#B48A28] dark:focus:border-[#D4AF37] focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-slate-700 dark:text-[#CBD5E1]">
                        Inquiry Topic / Channel
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-[#070912]/70 border border-slate-300 dark:border-slate-800 text-sm focus:border-[#B48A28] dark:focus:border-[#D4AF37] focus:outline-none transition-colors"
                      >
                        <option value="Astrometric Pipeline Collaboration">
                          Astrometric Pipeline Collaboration
                        </option>
                        <option value="SPHEREx 102-Ch Spectrophotometry Access">
                          SPHEREx 102-Ch Spectrophotometry Access
                        </option>
                        <option value="Vetting Model & SHAP">
                          Vetting Model &amp; SHAP
                        </option>
                        <option value="Catalog / Backend Bug Report">
                          Catalog / Backend Bug Report
                        </option>
                        <option value="General Astronomical Press & Media">
                          General Astronomical Press &amp; Media
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-slate-700 dark:text-[#CBD5E1]">
                      Detailed Scientific Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Outline target coordinates, proposed spectroscopic band requirements, or model validation questions..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-[#070912]/70 border border-slate-300 dark:border-slate-800 text-sm focus:border-[#B48A28] dark:focus:border-[#D4AF37] focus:outline-none transition-colors leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="sheen-sweep flex items-center gap-2 rounded-2xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#1E1B4B] via-[#2E4A9E] to-[#4F46E5] text-white px-7 py-3.5 font-serif text-sm font-bold tracking-wider hover:scale-105 transition-all shadow-md active:scale-95"
                  >
                    <Send className="size-4 text-[#A5F3FC]" />
                    <span>TRANSMIT DISPATCH</span>
                  </button>
                </form>
              )}
            </div>
            </ScrollReveal>
          </div>
        </div>
      </main>
    </div>
  );
}

