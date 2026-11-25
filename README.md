<div align="center">

<!-- Animated Deep-Space Astrolabe Header -->
<img src="docs/assets/banner.svg" alt="ASTRÆA Citadel Observatory Banner" width="100%" />

<br />

<!-- Animated Typing Tagline -->
<a href="#overview">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=18&duration=3200&pause=900&color=D4AF37&center=true&vCenter=true&width=820&lines=AI-Powered+Exoplanet+Vetting+%26+Habitability+Analysis;14%2C727+Real+Catalog+Targets+(KOI+%2B+PS+%2B+TOI);102-Channel+SPHEREx+Spectrophotometric+Synthesizer;TreeSHAP+Explainability+%2B+Monte+Carlo+Habitable+Zone" alt="Typing SVG" />
</a>

<br />

<!-- Tech Stack & Metric Badges -->
<p>
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-15.1.7-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/LightGBM-ROC--AUC%200.977-D4AF37?style=for-the-badge" alt="LightGBM ROC-AUC 0.977" />
  <img src="https://img.shields.io/badge/TESS%20v4-ROC--AUC%200.952-F59E0B?style=for-the-badge" alt="TESS v4 ROC-AUC 0.952" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
</p>

<!-- Quick Navigation Bar -->
<p>
  <a href="#overview">Overview</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#datasets--spectral-engine">Datasets</a> •
  <a href="#dual-scientific-pipelines">Pipelines</a> •
  <a href="#ai-vetting--shap-explainability">ML &amp; SHAP</a> •
  <a href="#api-reference">API</a> •
  <a href="#visual-themes">Themes</a> •
  <a href="#testing">Testing</a> •
  <a href="#references-research-papers--datasets">References</a>
</p>

</div>

---

## Overview

**ASTRÆA Citadel Observatory** is a full-stack astrophysics and explainable-AI mission control platform built for **exoplanet candidate vetting**, **habitability & composition modeling**, and **SPHEREx-style 102-channel sky-change anomaly detection**.

It unifies two complementary scientific pipelines behind a high-speed **FastAPI** backend and an interactive **Next.js 15 / React 19** observatory console:

- **14,727 real catalog rows** ingested from NASA Exoplanet Archive (`KOI`, `PS`) and TESS (`TOI`) Parquet tables.
- **Zero-leakage LightGBM vetting** (`0.977` KOI hold-out ROC-AUC; `0.952` TESS v4 fine-tuned ROC-AUC) with exact **TreeSHAP** per-target waterfall explanations.
- **Monte Carlo astrophysics engine** propagating stellar/orbital uncertainties through the **Chen–Kipping** mass–radius forecaster and **Kopparapu** habitable zone boundaries.
- **Real-time SSE batch scanning** in 250-row async chunks + persistent **SQLite triage verdicts**.

### Featured Demo Targets

| Target ID | Catalog / Type | Highlight |
| :--- | :--- | :--- |
| `TOI-700.02` | TESS (TOI) | Temperate Earth-sized habitable-zone candidate |
| `TOI-1452.01` | TESS (TOI) | Water-world / ocean-planet super-Earth candidate |
| `KOI-00351.01` | Kepler (KOI) | Multi-planet system (`Kepler-90`) benchmark |
| `DEMO-FUOR-01` | Project A Transient | FU Orionis-like young stellar outburst |
| `DEMO-ANOMALY-01` | Project A Anomaly | High-Mahalanobis IR-excess spectral outlier |

---

## Quick Start

<div align="center">
  <img src="docs/assets/quickstart.svg" alt="Animated Quick Start Guide" width="100%" />
</div>

### Option 1 — One-Click Windows Launchers

```powershell
# Terminal 1: Start FastAPI backend (http://127.0.0.1:8000)
.\start-backend.bat

# Terminal 2: Start Next.js frontend (http://localhost:3000)
.\start-frontend.bat
```

### Option 2 — Manual Setup (Windows PowerShell / Linux / macOS)

<details open>
<summary><b>Step-by-step terminal commands</b></summary>

```bash
# 1. Clone the repository
git clone https://github.com/yajatkataria08-a11y/astraea-citadel-observatory.git
cd astraea-citadel-observatory

# 2. Configure & start the FastAPI backend
cd backend
cp .env.example .env
pip install -r requirements.txt
python run.py
# → API live at http://127.0.0.1:8000 (Swagger UI: /docs, Health: /health)

# 3. Configure & start the Next.js 15 frontend (in a new terminal)
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
# → Observatory UI live at http://localhost:3000
```

</details>

> **Demo Credentials:** Email `test@example.com` · Password `password123`

---

## Architecture

<div align="center">
  <img src="docs/assets/architecture-flow.svg" alt="Animated System Architecture Flow" width="100%" />
</div>

ASTRÆA is organized into four cleanly decoupled layers:

1. **Data Lake (`astro/data/raw/` & `backend/data/`)**: Columnar Parquet catalogs (`14,727` targets) and SQLite triage/auth persistence.
2. **Scientific Core (`astro/src/`)**: Pure Python/NumPy/SciPy/LightGBM modules for Project A (sky change) and Project B (`b1_physics` + `b2_vetting`).
3. **FastAPI Engine (`backend/app/`)**: Async REST + SSE streaming server (`http://127.0.0.1:8000`) bridging `astro/` via `astro_bridge.py`.
4. **Next.js 15 Console (`frontend/src/`)**: Interactive App Router UI featuring `CosmicStarfield`, `AladinSkyMap`, `CatalogExplorer`, `ShapWaterfall`, `BatchScanModal`, `PlotlyChart`, and `TriagePanel`.

---

## Datasets & Spectral Engine

<div align="center">
  <img src="docs/assets/dataset-breakdown.svg" alt="Animated Dataset Breakdown & SPHEREx Spectral Ruler" width="100%" />
</div>

| Parquet File | Rows | Columns | Size | Role |
| :--- | ---: | ---: | ---: | :--- |
| `koi_cumulative.parquet` | 8,054 | 154 | 3.32 MB | Kepler Objects of Interest — primary LightGBM training & hold-out |
| `ps_confirmed_default.parquet` | 4,296 | 415 | 1.91 MB | NASA Confirmed Planetary Systems — mass-radius & HZ priors |
| `toi_catalog.parquet` | 2,377 | 55 | 0.60 MB | TESS Objects of Interest — cross-mission fine-tuning (`v4`) |
| **Total** | **14,727** | **—** | **5.83 MB** | **100% real NASA/TESS catalog data** |

- **SPHEREx 102-Channel Synthesizer**: Generates 102-channel spectrophotometric SEDs across **0.75–5.00 µm** (Bands 1–6) for transient & IR-excess analysis.
- **Mandel–Agol Transit Curves & Centroid Tripwire**: Synthesizes limb-darkened transit light curves and checks odd/even depth + centroid offsets.

---

## Dual Scientific Pipelines

<div align="center">
  <img src="docs/assets/dual-pipeline-infographic.svg" alt="Animated Dual Scientific Pipelines" width="100%" />
</div>

### Project A — SPHEREx Sky Change Explorer
1. **NEOWISE & Multi-Epoch Crosswalk**: Ingests 102-channel SEDs (`0.75–5.00 µm`) with moving-object quarantine.
2. **Variability & Spectral Typing**: Identifies FU Orionis outbursts, dippers, YSOs, and IR-excess templates.
3. **Anomaly Scoring & Injection Recovery**: Ranks outliers and validates completeness with synthetic signal injection.
4. **SHAP Ranker & Triage Queue**: Surfaces prioritized transient alerts (`DEMO-FUOR-01`, `DEMO-ANOMALY-01`).

### Project B — Habitability (`B1`) & ML Vetting (`B2`)
- **B1 Astrophysics (`astro_bridge.py` / `b1_physics/`)**: Monte Carlo uncertainty sampling → Chen–Kipping mass–radius forecasting → Kopparapu conservative & optimistic habitable zone evaluation.
- **B2 ML Vetting (`vetting.py` / `b2_vetting/`)**: Leak-free 8-feature LightGBM classifier + TreeSHAP waterfall + centroid/transit tripwire.

---

## AI Vetting & SHAP Explainability

<div align="center">
  <img src="docs/assets/ml-performance.svg" alt="Animated ML Performance & SHAP Feature Importance" width="100%" />
</div>

### Model Metrics

| Metric | KOI LightGBM | TESS v4 Fine-Tuned |
| :--- | :---: | :---: |
| **ROC-AUC** | **0.977** | **0.952** |
| **PR-AUC** | — | **0.907** |
| **Accuracy** | — | **0.902** (90.2%) |
| **F1 Score** | — | **0.864** |
| **Brier Score** | — | **0.079** |

### Leak-Free 8-Feature Set

| Feature | Display Name | Units | Role in Model |
| :--- | :--- | :--- | :--- |
| `period` | Orbital Period | days | Transit cadence & dynamical stability |
| `duration` | Transit Duration | hours | Stellar density & impact parameter proxy |
| `depth` | Transit Depth | ppm | Planet-to-star radius ratio $(R_p / R_*)^2$ |
| `prad` | Planet Radius | $R_\oplus$ | Physical size regime (Earth / Sub-Neptune / Giant) |
| `srad` | Stellar Radius | $R_\odot$ | Host star scale & dilution check |
| `steff` | Stellar Effective Temp | K | Host spectral type & luminosity |
| `slogg` | Stellar Surface Gravity | $\log_{10}(\text{cm/s}^2)$ | Dwarf vs. giant star discrimination |
| `snr` | Transit Signal-to-Noise | $\sigma$ | Detection statistical significance |

---

## API Reference

<div align="center">
  <img src="docs/assets/api-reference.svg" alt="Animated API Reference" width="100%" />
</div>

Base URL: `http://127.0.0.1:8000` · Interactive Swagger Docs: `/docs` · ReDoc: `/redoc`

<details>
<summary><b>All 11 Science Endpoints &amp; 6 Auth Endpoints</b></summary>

#### Science Endpoints (`backend/app/routers/api.py`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health & catalog readiness check |
| `GET` | `/model/info` | LightGBM model version, features, and metrics |
| `GET` | `/targets` | Paginated, filterable catalog explorer |
| `GET` | `/targets/featured` | Curated demo targets (`TOI-700.02`, `KOI-00351.01`, etc.) |
| `GET` | `/targets/{id}` | Full target telemetry, transit curve & vetting score |
| `GET` | `/shap/{id}` | Exact TreeSHAP waterfall feature contributions |
| `GET` | `/physics/{id}` | Monte Carlo HZ, insolation, $T_{eq}$, & Chen–Kipping mass |
| `POST` | `/triage/{id}/verdict` | Persist analyst triage verdict to SQLite |
| `POST` | `/batch/scan` | Launch asynchronous 250-row chunked batch scan |
| `GET` | `/batch/stream/{id}` | Server-Sent Events (SSE) real-time progress stream |
| `GET` | `/batch/{id}` | Poll batch job status & summary |

#### Authentication Endpoints (`backend/app/routers/auth.py`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register user with `scrypt` salted password hash |
| `POST` | `/auth/login` | Authenticate & receive HMAC-SHA256 bearer token |
| `GET` | `/auth/me` | Fetch authenticated user profile |
| `GET` | `/auth/oauth/{provider}/start` | Initiate OAuth2 PKCE flow (`google`, `github`, `microsoft`) |
| `GET` | `/auth/oauth/{provider}/callback` | Exchange OAuth2 code for session token |
| `DELETE` | `/auth/logout` | Revoke active session token |

</details>

---

## Visual Themes

<div align="center">
  <img src="docs/assets/themes-showcase.svg" alt="Animated 4-Theme Showcase" width="100%" />
</div>

Switch seamlessly between **4 observatory themes** via `/settings` (persisted in `localStorage` with automatic system-preference detection):
- **⚡ URJA** — Golden Solar light palette (`#FAF8F5` / `#C59B27` / `#11162B`)
- **✦ JUNGO** — Deep Space Void dark palette (`#090A0F` / `#D4AF37` / `#A5F3FC`)
- **🌙 DARK** — High-Contrast Obsidian
- **☀️ LIGHT** — Starlight Marble

---

## Authentication

- **Password Security**: `scrypt` salted hashing (`backend/app/services/auth.py`).
- **Session Tokens**: `HMAC-SHA256` signed bearer tokens with configurable `TOKEN_TTL_SECONDS`.
- **OAuth2 PKCE**: Built-in support for **Google**, **GitHub**, and **Microsoft** (see [OAUTH_SETUP.md](OAUTH_SETUP.md)).
- **Security Hygiene**: `backend/.env` and `secret.key` are gitignored; copy `backend/.env.example` for local setup.

---

## Testing

```bash
# Run backend API & service tests (15/15)
cd backend
python -m pytest tests

# Run astro scientific pipeline & ML tests
cd ../astro
python -m pytest tests
```

---

## Project Structure

<details>
<summary><b>Click to expand repository tree</b></summary>

```text
ASTRAEA2/
├── astro/
│   ├── checkpoints/          # Model metrics JSONs (v1–v4)
│   ├── config/settings.yaml  # Pipeline configuration
│   ├── data/raw/             # KOI, PS, TOI Parquet catalogs (14,727 rows)
│   ├── src/
│   │   ├── common/           # Crosswalk, splitting, inference, archive ingest
│   │   ├── project_a/        # SPHEREx sky-change, anomaly, NEOWISE, spectral typing
│   │   └── project_b/
│   │       ├── b1_physics/   # Sampler, Chen-Kipping, Kopparapu HZ, composition
│   │       └── b2_vetting/   # LightGBM, TreeSHAP, TESS fine-tuning
│   └── tests/                # Scientific pipeline & benchmark tests
├── backend/
│   ├── app/
│   │   ├── routers/          # api.py (11 endpoints), auth.py (6 endpoints)
│   │   ├── services/         # vetting, catalog, batch (SSE), triage, auth, oauth
│   │   └── astro_bridge.py   # Bridge to astro/ physics & ML core
│   ├── tests/                # FastAPI integration tests
│   ├── .env.example          # Environment template
│   └── run.py                # Uvicorn launcher
├── docs/assets/              # 9 animated SVG infographics, banner & footer
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js 15 App Router pages
│   │   └── components/       # CosmicStarfield, AladinSkyMap, ShapWaterfall, etc.
│   └── .env.example          # Frontend env template
├── OAUTH_SETUP.md            # OAuth2 PKCE provider setup guide
├── pipeline.md               # Detailed scientific pipeline specification
├── start-backend.bat/.sh     # One-click backend launchers
└── start-frontend.bat/.sh    # One-click frontend launchers
```

</details>

---

## References, Research Papers & Datasets

### Project Technical Report & Specification
- 📄 [**Sky Change Explorer and Exoplanet Habitability Quick-Look.pdf**](Sky%20Change%20Explorer%20and%20Exoplanet%20Habitability%20Quick-Look.pdf) — Bundled project design & quick-look paper covering Project A (SPHEREx sky-change explorer) and Project B (habitability & vetting).
- 📘 [**pipeline.md**](pipeline.md) / [**pipeline_rev5.md**](pipeline_rev5.md) — End-to-end scientific architecture and verification notes.

### Astronomical Datasets Used (`astro/data/raw/`)

All catalog tables are stored as columnar Parquet files (`14,727` total rows, ingested `2026-11-10T19:48:03Z` per [`snapshot_metadata.json`](astro/data/raw/snapshot_metadata.json)) sourced from the **NASA Exoplanet Archive** and verified research mirrors:

| Dataset | File | Rows × Cols | Primary Reference |
| :--- | :--- | ---: | :--- |
| **Kepler DR25 KOI Cumulative** | [`koi_cumulative.parquet`](astro/data/raw/koi_cumulative.parquet) | 8,054 × 154 | Thompson et al. (2018), *ApJS*, 235(2), 38 |
| **NASA Confirmed Planets (PS)** | [`ps_confirmed_default.parquet`](astro/data/raw/ps_confirmed_default.parquet) | 4,296 × 415 | Akeson et al. (2013), *PASP*, 125(930), 989 |
| **TESS Objects of Interest (TOI)** | [`toi_catalog.parquet`](astro/data/raw/toi_catalog.parquet) | 2,377 × 55 | Ricker et al. (2015), *JATIS*, 1(1), 014003 |

### Foundational Research Papers & Methods

| Work | Role in ASTRÆA | Citation |
| :--- | :--- | :--- |
| **Kepler DR25 Catalog** | Primary KOI training & hold-out dataset | Thompson, S. E., et al. (2018). *Planetary Candidates Observed by Kepler. VIII. A Fully Automated Catalog with Measured Completeness and Reliability Based on Data Release 25*. ApJS, 235(2), 38. |
| **TESS Mission** | Cross-mission TOI catalog & fine-tuning target set | Ricker, G. R., et al. (2015). *Transiting Exoplanet Survey Satellite (TESS)*. JATIS, 1(1), 014003. |
| **NASA Exoplanet Archive** | Archive hosting KOI, PS, and TOI tables | Akeson, R. L., et al. (2013). *The NASA Exoplanet Archive: Data and Tools for Exoplanet Research*. PASP, 125(930), 989. |
| **LightGBM** | Gradient-boosted decision tree classifier behind vetting | Ke, G., et al. (2017). *LightGBM: A Highly Efficient Gradient Boosting Decision Tree*. NeurIPS 30, 3146–3154. |
| **TreeSHAP** | Exact local & global feature attribution waterfall | Lundberg, S. M., et al. (2020). *From local explanations to global understanding with explainable AI for trees*. Nature Machine Intelligence, 2(1), 56–67. |
| **Habitable Zone Boundaries** | Conservative & optimistic HZ insolation limits (`B1`) | Kopparapu, R. K., et al. (2013). *Habitable Zones around Main-Sequence Stars: New Estimates*. ApJ, 765(2), 131. |
| **Probabilistic Mass–Radius** | Mass forecasting from planet radius (`B1`) | Chen, J., & Kipping, D. (2017). *Probabilistic Forecasting of the Masses and Radii of Other Worlds*. ApJ, 834(1), 17. |
| **Split Conformal Prediction** | Finite-sample uncertainty & triage abstain bands | Angelopoulos, A. N., & Bates, S. (2021). *A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification*. arXiv:2107.07511. |
| **SPHEREx Survey** | Background architecture for 102-ch IR sky-change (`Project A`) | Doré, O., et al. (2018). *Science Impacts of the SPHEREx All-Sky Optical to Near-Infrared Spectral Survey II*. arXiv:1805.05489. |
| **ExoMiner** | External deep-learning vetting benchmark reference | Valizadegan, H., et al. (2022). *ExoMiner: A Highly Accurate and Explainable Deep Learning Classifier to Mine Exoplanets*. ApJ, 926(2), 120. |

<details>
<summary><b>BibTeX Citations (click to expand)</b></summary>

```bibtex
@misc{astraea2026,
  title={{ASTR{\AE}A Observatory}: exoplanet candidate vetting console},
  author={{Team BroCode}},
  howpublished={Software, VIT Bhopal University},
  year={2026}
}

@article{thompson2018,
  title={Planetary Candidates Observed by Kepler. VIII. A Fully Automated Catalog with Measured Completeness and Reliability Based on Data Release 25},
  author={Thompson, Susan E. and Coughlin, Jeffrey L. and Hoffman, Kelsey and others},
  journal={The Astrophysical Journal Supplement Series},
  volume={235}, number={2}, pages={38}, year={2018}
}

@article{ricker2015,
  title={Transiting Exoplanet Survey Satellite (TESS)},
  author={Ricker, George R. and Winn, Joshua N. and Vanderspek, Roland and others},
  journal={Journal of Astronomical Telescopes, Instruments, and Systems},
  volume={1}, number={1}, pages={014003}, year={2015}
}

@article{akeson2013,
  title={The NASA Exoplanet Archive: Data and Tools for Exoplanet Research},
  author={Akeson, Rachel L. and Chen, Xi and Ciardi, David and others},
  journal={Publications of the Astronomical Society of the Pacific},
  volume={125}, number={930}, pages={989}, year={2013}
}

@inproceedings{ke2017lightgbm,
  title={LightGBM: A Highly Efficient Gradient Boosting Decision Tree},
  author={Ke, Guolin and Meng, Qi and Finley, Thomas and others},
  booktitle={Advances in Neural Information Processing Systems 30},
  pages={3146--3154}, year={2017}
}

@article{lundberg2020,
  title={From local explanations to global understanding with explainable {AI} for trees},
  author={Lundberg, Scott M. and Erion, Gabriel and Chen, Hugh and others},
  journal={Nature Machine Intelligence},
  volume={2}, number={1}, pages={56--67}, year={2020}
}

@article{kopparapu2013,
  title={Habitable Zones around Main-Sequence Stars: New Estimates},
  author={Kopparapu, Ravi Kumar and Ramirez, Ramses and Kasting, James F. and others},
  journal={The Astrophysical Journal},
  volume={765}, number={2}, pages={131}, year={2013}
}

@article{chen2017,
  title={Probabilistic Forecasting of the Masses and Radii of Other Worlds},
  author={Chen, Jingjing and Kipping, David},
  journal={The Astrophysical Journal},
  volume={834}, number={1}, pages={17}, year={2017}
}

@article{angelopoulos2021gentle,
  title={A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification},
  author={Angelopoulos, Anastasios N. and Bates, Stephen},
  journal={arXiv preprint arXiv:2107.07511}, year={2021}
}

@article{dore2018spherex,
  title={Science Impacts of the SPHEREx All-Sky Optical to Near-Infrared Spectral Survey II},
  author={Dor{\'e}, Olivier and others},
  journal={arXiv preprint arXiv:1805.05489}, year={2018}
}

@article{valizadegan2022,
  title={ExoMiner: A Highly Accurate and Explainable Deep Learning Classifier to Mine Exoplanets},
  author={Valizadegan, Hamed and Martinho, Miguel J. S. and Wilkens, Laurent S. and others},
  journal={The Astrophysical Journal},
  volume={926}, number={2}, pages={120}, year={2022}
}
```

</details>

---

<div align="center">
  <img src="docs/assets/footer.svg" alt="ASTRÆA Citadel Observatory Animated Footer" width="100%" />
</div>
