# ASTRÆA Citadel Observatory // Exoplanet & Sky Change Explorer

Next-Generation Astrometric Vetting, SPHEREx 102-Channel Spectrophotometry, TESS/Kepler Transit Analysis, and LightGBM / TreeSHAP Explainable AI Attribution.

Developed by Computer Science & Engineering students at **VIT Bhopal University**.

---

## ⚡ Quick Start

### 1. Backend Engine (FastAPI + Parquet + SQLite)
Requires Python 3.10+ (tested through Python 3.14).

**Windows**:
```bat
start-backend.bat
```
Or manually:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
> Serves the FastAPI REST & SSE engine on **http://127.0.0.1:8000** (binds to `0.0.0.0:8000`).  
> Catalog health and 14,726 targets: `http://127.0.0.1:8000/api/v1/health`

### 2. Frontend Console (Next.js 15 + React 19 + Tailwind CSS)
Requires Node.js 18.18+ or 20+.

**Windows**:
```bat
start-frontend.bat
```
Or manually:
```powershell
cd frontend
npm install
npm run dev
# Or for optimized production:
npm run build
npm run start
```
> Opens the Observatory Console on **http://localhost:3000**.  
> Next.js proxies all `/api/v1/:path*` requests directly to `http://127.0.0.1:8000` with zero CORS issues.

---

## ✦ Aesthetic Themes & Visual Atmosphere

ASTRÆA features four distinct visual atmospheres switchable in real-time from the header HUD or Observatory Settings:

1. **URJA MODE ⚡** (*Solar Daylight Energy*):
   - Golden-amber daylight celestial canvas (`#FAF8F5` alabaster, `#C59B27` astrolabe gold, `#11162B` deep void indigo).
   - Atmospheric cloud swells, radiant solar motes, coronal prominences, and multi-harmonic shockwave rings.
2. **JUNGO MODE ✦** (*Deep Space Signature Hackathon Atmosphere*):
   - Deep void starlight nebula (`#090A0F` obsidian black, `#D4AF37` champagne gold, `#A5F3FC` astral cyan).
   - Dynamic canvas starfield with twinkling pinpricks, diffraction spikes, and shooting meteors.
3. **DARK VOID 🌙**: High-contrast astrophysics console with 240px astral cyan pointer aura.
4. **CELESTIAL LIGHT ☀️**: High-visibility starlight marble theme for bright ambient conditions.

---

## 🛡️ Authentication & Review Credentials

- **Sign In / Registration**: Controlled inputs with password strength tracker and scrypt password hashing.
- **Demo Operator Credentials**:
  - Email: `test@example.com`
  - Password: `password123`
  - Or click the **Quick Demo Fill** button on the login screen.
- **Guest Access**: Immediate guest review mode allowed without mandatory login.

---

## 📊 Real Astronomical Datasets & AI Models

- **14,726 Real Targets**:
  - `koi_cumulative.parquet` (10,447 Kepler Objects of Interest)
  - `toi_catalog.parquet` (2,409 TESS Objects of Interest)
  - `ps_confirmed_default.parquet` (4,293 confirmed NASA Exoplanet Archive targets)
- **Spectral Synthesis**: 102-channel spectrophotometry (0.75 µm to 5.0 µm) matching SPHEREx Linear Variable Filter resolution.
- **Transit Fitting**: 150-point Mandel-Agol limb-darkened transit light curves with observational scatter.
- **AI Vetting**: LightGBM classifier with held-out ROC-AUC of **0.977** and TreeSHAP explainability feature attribution.

---

## 🧪 Testing

```powershell
cd backend
python -m pytest tests
# 15/15 unit & integration tests passing
```
