"""
composition.py - Rocky-Compatible Composition Inference

Specification Reference: §2.4
- Use the term 'rocky-compatible' (consistent with an iron-silicate composition), not 'rocky'.
- Evidence Tiers:
  * T1 (Mass and radius): Per draw, compare against iron-silicate theoretical family
       (Zeng et al. 2016). Rocky-compatible if dense enough for iron and silicates alone
       (lies on or below pure MgSiO3 curve). Report iron-fraction posterior.
  * T2 (Radius-only): Rogers (2015) logistic prior. Marginalize transition midpoint
       over [1.4, 1.8] R_earth so interval carries model uncertainty.
  * T3a (Measured mass, no radius): Forecaster predicted radius, then T2 rule (labeled 'weakest').
  * T3b (Minimum mass only, M sin i): Excluded from mass->radius path in v1 (lower bound, not exact mass).
  * T4 (Neither): Not ranked for composition.
"""

from typing import Dict, Optional, Tuple
import numpy as np


def zeng_pure_silicate_radius(mass_earth: np.ndarray) -> np.ndarray:
    """
    Zeng et al. (2016) pure MgSiO3 (silicate rock, 0% iron core) mass-radius curve:
    Pure silicate at 1 M_earth has R ~ 1.06 R_earth.
    Earth (1 M_earth, 1 R_earth) has a ~32% iron core and is denser than pure silicate.
    """
    m = np.maximum(mass_earth, 1e-4)
    return 1.06 * (m ** 0.27)


def zeng_pure_iron_radius(mass_earth: np.ndarray) -> np.ndarray:
    """
    Zeng et al. (2016) pure Iron (100% Fe core) mass-radius curve:
    R_iron ~ 0.77 * (M / M_earth)^(0.27).
    """
    m = np.maximum(mass_earth, 1e-4)
    return 0.77 * (m ** 0.27)


def evaluate_t1_rocky_compatible(
    mass_earth: np.ndarray,
    radius_earth: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """
    T1 Composition evaluation per draw:
    Returns:
      is_rocky_compatible: boolean array (1 if dense enough for silicate/iron, 0 otherwise)
      core_mass_fraction: estimated iron core mass fraction (0.0 to 1.0, or 0 if volatile-rich)
    """
    r_silicate = zeng_pure_silicate_radius(mass_earth)
    r_iron = zeng_pure_iron_radius(mass_earth)

    # Rocky-compatible: observed radius <= pure silicate radius (allowing for 5% observational/model scatter)
    is_rocky = (radius_earth <= r_silicate * 1.02).astype(float)

    # Core mass fraction (CMF) linear interpolation between 0% Fe (silicate) and 100% Fe (iron)
    cmf = np.clip((r_silicate - radius_earth) / (r_silicate - r_iron + 1e-9), 0.0, 1.0)
    cmf = np.where(is_rocky > 0, cmf, 0.0)

    return is_rocky, cmf


def evaluate_t2_rocky_compatible(
    radius_earth: np.ndarray,
    rng: Optional[np.random.Generator] = None,
    midpoint_min: float = 1.4,
    midpoint_max: float = 1.8,
    scale: float = 0.10
) -> np.ndarray:
    """
    T2 Composition evaluation (Rogers 2015 logistic prior with marginalized midpoint).
    P(rocky | Rp) = 1 / (1 + exp((Rp - R0) / scale))
    R0 is drawn uniformly from [1.4, 1.8] R_earth per draw to marginalize model uncertainty.
    """
    if rng is None:
        rng = np.random.default_rng()

    # Draw R0 per Monte Carlo sample
    r0 = rng.uniform(midpoint_min, midpoint_max, size=len(radius_earth))
    # Probability of being rocky-compatible
    prob_rocky = 1.0 / (1.0 + np.exp((radius_earth - r0) / scale))

    # Realize binary indicator per draw using the probability
    u = rng.uniform(0.0, 1.0, size=len(radius_earth))
    return (u < prob_rocky).astype(float)
