"""
priority.py - Science Score and Joint Follow-Up Priority (TSM / ESM) Evaluation

Specification Reference: §2.5
- Science score:
    S_science(h) = P(rocky-compatible & HZ_h), h in {conservative, optimistic}
- Follow-up priority:
    priority_T(h) = E_draws[ 1{rocky-compatible & HZ_h} * g(TSM; thr_T) | D ]
    priority_E(h) = E_draws[ 1{rocky-compatible & HZ_h & terr} * g(ESM; thr_E) | D ]
    where terr = 1{Rp < 1.5 R_earth} per draw
    g(x; thr) = 1 / (1 + (thr / x)^k), k = 2 (tested for k in {1, 2, 4})
- ALL terms evaluated on the SAME joint posterior draws and averaged once!
  Never multiply separately averaged marginals.
- TSM & ESM strictly follow Kempton et al. 2018 (PASP 130, 114401):
  * Precedence rule: Putative HZ sample (Rp < 2 R_earth, 0.2 < S < 2 S_earth)
    takes precedence -> scale factor 0.167, threshold 10.
  * Terrestrial (Rp < 1.5 R_earth, non-HZ) -> scale factor 0.190, threshold 10.
  * Larger bins (1.5 <= Rp < 10 R_earth) -> threshold 90, scale factors [1.26, 1.28, 1.15].
  * ESM computed ONLY for terrestrial (Rp < 1.5 R_earth) transiting planets using
    host 2MASS K-band. Never substitute J for K!
"""

from typing import Dict, Optional, Tuple
import numpy as np

# Physical constants for Planck radiation
# c2 / lambda at 7.5 microns: (h * c / k_B) / (7.5e-6 m) ~ 1918.37 K
C2_OVER_LAMBDA_7_5UM = 1918.36918


def planck_ratio_7_5um(t_day: np.ndarray, t_eff: np.ndarray) -> np.ndarray:
    """
    Computes B_7.5(T_day) / B_7.5(T_eff) using the Planck radiation law at 7.5 microns.
    B(T) = (2hc^2 / lambda^5) / (exp(hc / lambda k T) - 1)
    """
    x_day = np.clip(C2_OVER_LAMBDA_7_5UM / np.maximum(t_day, 10.0), 1e-4, 50.0)
    x_eff = np.clip(C2_OVER_LAMBDA_7_5UM / np.maximum(t_eff, 10.0), 1e-4, 50.0)

    # Ratio = (exp(x_eff) - 1) / (exp(x_day) - 1)
    exp_eff_minus_1 = np.expm1(x_eff)
    exp_day_minus_1 = np.expm1(x_day)

    return np.where(exp_day_minus_1 > 0, exp_eff_minus_1 / exp_day_minus_1, 0.0)


def soft_gate(x: np.ndarray, threshold: float, k: float = 2.0) -> np.ndarray:
    """Soft priority sigmoid gate: g(x; thr) = 1 / (1 + (thr / x)^k)."""
    valid = (x > 0) & (~np.isnan(x))
    res = np.zeros_like(x, dtype=float)
    ratio = np.where(valid, threshold / x, np.inf)
    res[valid] = 1.0 / (1.0 + (ratio[valid] ** k))
    return res


def compute_tsm_per_draw(
    rp: np.ndarray,
    mp: np.ndarray,
    rstar: np.ndarray,
    teff: np.ndarray,
    semi_major_axis: np.ndarray,
    flux_s: np.ndarray,
    j_mag: float
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes Transmission Spectroscopy Metric (TSM) per draw following Kempton et al. 2018.
    Returns:
      tsm: array of TSM values
      threshold: array of matching thresholds (10 for HZ/terrestrial, 90 for larger)
    """
    n_draws = len(rp)
    # T_eq = Teff * (R* [in AU] / (2 * a [in AU]))^(1/2) assuming zero albedo & uniform heat redistribution
    # R_sun in AU = 0.00465047
    rstar_au = rstar * 0.00465047
    t_eq = teff * np.sqrt(rstar_au / (2.0 * np.maximum(semi_major_axis, 1e-5)))

    # Base factor: Rp^3 * Teq / (Mp * R*^2) * 10^(-m_J / 5)
    base_factor = (rp ** 3) * t_eq / (np.maximum(mp, 1e-4) * (rstar ** 2)) * (10.0 ** (-j_mag / 5.0))

    scale_factor = np.zeros(n_draws)
    threshold = np.zeros(n_draws)

    # Precedence Rule from §2.5:
    # 1. Putative HZ sample: Rp < 2.0 R_earth AND 0.2 < S < 2.0 S_earth
    mask_hz = (rp < 2.0) & (flux_s > 0.2) & (flux_s < 2.0)
    scale_factor[mask_hz] = 0.167
    threshold[mask_hz] = 10.0

    # 2. Terrestrial (Rp < 1.5 R_earth, not in category 1)
    mask_terr = (rp < 1.5) & (~mask_hz)
    scale_factor[mask_terr] = 0.190
    threshold[mask_terr] = 10.0

    # 3. Small sub-Neptunes: 1.5 <= Rp < 2.75, not in category 1
    mask_small_subnep = (rp >= 1.5) & (rp < 2.75) & (~mask_hz)
    scale_factor[mask_small_subnep] = 1.26
    threshold[mask_small_subnep] = 90.0

    # 4. Medium sub-Neptunes: 2.75 <= Rp < 4.0, not in category 1
    mask_med_subnep = (rp >= 2.75) & (rp < 4.0) & (~mask_hz)
    scale_factor[mask_med_subnep] = 1.28
    threshold[mask_med_subnep] = 90.0

    # 5. Large sub-Neptunes: 4.0 <= Rp < 10.0, not in category 1
    mask_large_subnep = (rp >= 4.0) & (rp < 10.0) & (~mask_hz)
    scale_factor[mask_large_subnep] = 1.15
    threshold[mask_large_subnep] = 90.0

    tsm = scale_factor * base_factor
    return tsm, threshold


def compute_esm_per_draw(
    rp: np.ndarray,
    rstar: np.ndarray,
    teff: np.ndarray,
    semi_major_axis: np.ndarray,
    k_mag: Optional[float]
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes Emission Spectroscopy Metric (ESM) per draw following Kempton et al. 2018 Eq 4.
    Strict Policy (§2.5):
    - ESM is NOT computed for non-terrestrial planets (Rp >= 1.5 R_earth).
    - If k_mag is missing or NaN: return not computed (all NaN).
    - Threshold is strictly 7.5.
    """
    n_draws = len(rp)
    if k_mag is None or np.isnan(k_mag):
        return np.full(n_draws, np.nan), np.full(n_draws, 7.5)

    rstar_au = rstar * 0.00465047
    t_eq = teff * np.sqrt(rstar_au / (2.0 * np.maximum(semi_major_axis, 1e-5)))
    t_day = 1.10 * t_eq

    # Planck flux ratio at 7.5 microns
    b_ratio = planck_ratio_7_5um(t_day, teff)

    # R_earth in R_sun = 0.0091705
    rp_in_rsun = rp * 0.0091705
    area_ratio = (rp_in_rsun / rstar) ** 2

    # ESM = 4.29e5 * (B_7.5(T_day) / B_7.5(T_eff)) * (Rp / R*)^2 * 10^(-m_K / 5)
    raw_esm = 4.29e5 * b_ratio * area_ratio * (10.0 ** (-k_mag / 5.0))

    # Mask to terrestrial only (Rp < 1.5 R_earth)
    is_terrestrial = rp < 1.5
    esm = np.where(is_terrestrial, raw_esm, np.nan)
    threshold = np.full(n_draws, 7.5)

    return esm, threshold


def evaluate_joint_system_priorities(
    draws: Dict[str, np.ndarray],
    is_rocky_draws: np.ndarray,
    in_hz_conservative_draws: np.ndarray,
    in_hz_optimistic_draws: np.ndarray,
    j_mag: Optional[float],
    k_mag: Optional[float],
    is_transiting: bool = True,
    k_gate: float = 2.0
) -> Dict[str, float]:
    """
    Evaluates Science Score and Joint Follow-Up Priorities (priority_T, priority_E)
    across the SAME joint posterior draws, averaged once.
    """
    # 1. Science Scores
    p_rocky_hz_cons = float(np.nanmean(is_rocky_draws * in_hz_conservative_draws))
    p_rocky_hz_opt = float(np.nanmean(is_rocky_draws * in_hz_optimistic_draws))

    out = {
        "p_rocky_conservative_hz": p_rocky_hz_cons,
        "p_rocky_optimistic_hz": p_rocky_hz_opt,
        "priority_T_conservative": 0.0,
        "priority_T_optimistic": 0.0,
        "priority_E_conservative": 0.0,
        "priority_E_optimistic": 0.0,
        "median_tsm": np.nan,
        "median_esm": np.nan,
    }

    if not is_transiting:
        return out

    rp = draws["rplanet"]
    mp = draws["mplanet"]
    rstar = draws["rstar"]
    teff = draws["teff"]
    a = draws["semi_major_axis"]
    s = draws["flux_instellation"]

    # Transmission Priority (TSM)
    if j_mag is not None and not np.isnan(j_mag) and not np.all(np.isnan(rp)) and not np.all(np.isnan(mp)):
        tsm_draws, thr_t_draws = compute_tsm_per_draw(rp, mp, rstar, teff, a, s, j_mag)
        g_t = soft_gate(tsm_draws, thr_t_draws, k=k_gate)

        out["priority_T_conservative"] = float(np.nanmean(is_rocky_draws * in_hz_conservative_draws * g_t))
        out["priority_T_optimistic"] = float(np.nanmean(is_rocky_draws * in_hz_optimistic_draws * g_t))
        out["median_tsm"] = float(np.nanmedian(tsm_draws))

    # Emission Priority (ESM)
    if k_mag is not None and not np.isnan(k_mag) and not np.all(np.isnan(rp)):
        esm_draws, thr_e_draws = compute_esm_per_draw(rp, rstar, teff, a, k_mag)
        # terr = 1{Rp < 1.5 R_earth}
        terr = (rp < 1.5).astype(float)
        # draws with Rp >= 1.5 contribute 0 to priority_E
        g_e = np.where(terr > 0, soft_gate(esm_draws, thr_e_draws, k=k_gate), 0.0)

        out["priority_E_conservative"] = float(np.nanmean(is_rocky_draws * in_hz_conservative_draws * terr * g_e))
        out["priority_E_optimistic"] = float(np.nanmean(is_rocky_draws * in_hz_optimistic_draws * terr * g_e))
        out["median_esm"] = float(np.nanmedian(esm_draws))

    return out
