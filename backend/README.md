# ASTRAEA backend (FastAPI)

## Run (2 terminals)
Easiest: double-click / run `start-backend.bat` (Windows) or `./start-backend.sh`, then `start-frontend.bat` / `./start-frontend.sh` from the project root.

Manual:
```
# Terminal 1 - backend  (needs Python 3.10+)
cd backend
pip install -r requirements.txt
python run.py                       # http://127.0.0.1:8000  (docs at /docs)

# Terminal 2 - frontend
cd frontend
npm install
npm run dev                         # http://localhost:3000
```
- The API port opens only after catalogs load and the model trains (10-40 s). The frontend keeps retrying
  (and shows a yellow "Backend offline" pill), so order does not matter - it connects by itself.
- The frontend talks to `NEXT_PUBLIC_API_URL` if set, otherwise to `<same hostname as the page>:8000`.
  CORS allows any `localhost` / `127.0.0.1` port.
- Port busy? `PORT=8001 python run.py` and set `NEXT_PUBLIC_API_URL=http://localhost:8001` in `frontend/.env.local`.
- Accounts: `/login` (slide left = Sign Up, slide right = Sign In, or Continue as guest). Users live in the SQLite
  file under `backend/data/`. Passwords use scrypt; the token secret is auto-generated in `backend/data/secret.key`.
  Console pages (/pipelines, /shap) require sign-in or guest mode.

## What it does
| Endpoint (`/api/v1`) | Purpose |
|---|---|
| `GET /health` | catalog/model/astro-bridge status, model metrics, tripwire stats |
| `GET /targets?q=&catalog=&status=&sort=&limit=&offset=` | frontend `TargetRecord[]` (10,433 real KOI/TOI rows + 2 labelled synthetic demos) |
| `GET /targets/{id}`, `GET /shap/{id}` | one target; exact TreeSHAP (additive: baseline + impacts = score) |
| `GET /physics/{id}` | calls `astro/` B1: Monte Carlo HZ, radius-only composition, TSM/ESM priority |
| `POST /triage/{id}/verdict`, `GET /triage/{id}` | human review log (SQLite, `backend/data/triage.sqlite3`) |
| `POST /batch/scan`, `GET /batch/stream/{job}` (SSE), `GET /batch/{job}` | async scan of the full catalog with live progress |

## Link to the ML pipeline
`app/astro_bridge.py` puts `astro/` on `sys.path` and imports `src.project_b.b1_physics.*` (lazy, so a missing dep never kills the API).
The vetting model (`app/services/vetting.py`) is its own leak-free LightGBM on 8 catalog observables, group-split by kepid.
It deliberately does NOT import `astro/src/project_b/b2_vetting` (known leaks: row-index column, `kepid`, tier mapping, fold-rule mismatch).

## Honesty notes (also exposed in the API)
- Scores are uncalibrated model outputs; `scoreContext` says in_training / held_out / unlabelled / out_of_domain_tess.
- Real rows have no spectra and transit curves are model curves (`hasSpectrum`, `transitIsModel`).
- HZ coefficients are unverified (T9a/T9b open); `/physics` says so in every response.
- Centroid tripwire uses KOI `koi_dikco_msky`; threshold `CENTROID_SIGMA` (default 5) - rates in `/health`.

Tests: `cd backend && python -m pytest -q`

## Auth endpoints (`/api/v1/auth`)
`POST /signup` (name, email, password >= 8 chars) -> `{token, user}` | `POST /login` (5 failures / 10 min / email+IP, then 429) | `GET /me` (Bearer token).

## Social login
`GET /auth/providers`, `GET /auth/oauth/{google|microsoft|github}/start`, `GET /auth/oauth/{provider}/callback`. See `OAUTH_SETUP.md` in the project root.
