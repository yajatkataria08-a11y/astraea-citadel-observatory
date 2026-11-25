"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function CitationsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Every entry below was checked against the publisher / arXiv record. Nothing here is invented.
  // `role` says honestly how the work relates to this project.
  const bibtexEntries = [
    {
      id: "astraea-software",
      title: "ASTRÆA Observatory (this software)",
      role: "Cite this if you use the project. Unpublished: there is no journal paper, so no DOI is claimed.",
      bibtex: `@misc{astraea2026,
  title={{ASTR{\\AE}A Observatory}: exoplanet candidate vetting console},
  author={{Team BroCode}},
  howpublished={Software, VIT Bhopal},
  year={2026},
  note={Unpublished project; scores are uncalibrated}
}`,
    },
    {
      id: "thompson2018",
      title: "Kepler DR25 planetary candidate catalog (KOI)",
      role: "Source of the Kepler KOI catalog used for training and browsing.",
      bibtex: `@article{thompson2018,
  title={Planetary Candidates Observed by Kepler. VIII. A Fully Automated Catalog with Measured Completeness and Reliability Based on Data Release 25},
  author={Thompson, Susan E. and Coughlin, Jeffrey L. and Hoffman, Kelsey and others},
  journal={The Astrophysical Journal Supplement Series},
  volume={235},
  number={2},
  pages={38},
  year={2018}
}`,
    },
    {
      id: "ricker2015",
      title: "TESS mission",
      role: "Source of the TESS Objects of Interest (TOI) data.",
      bibtex: `@article{ricker2015,
  title={Transiting Exoplanet Survey Satellite (TESS)},
  author={Ricker, George R. and Winn, Joshua N. and Vanderspek, Roland and others},
  journal={Journal of Astronomical Telescopes, Instruments, and Systems},
  volume={1},
  number={1},
  pages={014003},
  year={2015}
}`,
    },
    {
      id: "akeson2013",
      title: "NASA Exoplanet Archive",
      role: "Archive that hosts the KOI and TOI tables.",
      bibtex: `@article{akeson2013,
  title={The NASA Exoplanet Archive: Data and Tools for Exoplanet Research},
  author={Akeson, Rachel L. and Chen, Xi and Ciardi, David and others},
  journal={Publications of the Astronomical Society of the Pacific},
  volume={125},
  number={930},
  pages={989},
  year={2013}
}`,
    },
    {
      id: "ke2017",
      title: "LightGBM",
      role: "The gradient-boosting library behind the vetting model.",
      bibtex: `@inproceedings{ke2017lightgbm,
  title={LightGBM: A Highly Efficient Gradient Boosting Decision Tree},
  author={Ke, Guolin and Meng, Qi and Finley, Thomas and others},
  booktitle={Advances in Neural Information Processing Systems 30},
  pages={3146--3154},
  year={2017}
}`,
    },
    {
      id: "lundberg2020",
      title: "TreeSHAP explanations",
      role: "Method behind the SHAP attributions (exact TreeSHAP).",
      bibtex: `@article{lundberg2020,
  title={From local explanations to global understanding with explainable {AI} for trees},
  author={Lundberg, Scott M. and Erion, Gabriel and Chen, Hugh and others},
  journal={Nature Machine Intelligence},
  volume={2},
  number={1},
  pages={56--67},
  year={2020}
}`,
    },
    {
      id: "kopparapu2013",
      title: "Habitable-zone limits",
      role: "Reference for habitable-zone boundaries. The coefficients used in this project are NOT yet verified against it.",
      bibtex: `@article{kopparapu2013,
  title={Habitable Zones around Main-Sequence Stars: New Estimates},
  author={Kopparapu, Ravi Kumar and Ramirez, Ramses and Kasting, James F. and others},
  journal={The Astrophysical Journal},
  volume={765},
  number={2},
  pages={131},
  year={2013}
}`,
    },
    {
      id: "valizadegan2022",
      title: "ExoMiner & ExoMiner++ (External Benchmark Reference)",
      role: "External operational benchmark. ASTRÆA does not use ExoMiner's deep convolutional architecture; ASTRÆA uses an ensemble of gradient-boosted decision trees (LightGBM / HistGradientBoosting) and Random Forests on physical transit invariants with split conformal prediction.",
      bibtex: `@article{valizadegan2022,
  title={ExoMiner: A Highly Accurate and Explainable Deep Learning Classifier to Mine Exoplanets},
  author={Valizadegan, Hamed and Martinho, Miguel J. S. and Wilkens, Laurent S. and others},
  journal={The Astrophysical Journal},
  volume={926},
  number={2},
  pages={120},
  year={2022}
}`,
    },
    {
      id: "angelopoulos2021",
      title: "Split Conformal Prediction",
      role: "Theoretical foundation for ASTRÆA's finite-sample 95% coverage guarantees and the Active Learning abstain/triage band.",
      bibtex: `@article{angelopoulos2021gentle,
  title={A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification},
  author={Angelopoulos, Anastasios N. and Bates, Stephen},
  journal={arXiv preprint arXiv:2107.07511},
  year={2021}
}`,
    },
    {
      id: "dore2018",
      title: "SPHEREx mission (background, no data used)",
      role: "Background on the SPHEREx survey. No SPHEREx spectra are bundled, so charts show an empty-spectrum message.",
      bibtex: `@article{dore2018spherex,
  title={Science Impacts of the SPHEREx All-Sky Optical to Near-Infrared Spectral Survey II: Report of a Community Workshop on the Scientific Synergies Between the SPHEREx Survey and Other Astronomy Observatories},
  author={Dor{\\'e}, Olivier and others},
  journal={arXiv preprint arXiv:1805.05489},
  year={2018}
}`,
    },
  ];

  const copyToClipboard = (id: string, text: string) => {
    sfx.playClick(1100);
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

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
            <BookOpen className="size-4" /> BIBLIOGRAPHIC CITATIONS
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#1E1B4B] dark:text-[#F8FAFC]">
            Data Citation &amp; Open Access Records
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">
            BibTeX for the data, methods and software this project builds on. Please verify against the publisher record before submitting.
          </p>
        </div>
        </ScrollReveal>

        <div className="space-y-6">
          {bibtexEntries.map((entry) => (
            <div
              key={entry.id}
              className="glass-royal-deck rounded-2xl p-6 border border-amber-600/20 dark:border-amber-400/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1E1B4B] dark:text-[#F8FAFC]">
                    {entry.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">{entry.role}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(entry.id, entry.bibtex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-[#070912]/60 hover:border-[#B48A28] dark:hover:border-[#D4AF37] text-xs font-mono text-slate-700 dark:text-[#CBD5E1] transition-all"
                >
                  {copiedKey === entry.id ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy BibTeX</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-100/90 dark:bg-[#070912]/90 border border-slate-300 dark:border-slate-800 font-mono text-xs text-[#1E1B4B] dark:text-[#A5F3FC] overflow-x-auto">
                {entry.bibtex}
              </pre>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

