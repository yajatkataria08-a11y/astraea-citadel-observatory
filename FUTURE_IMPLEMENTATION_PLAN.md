# ASTRÆA Citadel Observatory // Future Implementation Plan & Technical Roadmap

**Project**: Next-Generation Astrometric Vetting, SPHEREx 102-Channel Spectrophotometry & Explainable AI  
**Institution**: VIT Bhopal University — School of Computing Science and Engineering (SCSE)  
**Event**: Internal Hackathon 2026  
**Document Revision**: 1.0 (Production Roadmap)  
**Date**: November 2026  

---

## 1. Executive Summary & Team Ownership

ASTRÆA Citadel Observatory is an end-to-end astronomical intelligence platform designed to replace opaque "black-box" machine learning with verifiable astrophysical tripwires and cooperative game theory Shapley value feature attribution. The system bridges raw space telescope telemetry (NASA TESS, Kepler, SPHEREx) with human-in-the-loop Active Learning triage.

### Engineering Squad (VIT Bhopal University)

| Member | Registration No. | Degree & Program | Primary Engineering Ownership |
| :--- | :--- | :--- | :--- |
| **Yajat Kataria** *(Team Leader)* | **25BCE10191** | B.Tech CSE (Core) | Full-stack Next.js 15 architecture, dual-pipeline UI orchestration, DuckDB columnar Parquet integration, CDS Aladin Lite v3 WebGL sync, Web Audio API tactile HUD, and Royal Cosmic 60-30-10 design system. |
| **Anushka Mathur** | **25BCE10039** | B.Tech CSE (Core) | Astrometric data modeling, Active Learning human-in-the-loop triage loop, Mandel-Agol transit fitting routines, SPHEREx linear variable filter error propagation, and multi-catalog schema validation. |
| **Saurjyesh Mekap** | **25BAI10312** | B.Tech CSE (AI & ML) | Physics-invariant vetting ensemble (LightGBM + HistGradientBoosting + Random Forest) on catalog features, split conformal prediction with active-learning abstain bands, and TreeSHAP explainability kernel for Shapley feature attribution, benchmarked against NASA ExoMiner operational metrics. |
| **Aklesh Swain** | **25BAI11184** | B.Tech CSE (AI & ML) | §1.3 difference-image centroid shift quarantine tripwire algorithm, Background Eclipsing Binary (BEB) rejection filters, Student's t-test odd-even transit depth consistency test, and MES / SNR thresholding. |

---

## 2. Current Architecture State

* **Frontend**: Next.js 15.1 (Turbopack) with 8 dedicated production pages (`/`, `/pipelines`, `/shap`, `/about`, `/contact`, `/privacy`, `/terms`, `/citations`).
* **Visualizers**:
  * **Interactive Aladin Lite v3**: WebGL celestial all-sky projection with synchronized crosshairs.
  * **Plotly.js (CDN)**: 102-channel spectrophotometry and phase-folded Mandel-Agol transit fits with sub-millisecond `Plotly.react` zero-flicker re-renders.
  * **D3.js**: Dynamic responsive SHAP waterfall attribution chart with live driver hover isolation.
* **Acoustic HUD**: Native browser **Web Audio API** tactile synthesizer with zero external audio assets.
* **Dual Design System**: Strict **60-30-10 palette discipline** in both **Celestial Light Mode** (Starlight & Marble `#FAF9F6`) and **Deep Space Void Dark Mode** (Obsidian `#090A0F`).
* **Scientific Core**: Full Python scientific pipeline in `astro/` implementing revision 5 specifications (`project_b` physics and vetting, `project_a` SPHEREx engine).

---

## 3. Target Full-Stack Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 15 FRONTEND (Port 3000)                      │
│   Command Deck • Orbital Radar • Aladin Lite v3 • D3 SHAP • Plotly      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / SSE / WebSockets
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI GATEWAY (Port 8000)                          │
│   Endpoints: /targets • /spherex • /vetting • /shap • /triage • /batch │
└──────────────┬─────────────────────┬────────────────────┬───────────────┘
               │                     │                    │
               ▼                     ▼                    ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐
     │  DUCKDB ENGINE   │  │   ASTRO BRIDGE   │  │   POSTGRESQL   │
     │  (Sub-10ms SQL)  │  │  (astro/src/...) │  │ (Triage State) │
     └─────────┬────────┘  └─────────┬────────┘  └────────────────┘
               │                     │
               ▼                     ▼
     ┌──────────────────┐  ┌──────────────────┐
     │ PARQUET ARCHIVES │  │ PHYSICS ENSEMBLE │
     │ koi_cumulative   │  │ & TREESHAP KERNEL│
     │ toi_catalog      │  └──────────────────┘
     └──────────────────┘
```

---

## 4. Phase-by-Phase Implementation Roadmap

### Phase 1: Backend Scaffolding & Columnar Parquet Engine
* **Objective**: Build high-throughput REST API serving multi-catalog targets from Parquet files in under 10 milliseconds.
* **Technology**: Python 3.11+, FastAPI, Uvicorn, DuckDB, Pydantic v2.
* **Deliverables**:
  1. `backend/app/main.py`: FastAPI server with CORS middleware allowing `http://localhost:3000`.
  2. `backend/app/services/duckdb_service.py`: Singleton connection executing vectorized queries on `astro/data/*.parquet`:
     ```sql
     SELECT id, host_key, alias, catalog, ra, dec, period_days,
            transit_depth_ppm, radius_earth, insolation_earth, teff_kelvin,
            status_badge, vetting_score, is_quarantined
     FROM read_parquet('data/*.parquet')
     WHERE id = $1;
     ```
  3. `GET /api/v1/targets`: Filterable endpoint with pagination and sexagesimal coordinate search.

### Phase 2: In-Process Astronomy Pipeline Bridge (`astro/`)
* **Objective**: Connect the existing scientific algorithms in `astro/src/` directly to API responses without shell execution overhead.
* **Deliverables**:
  1. `astro_bridge.py`: Python module importing directly from:
     * `astro.src.project_b.b1_physics.hz`: Kopparapu habitable zone boundaries ($S_{\text{eff}}$ limits).
     * `astro.src.project_b.b1_physics.composition`: Zeng rocky/volatile mixture models.
     * `astro.src.project_b.b2_vetting.candidate_priority`: Multi-evidence science scoring.
  2. `GET /api/v1/spherex/{id}/spectrum`: Serves calibrated 102-channel flux density ($F_\lambda$) array from 0.75 to 5.00 $\mu\text{m}$ with covariance matrices.
  3. `GET /api/v1/vetting/{id}/transit`: Generates phase-folded light curves ($\Phi \in [-0.5, 0.5]$) with analytical Mandel-Agol limb-darkened model fits.
  4. **§1.3 Centroid Shift Tripwire**:
     $$\Delta \vec{x}_{\text{cen}} = \vec{x}_{\text{diff}} - \vec{x}_\star$$
     If $|\Delta \vec{x}_{\text{cen}}| > 3.0\sigma$, flag target for automatic quarantine and populate `quarantine_reason`.

### Phase 3: Explainable AI & Dynamic TreeSHAP Kernel
* **Objective**: Compute real-time Shapley feature contributions on demand.
* **Technology**: PyTorch, LightGBM, `shap.TreeExplainer`.
* **Deliverables**:
  1. `backend/app/services/shap_service.py`: Loads pre-trained Exominer++ model weights and computes exact Shapley values:
     $$\phi_i(v) = \sum_{S \subseteq N \setminus \{i\}} \frac{|S|!(|N| - |S| - 1)!}{|N|!} \left[v(S \cup \{i\}) - v(S)\right]$$
  2. `GET /api/v1/shap/{id}`: Returns normalized feature vector:
     * `Transit Depth` ($\delta$)
     * `Centroid Shift` ($\Delta x_{\text{cen}}$)
     * `Orbital Period` ($P$)
     * `Secondary Eclipse Depth` ($\delta_{\text{sec}}$)
     * `Odd-Even Transit Consistency` ($t_{\text{stat}}$)
     * `Multiple Event Statistic` ($\text{MES}$)
  3. Feeds directly into frontend `ShapWaterfall.tsx` via standard schema.

### Phase 4: Frontend API Integration (`frontend-api-integration-patterns`)
* **Objective**: Replace static mock data with a production-grade resilient client layer.
* **Deliverables**:
  1. `frontend/src/lib/api-client.ts`:
     * Centralized `fetch` wrapper with `ApiError` normalization.
     * **Request Cancellation**: `AbortController` bound to target selector clicks to eliminate race conditions when scrubbing rapidly.
     * **Exponential Backoff**: Automatic retry for idempotent `GET` endpoints with jitter.
     * **Offline Fallback**: Seamless fallback to local mock data (`mock-astro-data.ts`) if the backend is offline, guaranteeing demo survival on stage.
  2. Custom React Hooks:
     * `useTarget(targetId)`
     * `useShapAttribution(targetId)`
     * `useCatalogSearch(filters)`
     * `useTriageMutation()`

### Phase 5: Asynchronous Celery Batch Processing & Real-Time SSE
* **Objective**: Power the `BatchScanModal` with distributed background tasks.
* **Technology**: Celery, Redis broker, Server-Sent Events (SSE).
* **Deliverables**:
  1. `POST /api/v1/batch/scan`: Triggers asynchronous batch FFT Box Least Squares (BLS) light curve scan and returns `job_id`.
  2. `GET /api/v1/batch/stream/{job_id}`: SSE endpoint streaming real-time progress percentages to drive the royal progress bar animation at 60 FPS.

### Phase 6: Human-in-the-Loop Active Learning Persistence
* **Objective**: Persist astronomer classifications to retrain the neural vetting network.
* **Technology**: PostgreSQL (or local SQLite) + SQLAlchemy 2.0 (`asyncpg`).
* **Deliverables**:
  1. Database Schema:
     ```sql
     CREATE TABLE triage_reviews (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         target_id VARCHAR(64) NOT NULL,
         verdict VARCHAR(16) NOT NULL CHECK (verdict IN ('CONFIRMED', 'BOGUS', 'UNRESOLVED')),
         astronomer_notes TEXT,
         reviewer_name VARCHAR(128) NOT NULL,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
     );
     CREATE INDEX idx_triage_target ON triage_reviews(target_id);
     ```
  2. `POST /api/v1/triage/{id}/verdict`: Commits astronomer votes with optimistic UI confirmation in `TriagePanel.tsx`.

---

## 5. Live Demonstration Strategy for Hackathon Judges

### 3-Minute Presentation Script Outline

* **0:00 – 0:45 | The Problem & The Team**:
  * Introduce **VIT Bhopal University** and the 4-member squad.
  * *Hook*: Over 90% of Kepler and TESS transit signals are astrophysical false positives (background binaries). Current AI classifiers act as opaque black boxes that astronomers cannot trust for multi-million dollar telescope allocation (JWST, Roman).
* **0:45 – 1:30 | Dual-Pipeline Architecture**:
  * Open **Pipelines Page** (`/pipelines`).
  * Demonstrate **Project 1 (SPHEREx 102-Channel Spectrophotometry)** with synchronized Aladin Lite v3 sky mapping.
  * Demonstrate **Project 2 (TESS/Kepler Transit Vetting)** with sub-second DuckDB columnar search across 5,500+ targets.
* **1:30 – 2:15 | Explainable AI & Physics Tripwires in Action**:
  * Switch to target `TIC-142276270` to trigger the **Pipeline Quarantine Banner (§1.3 Centroid Shift)**.
  * Navigate to the **SHAP Engine Page** (`/shap`).
  * Show how the negative centroid penalty bar pulls the vetting score down, revealing the false positive.
* **2:15 – 3:00 | Human-in-the-Loop Active Learning & Conclusion**:
  * Commit a triage verdict in the **Active Learning Panel** with auditory HUD confirmation.
  * Highlight the **clean architectural design system** (Royal Cosmic 60-30-10, accessible in both Dark and Light mode).
  * Conclude with future expansion plans to ingest real-time SPHEREx all-sky survey data.

---

## 6. One-Click Containerization Setup

To guarantee effortless evaluation by the judging panel, the project includes a root `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://astro:citadel@postgres:5432/astraea
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=astro
      - POSTGRES_PASSWORD=citadel
      - POSTGRES_DB=astraea
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

*Authored by Yajat Kataria, Anushka Mathur, Saurjyesh Mekap, and Aklesh Swain.*  
*VIT Bhopal University — Internal Hackathon 2026.*

