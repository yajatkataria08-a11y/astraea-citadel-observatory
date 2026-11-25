"""Paths and settings. Everything can be overridden with environment variables."""
import os
from pathlib import Path

# backend/app/config.py -> parents[2] is the project root (the folder holding astro/, backend/, frontend/)
ROOT = Path(__file__).resolve().parents[2]
ASTRO_DIR = Path(os.getenv("ASTRO_DIR", ROOT / "astro"))
DATA_DIR = Path(os.getenv("ASTRO_DATA_DIR", ASTRO_DIR / "data" / "raw"))
DB_PATH = Path(os.getenv("TRIAGE_DB", ROOT / "backend" / "data" / "triage.sqlite3"))
# Extra origins (comma separated) on top of the always-allowed local dev origins below.
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
# Any local port on localhost, 127.0.0.1, [::1], or private LAN IPs (10.*, 172.16-31.*, 192.168.*)
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$"
)

API_PREFIX = "/api/v1"
SEED = int(os.getenv("ASTRO_SEED", "42"))
N_DRAWS = int(os.getenv("ASTRO_N_DRAWS", "10000"))

# Centroid tripwire threshold (sigma). 3 sigma quarantines ~10% of CONFIRMED KOIs in the bundled snapshot;
# 5 sigma is the default here. See tripwire stats in /api/v1/health.
CENTROID_SIGMA = float(os.getenv("CENTROID_SIGMA", "5.0"))

# Auth
DATA_DIR_BACKEND = Path(os.getenv("ASTRAEA_DATA", ROOT / "backend" / "data"))
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(7 * 24 * 3600)))

# OAuth ("Sign in with Google / Microsoft / GitHub"). A provider is enabled when both its id and secret are set.
# Redirect URI to register at each provider:  {BACKEND_PUBLIC_URL}/api/v1/auth/oauth/<provider>/callback
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
OAUTH_CLIENTS = {
    "google": (os.getenv("GOOGLE_CLIENT_ID", ""), os.getenv("GOOGLE_CLIENT_SECRET", "")),
    "microsoft": (os.getenv("MICROSOFT_CLIENT_ID", ""), os.getenv("MICROSOFT_CLIENT_SECRET", "")),
    "github": (os.getenv("GITHUB_CLIENT_ID", ""), os.getenv("GITHUB_CLIENT_SECRET", "")),
}
MICROSOFT_TENANT = os.getenv("MICROSOFT_TENANT", "common")  # "common" = any work/school/personal account
