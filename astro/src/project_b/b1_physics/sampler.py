"""
sampler.py - Posterior Reconstruction via Split-Normal Asymmetric Error Sampling

Specification Reference: §2.2
1. Sample measured quantities: Teff, R*, M*, orbital period P, planet R, planet M,
   and eccentricity e where measured.
2. Use split-normal (Fechner / two-piece normal) for asymmetric errors; truncate at physical limits.
3. N = 10,000 draws per planet; check rank stability against N = 50,000.
4. Derive, do not independently sample: L*, a, and eccentricity-averaged flux S.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Tuple
import numpy as np


@dataclass
class MeasuredParameter:
    val: float
    err_pos: float  # upper error (positive)
    err_neg: float  # lower error (positive)
    limit_flag: int = 0  # 1 if limit/censored, 0 if measurement
    provenance: str = "measured-in-solution"  # 'measured-in-solution', 'filled-from-other-reference', 'derived'


def sample_split_normal(
    val: float,
    err_pos: float,
    err_neg: float,
    size: int = 10000,
    rng: Optional[np.random.Generator] = None,
    lower_bound: Optional[float] = None,
    upper_bound: Optional[float] = None,
    max_resamples: int = 5
) -> np.ndarray:
    """
    Samples from a continuous two-piece (split) normal distribution with mode = val.
    
    Density:
      f(x) = A * exp(-(x - val)^2 / (2 * err_neg^2)) for x < val
      f(x) = A * exp(-(x - val)^2 / (2 * err_pos^2)) for x >= val
      where A = sqrt(2 / pi) / (err_pos + err_neg).
      
    P(x < val) = err_neg / (err_pos + err_neg).
    """
    if rng is None:
        rng = np.random.default_rng()

    # Handle symmetric or zero-error edge cases
    sigma_pos = max(float(err_pos), 1e-9) if not np.isnan(err_pos) else 1e-9
    sigma_neg = max(float(err_neg), 1e-9) if not np.isnan(err_neg) else 1e-9

    if np.isclose(sigma_pos, sigma_neg, atol=1e-8):
        samples = rng.normal(loc=val, scale=sigma_pos, size=size)
    else:
        # Exact split-normal sampling
        p_left = sigma_neg / (sigma_pos + sigma_neg)
        u = rng.uniform(0.0, 1.0, size=size)
        half_norm = np.abs(rng.normal(0.0, 1.0, size=size))
        samples = np.where(u < p_left, val - sigma_neg * half_norm, val + sigma_pos * half_norm)

    # Physical boundary truncation
    if lower_bound is not None or upper_bound is not None:
        lb = -np.inf if lower_bound is None else lower_bound
        ub = np.inf if upper_bound is None else upper_bound

        invalid_mask = (samples < lb) | (samples > ub)
        resamples = 0
        while np.any(invalid_mask) and resamples < max_resamples:
            n_invalid = int(np.sum(invalid_mask))
            u_sub = rng.uniform(0.0, 1.0, size=n_invalid)
            hn_sub = np.abs(rng.normal(0.0, 1.0, size=n_invalid))
            p_left = sigma_neg / (sigma_pos + sigma_neg)
            sub_samples = np.where(u_sub < p_left, val - sigma_neg * hn_sub, val + sigma_pos * hn_sub)
            samples[invalid_mask] = sub_samples
            invalid_mask = (samples < lb) | (samples > ub)
            resamples += 1

        # Final clip if any tail remains
        if np.any(invalid_mask):
            samples = np.clip(samples, lb, ub)

    return samples


def sample_planet_system(
    teff: MeasuredParameter,
    rstar: MeasuredParameter,
    mstar: Optional[MeasuredParameter],
    period: MeasuredParameter,
    rplanet: Optional[MeasuredParameter],
    mplanet: Optional[MeasuredParameter],
    eccentricity: Optional[MeasuredParameter],
    n_draws: int = 10000,
    seed: Optional[int] = 42
) -> Dict[str, np.ndarray]:
    """
    Samples measured parameters for a planetary system.
    Strictly adheres to:
    - Reject limit rows as measurements.
    - Physical truncations: Teff > 0, R* > 0, M* > 0, P > 0, Rp > 0, Mp > 0, 0 <= e < 1.
    """
    rng = np.random.default_rng(seed)
    draws: Dict[str, np.ndarray] = {}

    # Stellar parameters
    draws["teff"] = sample_split_normal(
        teff.val, teff.err_pos, teff.err_neg, size=n_draws, rng=rng, lower_bound=100.0, upper_bound=50000.0
    )
    draws["rstar"] = sample_split_normal(
        rstar.val, rstar.err_pos, rstar.err_neg, size=n_draws, rng=rng, lower_bound=0.01
    )

    if mstar is not None and mstar.limit_flag == 0 and not np.isnan(mstar.val) and mstar.val > 0:
        draws["mstar"] = sample_split_normal(
            mstar.val, mstar.err_pos, mstar.err_neg, size=n_draws, rng=rng, lower_bound=0.01
        )
        draws["mstar_missing"] = np.zeros(n_draws, dtype=bool)
    else:
        # Mstar is missing: will be derived or flagged
        draws["mstar"] = np.full(n_draws, np.nan)
        draws["mstar_missing"] = np.ones(n_draws, dtype=bool)

    # Orbital period
    draws["period"] = sample_split_normal(
        period.val, period.err_pos, period.err_neg, size=n_draws, rng=rng, lower_bound=0.01
    )

    # Planet radius
    if rplanet is not None and rplanet.limit_flag == 0 and not np.isnan(rplanet.val) and rplanet.val > 0:
        draws["rplanet"] = sample_split_normal(
            rplanet.val, rplanet.err_pos, rplanet.err_neg, size=n_draws, rng=rng, lower_bound=0.05
        )
    else:
        draws["rplanet"] = np.full(n_draws, np.nan)

    # Planet mass
    if mplanet is not None and mplanet.limit_flag == 0 and not np.isnan(mplanet.val) and mplanet.val > 0:
        draws["mplanet"] = sample_split_normal(
            mplanet.val, mplanet.err_pos, mplanet.err_neg, size=n_draws, rng=rng, lower_bound=0.001
        )
    else:
        draws["mplanet"] = np.full(n_draws, np.nan)

    # Eccentricity
    if eccentricity is not None and eccentricity.limit_flag == 0 and not np.isnan(eccentricity.val):
        draws["eccentricity"] = sample_split_normal(
            eccentricity.val, eccentricity.err_pos, eccentricity.err_neg, size=n_draws, rng=rng, lower_bound=0.0, upper_bound=0.999
        )
        draws["ecc_assumed"] = np.zeros(n_draws, dtype=bool)
    else:
        draws["eccentricity"] = np.zeros(n_draws)
        draws["ecc_assumed"] = np.ones(n_draws, dtype=bool)

    return draws
