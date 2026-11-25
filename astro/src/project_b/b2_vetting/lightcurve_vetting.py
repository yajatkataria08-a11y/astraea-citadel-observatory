"""
lightcurve_vetting.py - Astrophysical Light Curve Vetting & Eclipsing Binary Rejection

Specification Reference: §1.3, §2.6, Project B2 Roadmap
Research Precedents:
- Valizadegan et al. (2022, 2024): ExoMiner and ExoMiner++ (Odd-even, secondary, centroid checks)
- Shallue & Vanderburg (2018): AstroNet local/global harmonic views
- Coughlin et al. (2014, 2016): Kepler False Positive vetting & Robovetter
- Batalha et al. (2010): Pre-search data conditioning & centroid pixel tests

Provides:
1. Student's t-test odd-even transit depth consistency test (Eclipsing Binary detection)
2. Secondary eclipse depth & significance search at phase ~ 0.5 (Thermal/Occultation test)
3. Difference-image centroid shift tripwire test (Background EB blend test)
4. Graceful integration with lightkurve (when available) or vectorized numpy/scipy routines
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from scipy import stats

try:
    import lightkurve as lk
    HAS_LIGHTKURVE = True
except ImportError:
    HAS_LIGHTKURVE = False


def fold_light_curve(
    time: np.ndarray,
    flux: np.ndarray,
    period: float,
    epoch: float
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Phase-folds light curve times onto interval [-0.5, 0.5) centered on transit.
    Returns (phase, sorted_flux, transit_indices).
    """
    phase = ((time - epoch + 0.5 * period) % period) / period - 0.5
    transit_number = np.floor((time - epoch + 0.5 * period) / period).astype(int)
    sort_idx = np.argsort(phase)
    return phase[sort_idx], flux[sort_idx], transit_number[sort_idx]


def compute_odd_even_transit_depth_test(
    time: np.ndarray,
    flux: np.ndarray,
    period: float,
    epoch: float,
    duration_hours: float
) -> Dict[str, Any]:
    """
    Performs the Student's t-test consistency test between odd and even transits.
    Eclipsing binaries (EBs) typically have alternating primary and secondary depths.
    
    Returns:
    - odd_depth_ppm: Depth of odd transits in parts-per-million
    - even_depth_ppm: Depth of even transits in parts-per-million
    - t_statistic: Student's t-test significance of depth difference
    - p_value: Two-tailed p-value
    - is_odd_even_eb: True if depth difference > 3.0 sigma
    """
    if len(time) < 20 or period <= 0:
        return {
            "odd_depth_ppm": 0.0, "even_depth_ppm": 0.0,
            "t_statistic": 0.0, "p_value": 1.0, "is_odd_even_eb": False
        }

    dur_days = duration_hours / 24.0
    half_dur_phase = (dur_days / period) / 2.0

    transit_num = np.floor((time - epoch + 0.5 * period) / period).astype(int)
    phase = ((time - epoch + 0.5 * period) % period) / period - 0.5

    in_transit_mask = np.abs(phase) < half_dur_phase
    out_transit_mask = (np.abs(phase) >= half_dur_phase) & (np.abs(phase) < 3.0 * half_dur_phase)

    baseline = np.median(flux[out_transit_mask]) if np.any(out_transit_mask) else 1.0

    odd_mask = in_transit_mask & (transit_num % 2 == 1)
    even_mask = in_transit_mask & (transit_num % 2 == 0)

    flux_odd = flux[odd_mask]
    flux_even = flux[even_mask]

    if len(flux_odd) < 5 or len(flux_even) < 5:
        # Insufficient transits to distinguish
        return {
            "odd_depth_ppm": 0.0, "even_depth_ppm": 0.0,
            "t_statistic": 0.0, "p_value": 1.0, "is_odd_even_eb": False
        }

    depth_odd = max(0.0, float(baseline - np.median(flux_odd))) * 1e6
    depth_even = max(0.0, float(baseline - np.median(flux_even))) * 1e6

    t_stat, p_val = stats.ttest_ind(flux_odd, flux_even, equal_var=False)

    return {
        "odd_depth_ppm": depth_odd,
        "even_depth_ppm": depth_even,
        "depth_difference_ppm": abs(depth_odd - depth_even),
        "t_statistic": float(abs(t_stat)) if np.isfinite(t_stat) else 0.0,
        "p_value": float(p_val) if np.isfinite(p_val) else 1.0,
        "is_odd_even_eb": bool(abs(t_stat) > 3.0) if np.isfinite(t_stat) else False
    }


def search_secondary_eclipse(
    time: np.ndarray,
    flux: np.ndarray,
    period: float,
    epoch: float,
    duration_hours: float
) -> Dict[str, Any]:
    """
    Searches for a secondary eclipse around occultation phase (phase ~ 0.5).
    In exoplanet systems, secondary depth is typically negligible (< 100 ppm).
    In eclipsing binary systems, a secondary minimum indicates stellar occultation.
    """
    if len(time) < 20 or period <= 0:
        return {
            "secondary_depth_ppm": 0.0, "secondary_snr": 0.0,
            "secondary_ratio": 0.0, "has_secondary_eclipse": False
        }

    dur_days = duration_hours / 24.0
    half_dur_phase = (dur_days / period) / 2.0

    phase = ((time - epoch + 0.5 * period) % period) / period - 0.5

    # Primary transit at phase 0.0
    pri_in_mask = np.abs(phase) < half_dur_phase
    # Secondary transit near phase 0.5 or -0.5
    sec_in_mask = np.abs(np.abs(phase) - 0.5) < half_dur_phase
    # Out of transit baseline
    out_mask = (np.abs(phase) > 2.0 * half_dur_phase) & (np.abs(np.abs(phase) - 0.5) > 2.0 * half_dur_phase)

    if not np.any(out_mask) or not np.any(pri_in_mask) or not np.any(sec_in_mask):
        return {
            "secondary_depth_ppm": 0.0, "secondary_snr": 0.0,
            "secondary_ratio": 0.0, "has_secondary_eclipse": False
        }

    baseline = np.median(flux[out_mask])
    std_out = np.std(flux[out_mask]) if np.sum(out_mask) > 5 else 1e-4

    pri_depth = max(1e-6, float(baseline - np.median(flux[pri_in_mask]))) * 1e6
    sec_depth = max(0.0, float(baseline - np.median(flux[sec_in_mask]))) * 1e6

    sec_snr = (sec_depth * 1e-6) / (std_out / np.sqrt(np.sum(sec_in_mask))) if std_out > 0 else 0.0
    sec_ratio = sec_depth / pri_depth if pri_depth > 0 else 0.0

    # Secondary eclipse flag: significant detection (> 3.5 sigma) with material depth ratio (> 5%)
    has_secondary = bool(sec_snr > 3.5 and sec_ratio > 0.05)

    return {
        "primary_depth_ppm": pri_depth,
        "secondary_depth_ppm": sec_depth,
        "secondary_snr": float(sec_snr),
        "secondary_ratio": float(sec_ratio),
        "has_secondary_eclipse": has_secondary
    }


def compute_difference_image_centroid_tripwire(
    diff_offset_arcsec: float,
    offset_err_arcsec: float,
    sigma_threshold: float = 3.0
) -> Dict[str, Any]:
    """
    Difference-image centroid offset quarantine test (§1.3).
    Quarantines targets where transit centroid shift exceeds threshold.
    """
    if np.isnan(diff_offset_arcsec) or np.isnan(offset_err_arcsec) or offset_err_arcsec <= 0:
        return {
            "centroid_sigma": np.nan,
            "is_quarantined": False,
            "reason": None
        }

    sigma = float(diff_offset_arcsec / offset_err_arcsec)
    quarantined = sigma >= sigma_threshold
    reason = f"Centroid shift {sigma:.2f}sigma >= {sigma_threshold:.1f}sigma (Background EB blend)" if quarantined else None

    return {
        "centroid_sigma": sigma,
        "is_quarantined": quarantined,
        "reason": reason
    }
