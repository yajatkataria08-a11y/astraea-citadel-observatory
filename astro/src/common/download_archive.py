"""
download_archive.py - NASA Exoplanet Archive Snapshot Downloader

Specification Reference: §1.1, §2.1
- Pulls confirmed planets (table 'ps', default_flag=1).
- Pulls Kepler KOI cumulative catalog (table 'cumulative').
- Pulls TESS TOI catalog (table 'toi').
- Saves snapshots as Parquet in data/raw/ with row counts, retrieval date, and provenance metadata.
"""

import sys
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import urllib.parse
import urllib.request
import io
import pandas as pd
import requests


TAP_BASE_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"


def query_tap(query: str, max_retries: int = 3, timeout: int = 60) -> pd.DataFrame:
    """Queries NASA Exoplanet Archive TAP service and returns a pandas DataFrame."""
    params = {
        "query": query,
        "format": "csv"
    }
    encoded_url = f"{TAP_BASE_URL}?{urllib.parse.urlencode(params)}"
    headers = {"User-Agent": "AstroML-ExoplanetPipeline/1.0"}

    for attempt in range(max_retries):
        try:
            print(f"Executing TAP query (attempt {attempt + 1}/{max_retries})...")
            response = requests.get(encoded_url, headers=headers, timeout=timeout)
            response.raise_for_status()
            df = pd.read_csv(io.StringIO(response.text), low_memory=False)
            return df
        except Exception as e:
            print(f"TAP query attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(3)
            else:
                raise


def download_ps_confirmed(output_dir: Path) -> Path:
    """Downloads confirmed planets table (ps) with default_flag = 1."""
    query = """
    select
        pl_name, hostname, default_flag, pl_controv_flag, pl_bmassprov,
        pl_bmasse, pl_bmasseerr1, pl_bmasseerr2, pl_bmasselim,
        pl_rade, pl_radeerr1, pl_radeerr2, pl_radelim,
        pl_orbper, pl_orbpererr1, pl_orbpererr2, pl_orbperlim,
        pl_orbsmax, pl_orbsmaxerr1, pl_orbsmaxerr2, pl_orbsmaxlim,
        pl_orbeccen, pl_orbeccenerr1, pl_orbeccenerr2, pl_orbeccenlim,
        st_teff, st_tefferr1, st_tefferr2, st_tefflim,
        st_rad, st_raderr1, st_raderr2, st_radlim,
        st_mass, st_masserr1, st_masserr2, st_masslim,
        sy_jmag, sy_jmagerr1, sy_jmagerr2,
        sy_kmag, sy_kmagerr1, sy_kmagerr2,
        tic_id, gaia_id, pl_refname, st_refname, sy_refname
    from ps
    where default_flag = 1
    """
    df = query_tap(query)
    dest = output_dir / "ps_confirmed_default.parquet"
    df.to_parquet(dest, index=False)
    print(f"Downloaded ps confirmed: {len(df)} rows -> {dest}")
    return dest


def download_koi_cumulative(output_dir: Path) -> Path:
    """Downloads Kepler cumulative KOI table."""
    query = """
    select
        kepid, kepoi_name, kepler_name, koi_disposition, koi_pdisposition,
        koi_score, koi_fpflag_nt, koi_fpflag_ss, koi_fpflag_co, koi_fpflag_ec,
        koi_period, koi_period_err1, koi_period_err2,
        koi_time0bk, koi_time0bk_err1, koi_time0bk_err2,
        koi_impact, koi_impact_err1, koi_impact_err2,
        koi_duration, koi_duration_err1, koi_duration_err2,
        koi_depth, koi_depth_err1, koi_depth_err2,
        koi_prad, koi_prad_err1, koi_prad_err2,
        koi_teq, koi_teq_err1, koi_teq_err2,
        koi_insol, koi_insol_err1, koi_insol_err2,
        koi_model_snr,
        koi_steff, koi_steff_err1, koi_steff_err2,
        koi_slogg, koi_slogg_err1, koi_slogg_err2,
        koi_srad, koi_srad_err1, koi_srad_err2
    from cumulative
    """
    df = query_tap(query)
    dest = output_dir / "koi_cumulative.parquet"
    df.to_parquet(dest, index=False)
    print(f"Downloaded koi cumulative: {len(df)} rows -> {dest}")
    return dest


def download_toi_catalog(output_dir: Path) -> Path:
    """Downloads TESS Objects of Interest (TOI) table."""
    query = """
    select
        tic_id, toi, toipfx, tfopwg_disp, toi_created,
        period, period_err, epoch, epoch_err,
        duration, duration_err, depth_sde, depth_ppm, depth_ppm_err,
        planet_radius, planet_radius_err, planet_eqtemp, planet_eqtemp_err,
        stellar_teff, stellar_teff_err, stellar_logg, stellar_logg_err,
        stellar_radius, stellar_radius_err
    from toi
    """
    df = query_tap(query)
    dest = output_dir / "toi_catalog.parquet"
    df.to_parquet(dest, index=False)
    print(f"Downloaded toi catalog: {len(df)} rows -> {dest}")
    return dest


def main():
    out_dir = Path("data/raw")
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"Starting NASA Exoplanet Archive snapshot download at {timestamp}...")

    manifest = {
        "download_timestamp_utc": timestamp,
        "tables": {}
    }

    p_ps = download_ps_confirmed(out_dir)
    df_ps = pd.read_parquet(p_ps)
    manifest["tables"]["ps"] = {"rows": len(df_ps), "path": str(p_ps)}

    p_koi = download_koi_cumulative(out_dir)
    df_koi = pd.read_parquet(p_koi)
    manifest["tables"]["koi"] = {"rows": len(df_koi), "path": str(p_koi)}

    p_toi = download_toi_catalog(out_dir)
    df_toi = pd.read_parquet(p_toi)
    manifest["tables"]["toi"] = {"rows": len(df_toi), "path": str(p_toi)}

    meta_path = Path("data/raw/snapshot_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print("\nAll snapshots successfully archived!")
    print(f"Metadata recorded in {meta_path}")


if __name__ == "__main__":
    main()
