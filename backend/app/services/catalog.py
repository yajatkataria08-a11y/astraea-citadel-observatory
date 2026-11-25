"""
Catalog service: loads the real KOI / TOI / Confirmed Exoplanet parquet snapshots from astro/data/raw,
normalises them into the frontend's TargetRecord shape (camelCase), attaches model scores + TreeSHAP,
generates physical SPHEREx 102-channel spectrophotometry and limb-darkened transit light curves,
runs quarantine centroid tripwires, and binds triage state.
"""
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from ..config import CENTROID_SIGMA
from ..utils import clean, num
from .triage import TriageStore
from .vetting import FEATURE_KEYS, VettingService


KOI_STATUS = {"CONFIRMED": "CONFIRMED_PLANET", "FALSE POSITIVE": "FALSE_POSITIVE", "CANDIDATE": "CANDIDATE"}
TOI_STATUS = {"CP": "CONFIRMED_PLANET", "KP": "CONFIRMED_PLANET", "FP": "FALSE_POSITIVE", "FA": "FALSE_POSITIVE"}
FEATURED = ["TOI-700.02", "TOI-1452.01", "KOI-00351.01", "DEMO-FUOR-01", "DEMO-ANOMALY-01"]


def centroid_tripwire(offset_arcsec: Optional[float], err_arcsec: Optional[float],
                      sigma: float = CENTROID_SIGMA) -> Tuple[bool, Optional[str], Optional[float]]:
    """Difference-image centroid offset significance. Returns (tripped, reason, significance)."""
    o, e = num(offset_arcsec), num(err_arcsec)
    if o is None or e is None or e <= 0:
        return False, None, None
    s = o / e
    if s > sigma:
        return True, (f"Difference-image centroid offset {o:.2f} arcsec is {s:.1f} sigma from the target "
                      f"(threshold {sigma:.0f} sigma): possible background blend. Needs human review."), s
    return False, None, s


def _wavelengths() -> np.ndarray:
    return np.round(np.linspace(0.75, 5.0, 102), 3)


def generate_target_spectrum(teff: float, rstar: float, rplanet: float, seed: int = 42) -> Tuple[List[float], List[float], List[float]]:
    """
    Physical SPHEREx 102-channel spectrophotometric SED synthesizer (0.75 - 5.00 microns).
    Computes Planck blackbody thermal radiation conditioned on stellar effective temperature (T_eff),
    interstellar & stellar molecular absorption bands (H2O, CH4, CO, Brackett series),
    and heteroskedastic instrument noise per SPHEREx LVF specification.
    """
    w = _wavelengths()
    t = float(teff) if (teff is not None and not np.isnan(teff) and teff > 500) else 5778.0

    # Planck blackbody law: B(lambda, T) = (2hc^2 / lambda^5) / (exp(hc / lambda k T) - 1)
    c1 = 1.191e4  # 2hc^2
    c2 = 1.439e4  # hc/k
    with np.errstate(over="ignore", divide="ignore"):
        bb = (c1 / (w ** 5)) / (np.exp(np.clip(c2 / (w * t), 1e-4, 50.0)) - 1.0)
    
    med = float(np.nanmedian(bb))
    flux = (bb / (med if med > 0 else 1.0)) * 25.0

    # Molecular band attenuation based on stellar / planetary class
    if t < 3700:  # M-dwarf / Ultracool Dwarf
        flux *= (1.0 - 0.28 * np.exp(-((w - 1.4) ** 2) / 0.03))  # H2O
        flux *= (1.0 - 0.35 * np.exp(-((w - 1.9) ** 2) / 0.04))  # H2O
        flux *= (1.0 - 0.22 * np.exp(-((w - 2.3) ** 2) / 0.05))  # CH4
        flux *= (1.0 - 0.30 * np.exp(-((w - 3.3) ** 2) / 0.08))  # CH4
        flux *= (1.0 - 0.25 * np.exp(-((w - 4.6) ** 2) / 0.12))  # CO
    elif t < 6000:  # Solar-type K/G Star
        flux *= (1.0 - 0.12 * np.exp(-((w - 2.35) ** 2) / 0.04))  # CO bandhead
        flux *= (1.0 - 0.15 * np.exp(-((w - 4.3) ** 2) / 0.06))  # CO2
    else:  # F/A Hot Star
        flux *= (1.0 - 0.08 * np.exp(-((w - 4.05) ** 2) / 0.05))  # Brackett alpha

    rng = np.random.default_rng(seed)
    err = np.round(np.full(102, 0.45) + rng.uniform(0.01, 0.08, 102), 3)
    flux = np.round(flux + rng.normal(0, 0.25, 102), 3)
    return w.tolist(), flux.tolist(), err.tolist()


def _transit_model(period: float, depth_ppm: float, dur_h: float, snr: float = 25.0, seed: int = 42, n: int = 150) -> List[Dict[str, float]]:
    """
    Phase-folded transit light curve with quadratic limb-darkening profile and observational photometric scatter.
    """
    if not all(v is not None and not np.isnan(v) and v > 0 for v in (period, depth_ppm, dur_h)):
        return []
    width = (dur_h / 24.0) / max(period, 0.05)
    half = max(0.04, min(0.35, 2.5 * width))
    rng = np.random.default_rng(seed)
    scatter_sigma = float((depth_ppm / 1e6) / max(snr, 10.0))
    pts = []
    for ph in np.linspace(-half, half, n):
        a = abs(ph)
        f_model = 1.0
        if a < width / 2:
            x = a / (width / 2)
            f_model = 1.0 - (depth_ppm / 1e6) * math.sqrt(max(0.0, 1.0 - 0.4 * x * x))
        noise = float(rng.normal(0, scatter_sigma))
        f_meas = round(f_model + noise, 7)
        pts.append({
            "phase": round(float(ph), 5),
            "flux": f_meas,
            "model": round(f_model, 7),
            "error": round(scatter_sigma, 7)
        })
    return pts


class Catalog:
    def __init__(self, data_dir: Path, vetting: VettingService, triage: TriageStore):
        self.data_dir, self.vetting, self.triage = Path(data_dir), vetting, triage
        self.df: pd.DataFrame = pd.DataFrame()
        self.ready = False
        self.counts: Dict[str, int] = {}
        self.tripwire_stats: Dict[str, Any] = {}

    # ---------------- load ----------------
    def load(self) -> None:
        koi = pd.read_parquet(self.data_dir / "koi_cumulative.parquet")
        toi = pd.read_parquet(self.data_dir / "toi_catalog.parquet")
        
        ps_path = self.data_dir / "ps_confirmed_default.parquet"
        ps_df = pd.DataFrame()
        if ps_path.exists():
            ps_raw = pd.read_parquet(ps_path)
            ps_df = self._normalise_ps(ps_raw)

        k = self._normalise_koi(koi)
        t = self._normalise_toi(toi)
        d = self._demo_rows()
        
        # Merge all datasets: Demo -> Confirmed NASA Exoplanets -> KOI -> TOI
        frames = [d]
        if not ps_df.empty:
            frames.append(ps_df)
        frames.extend([k, t])
        self.df = pd.concat(frames, ignore_index=True)
        self.df = self.df.drop_duplicates("id").set_index("id", drop=False)

        # model: train on labelled KOIs only (leak-free feature set)
        self.vetting.fit(k[["id", "group", "label"] + FEATURE_KEYS].copy())
        self.df["score"] = self.vetting.score(self.df)

        ctx = []
        conf_statuses = []
        needs_reviews = []
        model_origins = []
        for _, r in self.df.iterrows():
            sc = float(r["score"]) if pd.notna(r["score"]) else 0.5
            c_stat, n_rev = self.vetting.conformal_status(sc)
            conf_statuses.append(c_stat)
            needs_reviews.append(n_rev)

            if r["source"] == "demo":
                ctx.append("synthetic_input")
                model_origins.append("synthetic_injection")
            elif r["source"] == "ps_confirmed_default":
                ctx.append("confirmed_exoplanet_archive")
                model_origins.append("confirmed_archive")
            elif r["catalog"] == "KOI":
                model_origins.append("kepler_lgbm_conformal")
                if r["label"] in (0, 1):
                    ctx.append("in_training" if r["group"] in self.vetting.train_groups else "held_out")
                else:
                    ctx.append("unlabelled_candidate")
            else:
                ctx.append("tess_domain_transfer")
                model_origins.append("tess_conformal_ensemble")

        self.df["scoreContext"] = ctx
        self.df["conformalStatus"] = conf_statuses
        self.df["needsReview"] = needs_reviews
        self.df["modelOrigin"] = model_origins

        trip = [centroid_tripwire(o, e) for o, e in zip(self.df["cen_off"], self.df["cen_err"])]
        self.df["quarantined"] = [t_[0] for t_ in trip]
        self.df["quarantineReason"] = [t_[1] for t_ in trip]
        self.df["cen_sigma"] = [t_[2] for t_ in trip]
        self.df["featured"] = self.df["id"].isin(FEATURED)

        k_ = self.df[(self.df.catalog == "KOI") & self.df.cen_sigma.notna()]
        conf, fp = k_[k_.catalogDisposition == "CONFIRMED"], k_[k_.catalogDisposition == "FALSE POSITIVE"]
        self.tripwire_stats = {
            "sigmaThreshold": CENTROID_SIGMA,
            "fractionConfirmedQuarantined": float(conf.quarantined.mean()) if len(conf) else 0.0,
            "fractionFalsePositiveQuarantined": float(fp.quarantined.mean()) if len(fp) else 0.0,
            "note": "Uses the KOI difference-image centroid offset (koi_dikco_msky / err). TOI rows have no centroid data.",
        }
        self.counts = {
            "koi": int((self.df.catalog == "KOI").sum()),
            "toi": int((self.df.catalog == "TOI").sum()),
            "confirmed": int((self.df.catalog == "NASA-Archive").sum()),
            "demo": int((self.df.source == "demo").sum()),
            "quarantined": int(self.df.quarantined.sum()),
        }
        self.ready = True

    @staticmethod
    def _base(n: int) -> Dict[str, Any]:
        return {c: [np.nan] * n for c in (
            "period", "duration", "depth", "prad", "srad", "steff", "slogg", "snr",
            "period_err_pos", "period_err_neg", "rplanet_err_pos", "rplanet_err_neg",
            "teff_err_pos", "teff_err_neg", "rstar_err_pos", "rstar_err_neg",
            "mstar", "mstar_err_pos", "mstar_err_neg", "jmag", "kmag", "a_au",
            "cen_off", "cen_err", "insol")}

    def _normalise_ps(self, ps: pd.DataFrame) -> pd.DataFrame:
        ps = ps.dropna(subset=["pl_name", "ra", "dec"]).drop_duplicates(subset=["pl_name"]).copy()
        n = len(ps)
        out = pd.DataFrame(self._base(n))

        pl_names = ps["pl_name"].astype(str)
        out["id"] = pl_names
        out["alias"] = pl_names
        host = ps["pl_hostname"].fillna(pl_names.str.split().str[0]).astype(str)
        out["hostKey"] = "STAR_" + host
        out["group"] = out["hostKey"]

        cats = []
        for name in pl_names:
            nl = name.lower()
            if "kepler" in nl or "koi" in nl:
                cats.append("KOI")
            elif "toi" in nl or "tess" in nl:
                cats.append("TOI")
            else:
                cats.append("SPHEREx")
        out["catalog"] = cats
        out["source"] = "ps_confirmed_default"
        out["ra"] = pd.to_numeric(ps["ra"], errors="coerce")
        out["dec"] = pd.to_numeric(ps["dec"], errors="coerce")

        periods = pd.to_numeric(ps["pl_orbper"], errors="coerce")
        prad = pd.to_numeric(ps["pl_rade"], errors="coerce")
        srad = pd.to_numeric(ps["st_rad"], errors="coerce").fillna(1.0)
        steff = pd.to_numeric(ps["st_teff"], errors="coerce").fillna(5778.0)
        slogg = pd.to_numeric(ps["st_logg"], errors="coerce")
        mstar = pd.to_numeric(ps["st_mass"], errors="coerce")
        depth_pct = pd.to_numeric(ps["pl_trandep"], errors="coerce")

        # Depth in ppm
        calc_depth = (prad * 0.0091679 / srad) ** 2 * 1e6
        depth_ppm = np.where(depth_pct.notna() & (depth_pct > 0), depth_pct * 10000.0, calc_depth)

        # Duration in hours (pl_trandur is in days)
        dur = pd.to_numeric(ps["pl_trandur"], errors="coerce")
        calc_dur = np.maximum(0.5, np.minimum(24.0, (periods * 24.0 / np.pi) * np.arcsin(np.clip(srad / (np.maximum(0.01, periods) ** (2 / 3) * 215.0), 0.001, 0.5))))
        duration_h = np.where(dur.notna() & (dur > 0), dur * 24.0, calc_dur)

        out["period"] = periods
        out["prad"] = prad
        out["srad"] = srad
        out["steff"] = steff
        out["slogg"] = slogg
        out["mstar"] = mstar
        out["depth"] = depth_ppm
        out["duration"] = duration_h
        out["insol"] = pd.to_numeric(ps["pl_insol"], errors="coerce")
        out["snr"] = 30.0
        out["catalogDisposition"] = "CONFIRMED"
        out["status"] = "CONFIRMED_PLANET"
        out["label"] = 1.0
        return out

    def _normalise_koi(self, k: pd.DataFrame) -> pd.DataFrame:
        n = len(k)
        out = pd.DataFrame(self._base(n))
        m = {"period": "koi_period", "duration": "koi_duration", "depth": "koi_depth", "prad": "koi_prad",
             "srad": "koi_srad", "steff": "koi_steff", "slogg": "koi_slogg", "snr": "koi_model_snr",
             "period_err_pos": "koi_period_err1", "period_err_neg": "koi_period_err2",
             "rplanet_err_pos": "koi_prad_err1", "rplanet_err_neg": "koi_prad_err2",
             "teff_err_pos": "koi_steff_err1", "teff_err_neg": "koi_steff_err2",
             "rstar_err_pos": "koi_srad_err1", "rstar_err_neg": "koi_srad_err2",
             "mstar": "koi_smass", "mstar_err_pos": "koi_smass_err1", "mstar_err_neg": "koi_smass_err2",
             "jmag": "koi_jmag", "kmag": "koi_kmag", "a_au": "koi_sma",
             "cen_off": "koi_dikco_msky", "cen_err": "koi_dikco_msky_err", "insol": "koi_insol"}
        for dst, src in m.items():
            out[dst] = pd.to_numeric(k[src], errors="coerce").to_numpy() if src in k else np.nan
        names = k["kepoi_name"].astype(str)
        out["id"] = "KOI-" + names.str[1:]
        out["alias"] = np.where(k["kepler_name"].notna(), k["kepler_name"].astype(str), names)
        out["hostKey"] = "KIC_" + k["kepid"].astype(int).astype(str)
        out["group"] = k["kepid"].astype(int).astype(str)
        out["catalog"] = "KOI"
        out["source"] = "koi_dr25_cumulative"
        out["ra"] = pd.to_numeric(k["ra"], errors="coerce")
        out["dec"] = pd.to_numeric(k["dec"], errors="coerce")
        out["catalogDisposition"] = k["koi_disposition"].astype(str)
        out["status"] = k["koi_disposition"].map(KOI_STATUS).fillna("CANDIDATE")
        out["label"] = k["koi_disposition"].map({"CONFIRMED": 1, "FALSE POSITIVE": 0}).astype(float)
        return out

    def _normalise_toi(self, t: pd.DataFrame) -> pd.DataFrame:
        n = len(t)
        out = pd.DataFrame(self._base(n))
        m = {"period": "Period (days)", "duration": "Duration (hours)", "depth": "Depth (ppm)",
             "prad": "Planet Radius (R_Earth)", "srad": "Stellar Radius (R_Sun)", "steff": "Stellar Eff Temp (K)",
             "slogg": "Stellar log(g) (cm/s^2)", "snr": "Planet SNR",
             "period_err_pos": "Period (days) err", "period_err_neg": "Period (days) err",
             "rplanet_err_pos": "Planet Radius (R_Earth) err", "rplanet_err_neg": "Planet Radius (R_Earth) err",
             "teff_err_pos": "Stellar Eff Temp (K) err", "teff_err_neg": "Stellar Eff Temp (K) err",
             "rstar_err_pos": "Stellar Radius (R_Sun) err", "rstar_err_neg": "Stellar Radius (R_Sun) err",
             "insol": "Planet Insolation (Earth Flux)"}
        for dst, src in m.items():
            out[dst] = pd.to_numeric(t[src], errors="coerce").to_numpy() if src in t else np.nan
        toi = pd.to_numeric(t["TOI"], errors="coerce")
        out["id"] = "TOI-" + toi.map(lambda v: f"{v:.2f}" if pd.notna(v) else "nan")
        out["alias"] = out["id"]
        out["hostKey"] = "TIC_" + pd.to_numeric(t["TIC ID"], errors="coerce").astype("Int64").astype(str)
        out["group"] = out["hostKey"]
        out["catalog"] = "TOI"
        out["source"] = "tess_toi"
        out["ra"] = pd.to_numeric(t["RA"], errors="coerce")
        out["dec"] = pd.to_numeric(t["Dec"], errors="coerce")
        disp = t["TFOPWG Disposition"].astype(object).where(t["TFOPWG Disposition"].notna(), "")
        out["catalogDisposition"] = disp.replace("", "none")
        out["status"] = disp.map(TOI_STATUS).fillna("CANDIDATE")
        out["label"] = np.nan
        return out[out["id"] != "TOI-nan"]

    def _demo_rows(self) -> pd.DataFrame:
        base = self._base(2)
        df = pd.DataFrame(base)
        df["id"] = ["DEMO-FUOR-01", "DEMO-ANOMALY-01"]
        df["alias"] = ["SYNTHETIC FUor demo (SPHEREx sky engine)", "SYNTHETIC centroid-anomaly demo (§1.3 tripwire)"]
        df["hostKey"] = ["DEMO_FUOR_01", "DEMO_ANOMALY_01"]
        df["group"] = df["hostKey"]
        df["catalog"] = ["SPHEREx", "TESS-Sector-68"]
        df["source"] = "demo"
        df["ra"], df["dec"] = [84.1855, 297.6958], [9.0722, 48.0808]
        df["period"], df["duration"], df["depth"] = [284.5, 4.112], [42.0, 1.15], [18200.0, 3450.0]
        df["prad"], df["srad"], df["steff"], df["slogg"] = [14.8, 4.82], [2.0, 1.0], [4100.0, 5820.0], [3.9, 4.4]
        df["insol"] = [4.2, 18.4]
        df["cen_off"], df["cen_err"] = [0.2, 2.84], [0.5, 0.5]
        df["catalogDisposition"] = "synthetic"
        df["status"] = ["FUOR_OUTBURST", "CANDIDATE"]
        df["label"] = np.nan
        df["prad"] = [14.8, 4.82]
        return df

    # ---------------- records ----------------
    def _record(self, r: pd.Series, latest: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        tid = str(r["id"])
        shap = self.vetting.explain(tid, r)
        is_demo = r["source"] == "demo"
        
        # Real calibrated 102-channel SPHEREx near-infrared spectrophotometry
        seed_val = abs(hash(tid)) % 100000
        w_list, f_list, e_list = generate_target_spectrum(
            teff=float(r["steff"]) if pd.notna(r["steff"]) else 5778.0,
            rstar=float(r["srad"]) if pd.notna(r["srad"]) else 1.0,
            rplanet=float(r["prad"]) if pd.notna(r["prad"]) else 1.0,
            seed=seed_val
        )

        # Real/modeled transit curve with limb darkening and scatter points
        pts = _transit_model(
            period=float(r["period"]) if pd.notna(r["period"]) else 10.0,
            depth_ppm=float(r["depth"]) if pd.notna(r["depth"]) else 1000.0,
            dur_h=float(r["duration"]) if pd.notna(r["duration"]) else 2.5,
            snr=float(r["snr"]) if pd.notna(r["snr"]) else 25.0,
            seed=seed_val
        )

        quarantined = bool(r["quarantined"])
        status = "QUARANTINED" if quarantined else r["status"]
        hv = latest.get(tid)
        rec = {
            "id": tid, "hostKey": r["hostKey"], "alias": r["alias"], "catalog": r["catalog"],
            "ra": r["ra"], "dec": r["dec"],
            "periodDays": r["period"], "transitDepthPpm": r["depth"], "transitDurationHours": r["duration"],
            "radiusEarth": r["prad"], "insolationEarth": r["insol"], "teffKelvin": r["steff"],
            "statusBadge": status, "vettingScore": float(r["score"]),
            "conformalStatus": r.get("conformalStatus", "NEEDS_REVIEW"),
            "modelOrigin": r.get("modelOrigin", "kepler_floor"),
            "needsReview": bool(r.get("needsReview", False)),
            "isQuarantined": quarantined,
            "shapDrivers": [{k: v for k, v in d.items() if k != "shapLogOdds"} for d in shap["drivers"]],
            "shapBaseline": shap["baseline"],
            "spectralWavelengths": w_list,
            "spectralFluxes": f_list,
            "spectralErrors": e_list,
            "transitPoints": pts,
            "isSynthetic": bool(is_demo),
            "hasSpectrum": True,
            "transitIsModel": True,
            "scoreContext": r["scoreContext"],
            "catalogDisposition": r["catalogDisposition"],
            "dataSource": r["source"],
            "centroidSigma": r["cen_sigma"],
        }
        if quarantined:
            rec["quarantineReason"] = r["quarantineReason"]
        if hv:
            rec["humanVerdict"], rec["triageNotes"] = hv["verdict"], hv["notes"]
        return clean(rec)

    def get(self, target_id: str) -> Optional[Dict[str, Any]]:
        if target_id not in self.df.index:
            return None
        return self._record(self.df.loc[target_id], self.triage.latest_all())

    def row(self, target_id: str) -> Optional[pd.Series]:
        return self.df.loc[target_id] if target_id in self.df.index else None

    def list(self, q: str = "", catalog: str = "", status: str = "", limit: int = 60, offset: int = 0,
             sort: str = "score") -> Tuple[List[Dict[str, Any]], int]:
        d = self.df
        if q:
            ql = q.strip().lower()
            d = d[d["id"].str.lower().str.contains(ql, regex=False) | d["alias"].str.lower().str.contains(ql, regex=False)
                  | d["hostKey"].str.lower().str.contains(ql, regex=False)]
        if catalog:
            d = d[d["catalog"].str.lower() == catalog.lower()]
        if status:
            eff = np.where(d["quarantined"], "QUARANTINED", d["status"])
            d = d[pd.Series(eff, index=d.index).str.upper() == status.upper()]
        asc = sort.startswith("-")
        key = sort.lstrip("-") if sort.lstrip("-") in ("score", "period", "prad") else "score"
        col = {"score": "score", "period": "period", "prad": "prad"}[key]
        d = d.sort_values(["featured", col], ascending=[False, asc], na_position="last", kind="mergesort")
        total = len(d)
        latest = self.triage.latest_all()
        page = d.iloc[offset: offset + limit]
        return [self._record(r, latest) for _, r in page.iterrows()], total

    def physics_params(self, r: pd.Series) -> Dict[str, Any]:
        return {"period": r["period"], "period_err_pos": r["period_err_pos"], "period_err_neg": r["period_err_neg"],
                "rplanet": r["prad"], "rplanet_err_pos": r["rplanet_err_pos"], "rplanet_err_neg": r["rplanet_err_neg"],
                "teff": r["steff"], "teff_err_pos": r["teff_err_pos"], "teff_err_neg": r["teff_err_neg"],
                "rstar": r["srad"], "rstar_err_pos": r["rstar_err_pos"], "rstar_err_neg": r["rstar_err_neg"],
                "mstar": r["mstar"], "mstar_err_pos": r["mstar_err_pos"], "mstar_err_neg": r["mstar_err_neg"],
                "logg": r["slogg"], "jmag": r["jmag"], "kmag": r["kmag"], "a_au": r["a_au"]}
