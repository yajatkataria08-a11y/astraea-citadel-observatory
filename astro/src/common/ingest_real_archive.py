"""
ingest_real_archive.py - Ingests and Formats Authentic NASA Exoplanet Archive Datasets

Ingests:
1. confirmed-planets.csv (NASA Exoplanet Archive confirmed planetary systems, default solutions)
2. kepler-kois-q1_q17_dr25.csv (Kepler DR25 cumulative KOI table)
3. tess-candidates.csv (TESS Objects of Interest / candidates table)

Saves clean, standardized Parquet files in data/raw/ with complete provenance metadata.
"""

import sys
import json
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd


BASE_URL = "https://raw.githubusercontent.com/elisaquintana/exoplots/master/data/"


def ingest_all(data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "ingest_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "source": "NASA Exoplanet Archive Verified Research Mirror (Elisa Quintana NASA exoplots repository)",
        "tables": {}
    }

    # 1. Confirmed Planets
    print("Ingesting confirmed planets table...")
    url_ps = BASE_URL + "confirmed-planets.csv"
    df_ps = pd.read_csv(url_ps, comment="#", low_memory=False)
    p_ps = data_dir / "ps_confirmed_default.parquet"
    df_ps.to_parquet(p_ps, index=False)
    metadata["tables"]["ps"] = {
        "rows": len(df_ps),
        "columns": len(df_ps.columns),
        "path": str(p_ps)
    }
    print(f"  -> Saved {len(df_ps)} confirmed planets to {p_ps}")

    # 2. Kepler KOIs (DR25)
    print("Ingesting Kepler DR25 KOI table...")
    url_koi = BASE_URL + "kepler-kois-q1_q17_dr25.csv"
    df_koi = pd.read_csv(url_koi, comment="#", low_memory=False)
    p_koi = data_dir / "koi_cumulative.parquet"
    df_koi.to_parquet(p_koi, index=False)
    metadata["tables"]["koi"] = {
        "rows": len(df_koi),
        "columns": len(df_koi.columns),
        "path": str(p_koi)
    }
    print(f"  -> Saved {len(df_koi)} Kepler KOIs to {p_koi}")

    # 3. TESS Candidates
    print("Ingesting TESS candidates table...")
    url_toi = BASE_URL + "tess-candidates.csv"
    df_toi = pd.read_csv(url_toi, comment="#", low_memory=False)
    p_toi = data_dir / "toi_catalog.parquet"
    df_toi.to_parquet(p_toi, index=False)
    metadata["tables"]["toi"] = {
        "rows": len(df_toi),
        "columns": len(df_toi.columns),
        "path": str(p_toi)
    }
    print(f"  -> Saved {len(df_toi)} TESS candidates to {p_toi}")

    # Save metadata
    meta_path = data_dir / "snapshot_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nIngest complete! All datasets archived in data/raw/")
    return metadata


if __name__ == "__main__":
    out_dir = Path("data/raw")
    ingest_all(out_dir)
