"""
derived.py - Physics Derivations: Luminosity, Semi-major Axis, and Instellation Flux

Specification Reference: §2.2
- Derive, do not independently sample:
  1. L* = 4 * pi * R*^2 * sigma * Teff^4 (in solar units L_sun)
  2. a from Kepler's third law (M*, P). If M* is missing, sample archive's a and record so.
  3. Eccentricity-averaged flux: S = (L* / L_sun) / (a^2 * sqrt(1 - e^2)) in solar flux units (S_earth).
     If e is missing or limit only: use e = 0 and set ecc_assumed = True.
"""

from typing import Dict, Optional
import numpy as np

# Physical constants
TEFF_SUN = 5780.0  # K (Kopparapu et al. 2013 standard solar anchor)
DAYS_PER_YEAR = 365.256363  # Sidereal year in days


def derive_quantities(
    draws: Dict[str, np.ndarray],
    archive_a_val: Optional[float] = None,
    archive_a_err: Optional[float] = None
) -> Dict[str, np.ndarray]:
    """
    Computes derived physical quantities per Monte Carlo draw.
    """
    results = dict(draws)
    n_draws = len(draws["teff"])

    # 1. Stellar Luminosity L* in L_sun
    # L* / L_sun = (R* / R_sun)^2 * (Teff / Teff_sun)^4
    results["lum_star"] = (results["rstar"] ** 2) * ((results["teff"] / TEFF_SUN) ** 4)

    # 2. Semi-major axis a in AU via Kepler's 3rd Law:
    # a = (M* * (P / 365.256)^2)^(1/3)
    if not np.all(results["mstar_missing"]):
        # Mstar is available
        mstar = results["mstar"]
        period_yr = results["period"] / DAYS_PER_YEAR
        results["semi_major_axis"] = (mstar * (period_yr ** 2)) ** (1.0 / 3.0)
        results["a_derived_from_kepler"] = np.ones(n_draws, dtype=bool)
    else:
        # Fall back to archive's a if provided
        if archive_a_val is not None and archive_a_val > 0:
            sigma_a = archive_a_err if (archive_a_err is not None and archive_a_err > 0) else 0.05 * archive_a_val
            rng = np.random.default_rng(42)
            results["semi_major_axis"] = np.clip(
                rng.normal(loc=archive_a_val, scale=sigma_a, size=n_draws), 1e-4, 1000.0
            )
            results["a_derived_from_kepler"] = np.zeros(n_draws, dtype=bool)
        else:
            results["semi_major_axis"] = np.full(n_draws, np.nan)
            results["a_derived_from_kepler"] = np.zeros(n_draws, dtype=bool)

    # 3. Eccentricity-averaged flux S (in Earth flux units S_earth)
    # S = (L* / L_sun) / (a^2 * sqrt(1 - e^2))
    e = results["eccentricity"]
    e_factor = np.sqrt(np.maximum(1.0 - e**2, 1e-6))
    a = results["semi_major_axis"]

    results["flux_instellation"] = results["lum_star"] / ((a ** 2) * e_factor)

    return results
