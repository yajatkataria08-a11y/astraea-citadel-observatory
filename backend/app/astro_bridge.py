"""
Bridge to the astro/ pipeline (Revision 5 code). All imports are lazy so the API still starts
if a scientific dependency is missing; /health reports what loaded.

Only the B1 physics modules are imported. b2_vetting/__init__ pulls in shap + xgboost, which we
avoid on purpose; the backend has its own leak-free vetting service (services/vetting.py).
"""
import sys
import warnings
from typing import Any, Dict, Optional

import numpy as np

from .config import ASTRO_DIR, N_DRAWS, SEED
from .utils import clean, num

_mods: Dict[str, Any] = {}
_error: Optional[str] = None

# Standard solar scaling for log g -> mass
_G_CGS, _MSUN_G, _RSUN_CM = 6.674e-8, 1.989e33, 6.957e10


def _load() -> bool:
    global _error
    if _mods:
        return True
    if _error:
        return False
    try:
        if str(ASTRO_DIR) not in sys.path:
            sys.path.insert(0, str(ASTRO_DIR))
        from src.project_b.b1_physics import sampler, derived, hz, composition, priority, forecaster
        _mods.update(sampler=sampler, derived=derived, hz=hz, composition=composition,
                     priority=priority, forecaster=forecaster)
        return True
    except Exception as exc:  # noqa: BLE001
        _error = f"{type(exc).__name__}: {exc}"
        return False


def status() -> Dict[str, Any]:
    ok = _load()
    return {"available": ok, "error": _error, "astro_dir": str(ASTRO_DIR)}


def mass_from_logg(logg: float, rstar: float) -> Optional[float]:
    if logg is None or rstar is None:
        return None
    return (10 ** logg) * (rstar * _RSUN_CM) ** 2 / (_G_CGS * _MSUN_G)


def _err(val: float, e_pos: Optional[float], e_neg: Optional[float], frac: float = 0.10):
    """Positive error pair. Missing errors fall back to a flagged fractional error."""
    p, n = num(e_pos), num(e_neg)
    assumed = False
    if p is None and n is None:
        p = n = abs(val) * frac
        assumed = True
    elif p is None:
        p = abs(n)
    elif n is None:
        n = abs(p)
    return abs(p), abs(n), assumed


def physics_summary(p: Dict[str, Any], n_draws: int = N_DRAWS, seed: int = SEED) -> Dict[str, Any]:
    """
    Run astro B1 (sampler -> derived -> HZ -> T2 composition -> TSM/ESM priority) for one planet.

    Expected keys in p: period, period_err_pos/neg, rplanet(+errs), teff(+errs), rstar(+errs),
    mstar(+errs) or logg, jmag, kmag.  Anything missing is reported, never silently invented.
    """
    if not _load():
        return {"available": False, "reason": f"astro bridge unavailable: {_error}"}

    S, D, H, C, P, F = (_mods[k] for k in ("sampler", "derived", "hz", "composition", "priority", "forecaster"))
    flags = []

    need = {k: num(p.get(k)) for k in ("period", "rplanet", "teff", "rstar")}
    missing = [k for k, v in need.items() if v is None or v <= 0]
    if missing:
        return {"available": True, "computed": False,
                "reason": f"missing required inputs: {', '.join(missing)}"}

    def mp(key, frac=0.10):
        v = need.get(key) if key in need else num(p.get(key))
        ep, en, assumed = _err(v, p.get(f"{key}_err_pos"), p.get(f"{key}_err_neg"), frac)
        if assumed:
            flags.append(f"{key}_error_assumed_{int(frac * 100)}pct")
        return S.MeasuredParameter(val=v, err_pos=ep, err_neg=en)

    mstar_val = num(p.get("mstar"))
    mstar_param = None
    if mstar_val and mstar_val > 0:
        mstar_param = mp("mstar")
    else:
        m = mass_from_logg(num(p.get("logg")), need["rstar"]) if num(p.get("logg")) is not None else None
        if m and m > 0:
            p = {**p, "mstar": m}
            mstar_param = S.MeasuredParameter(val=m, err_pos=0.2 * m, err_neg=0.2 * m)
            flags.append("mstar_from_logg_error_assumed_20pct")
        else:
            flags.append("mstar_missing")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        draws = S.sample_planet_system(
            teff=mp("teff", 0.03), rstar=mp("rstar"), mstar=mstar_param, period=mp("period", 0.001),
            rplanet=mp("rplanet"), mplanet=None, eccentricity=None, n_draws=n_draws, seed=seed)

        # Mass is not measured: derive it from radius (Forecaster) and flag it - never used for composition.
        draws["mplanet"] = F.ChenKippingForecaster().predict_mass(draws["rplanet"])
        flags.append("mass_derived_from_radius")
        flags.append("ecc_assumed_zero")

        archive_a = num(p.get("a_au"))
        der = D.derive_quantities(draws, archive_a_val=archive_a)
        hz = H.evaluate_hz_membership(der["semi_major_axis"], der["teff"], der["lum_star"])
        rng = np.random.default_rng(seed)
        rocky = C.evaluate_t2_rocky_compatible(der["rplanet"], rng=rng)

        pri = P.evaluate_joint_system_priorities(
            draws=der, is_rocky_draws=rocky,
            in_hz_conservative_draws=hz["in_conservative"], in_hz_optimistic_draws=hz["in_optimistic"],
            j_mag=num(p.get("jmag")), k_mag=num(p.get("kmag")), is_transiting=True)

        valid = hz["valid_mask"]
        p_cons = float(np.nanmean(hz["in_conservative"])) if valid.any() else None
        p_opt = float(np.nanmean(hz["in_optimistic"])) if valid.any() else None
        edges = hz["edges"]

        def med(a):
            return float(np.nanmedian(a)) if np.isfinite(a).any() else None

    if num(p.get("jmag")) is None:
        flags.append("tsm_not_computed_no_J_mag")
    if num(p.get("kmag")) is None:
        flags.append("esm_not_computed_no_K_mag")

    out = {
        "available": True, "computed": True, "n_draws": n_draws, "seed": seed,
        "p_hz_conservative": p_cons, "p_hz_optimistic": p_opt,
        "p_rocky_compatible_radius_only": float(np.mean(rocky)),
        "instellation_median_earth": med(der["flux_instellation"]),
        "hz_edges_au_median": {k: med(edges[k]) for k in
                               ("inner_conservative", "outer_conservative", "inner_optimistic", "outer_optimistic")},
        "teff_valid_fraction": float(np.mean(valid)),
        "priority": pri,
        "flags": flags,
        "evidence_tier": "T2 (radius-only, weak inference)",
        # Spec gate (section 2.3): no HZ ranking is trusted until T9a/T9b are closed.
        "hz_coefficients_verified": False,
        "warning": ("HZ coefficients are not yet verified against the Kopparapu 2013 erratum (tasks T9a/T9b open). "
                    "Treat HZ probabilities as provisional. The word 'habitable' is not assessed here."),
    }
    return clean(out)
