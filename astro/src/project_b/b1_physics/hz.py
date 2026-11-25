"""
hz.py - Habitable Zone Determination (Kopparapu et al. 2013 + Erratum ApJ 770, 82)

Specification Reference: §2.3, Tasks T9a/T9b
- Model valid for Teff: 2600 K <= Teff <= 7200 K.
  Outside this range: output is NOT defined, not False.
- Edge pairs:
  * Conservative HZ (primary):
      Inner = Moist greenhouse (water loss)
      Outer = Maximum greenhouse
  * Optimistic HZ (primary):
      Inner = Recent Venus
      Outer = Early Mars
- Fixture separation:
  Store separately: (1) Table 1 printed, (2) Table 3 coefficient-computed, (3) Calculator output.
  Documents the 1.67 AU vs 1.689 AU discrepancy (S_eff = 0.3507 gives 1.689 AU, whereas 0.3587 gives 1.670 AU).
"""

from dataclasses import dataclass
from typing import Dict, Tuple, Optional
import numpy as np


@dataclass(frozen=True)
class HZCoefficients:
    seff_sun: float
    a: float
    b: float
    c: float
    d: float


# Erratum-corrected coefficients (ApJ 770, 82)
# Table 3 values preserved digit for digit
KOPPARAPU_COEFFS_ERRATUM: Dict[str, HZCoefficients] = {
    "recent_venus": HZCoefficients(
        seff_sun=1.776,
        a=2.136e-4,
        b=2.533e-8,
        c=-1.332e-11,
        d=-3.097e-15
    ),
    "moist_greenhouse": HZCoefficients(
        seff_sun=1.0140,
        a=8.1774e-5,
        b=1.7063e-9,
        c=-4.3912e-12,
        d=-6.322e-16
    ),
    # Erratum Table 3 printed: S_eff,sun = 0.3507 (gives ~1.689 AU at 1 L_sun)
    "maximum_greenhouse_table3_printed": HZCoefficients(
        seff_sun=0.3507,
        a=5.9578e-5,
        b=1.6707e-9,
        c=-3.0058e-12,
        d=-5.1925e-16
    ),
    # Hypothesized corrected single-digit slip: S_eff,sun = 0.3587 (gives 1.670 AU at 1 L_sun)
    "maximum_greenhouse_1_67au_concordant": HZCoefficients(
        seff_sun=0.3587,
        a=5.9578e-5,
        b=1.6707e-9,
        c=-3.0058e-12,
        d=-5.1925e-16
    ),
    "early_mars": HZCoefficients(
        seff_sun=0.320,
        a=5.447e-5,
        b=1.527e-9,
        c=-2.870e-12,
        d=-5.011e-16
    ),
}

# Uncorrected coefficients (2013 original) for verification and regression testing
KOPPARAPU_COEFFS_ORIGINAL: Dict[str, HZCoefficients] = {
    "maximum_greenhouse_original": HZCoefficients(
        seff_sun=0.3438,  # yielded 1.70 AU
        a=5.8942e-5,
        b=1.6558e-9,
        c=-3.0045e-12,
        d=-5.2983e-16
    )
}

# Printed Table 1 Reference Anchors for the Sun (L = 1 L_sun, Teff = 5780 K)
FIXTURE_SUN_TABLE1_AU = {
    "recent_venus": 0.75,
    "moist_greenhouse": 0.99,
    "maximum_greenhouse_erratum": 1.67,
    "maximum_greenhouse_original": 1.70,
    "early_mars": 1.77,  # or ~1.8
}


def compute_seff(teff: np.ndarray, coeffs: HZCoefficients) -> np.ndarray:
    """Computes effective solar flux S_eff for an array of Teff."""
    t = teff - 5780.0
    return coeffs.seff_sun + coeffs.a * t + coeffs.b * (t ** 2) + coeffs.c * (t ** 3) + coeffs.d * (t ** 4)


def compute_hz_edges(
    teff: np.ndarray,
    lum_star: np.ndarray,
    use_concordant_mg: bool = False
) -> Dict[str, np.ndarray]:
    """
    Computes HZ inner and outer boundaries in AU per Monte Carlo draw.
    
    Returns:
      valid_mask: bool array where 2600 <= Teff <= 7200
      inner_conservative: Moist greenhouse distance in AU
      outer_conservative: Maximum greenhouse distance in AU
      inner_optimistic: Recent Venus distance in AU
      outer_optimistic: Early Mars distance in AU
    """
    valid_mask = (teff >= 2600.0) & (teff <= 7200.0)

    mg_key = "maximum_greenhouse_1_67au_concordant" if use_concordant_mg else "maximum_greenhouse_table3_printed"

    seff_rv = compute_seff(teff, KOPPARAPU_COEFFS_ERRATUM["recent_venus"])
    seff_mg = compute_seff(teff, KOPPARAPU_COEFFS_ERRATUM[mg_key])
    seff_moist = compute_seff(teff, KOPPARAPU_COEFFS_ERRATUM["moist_greenhouse"])
    seff_em = compute_seff(teff, KOPPARAPU_COEFFS_ERRATUM["early_mars"])

    # d_HZ = sqrt( (L* / L_sun) / S_eff )
    d_rv = np.where(valid_mask & (seff_rv > 0), np.sqrt(lum_star / seff_rv), np.nan)
    d_moist = np.where(valid_mask & (seff_moist > 0), np.sqrt(lum_star / seff_moist), np.nan)
    d_mg = np.where(valid_mask & (seff_mg > 0), np.sqrt(lum_star / seff_mg), np.nan)
    d_em = np.where(valid_mask & (seff_em > 0), np.sqrt(lum_star / seff_em), np.nan)

    return {
        "valid_mask": valid_mask,
        "inner_conservative": d_moist,
        "outer_conservative": d_mg,
        "inner_optimistic": d_rv,
        "outer_optimistic": d_em,
    }


def evaluate_hz_membership(
    semi_major_axis: np.ndarray,
    teff: np.ndarray,
    lum_star: np.ndarray,
    use_concordant_mg: bool = False
) -> Dict[str, np.ndarray]:
    """
    Evaluates whether each draw falls within the conservative and optimistic HZ.
    Outside 2600-7200 K, membership is np.nan / not defined.
    """
    edges = compute_hz_edges(teff, lum_star, use_concordant_mg=use_concordant_mg)
    valid = edges["valid_mask"]

    in_conservative = np.full_like(semi_major_axis, np.nan, dtype=float)
    in_optimistic = np.full_like(semi_major_axis, np.nan, dtype=float)

    # Conservative: moist greenhouse <= a <= max greenhouse
    in_cons_bool = (semi_major_axis >= edges["inner_conservative"]) & (semi_major_axis <= edges["outer_conservative"])
    in_conservative[valid] = in_cons_bool[valid].astype(float)

    # Optimistic: recent venus <= a <= early mars
    in_opt_bool = (semi_major_axis >= edges["inner_optimistic"]) & (semi_major_axis <= edges["outer_optimistic"])
    in_optimistic[valid] = in_opt_bool[valid].astype(float)

    return {
        "valid_mask": valid,
        "in_conservative": in_conservative,
        "in_optimistic": in_optimistic,
        "edges": edges
    }
