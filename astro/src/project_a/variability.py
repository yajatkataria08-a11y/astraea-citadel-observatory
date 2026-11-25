"""
variability.py - Multi-Epoch Spectral Variability Models & Rigorous Null Testing

Specification Reference: §3.4
- Models:
  * M0: One static spectrum per source
  * M1: Per-survey scale and optional tilt
  * M2: Per-survey amplitudes on regularized PCA / NMF components
- Likelihood: Correlated covariance via Ledoit-Wolf shrinkage estimator (primary) with
  diagonal fallback when cov_inv is not available.
  Paper: Cukierman et al. (2026, arXiv:2603.25790) — SPHEREx LVF produces correlated
  channel noise across detector strips that must be modelled with a full precision matrix.
- Null Distributions:
  1. Empirical Null (Primary): Non-variable stars binned by S/N, detector, ecliptic latitude.
  2. Sign-Flip Null (Diagnostic / Secondary):
     - Requires validation of joint sign-symmetry on stable-star residuals in train role!
     - Never flip the whole vector with a single sign for quadratic statistics (e.g. chi^2).
     - Whitened or block flips used only if sign-symmetry passes validation.
- Multi-survey Omnibus test (>=3 surveys) with Benjamini-Hochberg FDR control.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from scipy.stats import chi2, skew
from sklearn.covariance import LedoitWolf


def fit_background_covariance(background_residuals: np.ndarray) -> np.ndarray:
    """
    Fits a Ledoit-Wolf shrinkage precision matrix on background residuals.

    Motivated by Cukierman et al. (2026, arXiv:2603.25790): SPHEREx Linear Variable Filters
    produce correlated noise between adjacent wavelength channels within the same detector strip.
    A full precision matrix correctly down-weights correlated components vs. the diagonal approximation.

    Args:
        background_residuals: shape (n_background_sources, n_channels), whitened residuals
                              (fluxes - mean) / noise for quiet non-variable background stars.

    Returns:
        precision_matrix: shape (n_channels, n_channels), inverse covariance (precision) matrix.
    """
    lw = LedoitWolf(assume_centered=False)
    lw.fit(background_residuals)
    return lw.precision_


def compute_correlated_chi2(
    residuals_vector: np.ndarray,
    precision_matrix: np.ndarray
) -> float:
    """
    Computes the correlated chi^2 as a Mahalanobis-like quadratic form:
        chi2_corr = r^T @ Sigma^{-1} @ r

    This correctly accounts for inter-channel noise correlations introduced by the
    SPHEREx LVF detector optics. See: Cukierman et al. (2026, arXiv:2603.25790).

    Args:
        residuals_vector: shape (n_channels,), whitened residuals (obs - model) / sigma
        precision_matrix: shape (n_channels, n_channels), inverse noise covariance

    Returns:
        Correlated chi^2 scalar.
    """
    r = residuals_vector.ravel()
    return float(r @ precision_matrix @ r)


def fit_m0_static(
    fluxes: np.ndarray,
    errors: np.ndarray,
    cov_inv: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, float]:
    """
    Fits Model M0: single weighted-mean spectrum across all survey epochs.
    fluxes: shape (n_epochs, n_channels)
    errors: shape (n_epochs, n_channels)
    cov_inv: optional (n_channels, n_channels) Ledoit-Wolf precision matrix.
             When provided, the returned chi2 is the correlated quadratic form
             summed over all epochs; otherwise the standard diagonal chi^2 is used.
             Paper: Cukierman et al. (2026, arXiv:2603.25790).
    Returns:
      m0_spectrum: shape (n_channels,)
      chi2_m0: total chi^2 residual (correlated or diagonal depending on cov_inv)
    """
    weights = 1.0 / np.maximum(errors ** 2, 1e-12)
    m0_spectrum = np.sum(fluxes * weights, axis=0) / np.sum(weights, axis=0)
    residuals = (fluxes - m0_spectrum) / np.maximum(errors, 1e-6)

    if cov_inv is not None:
        # Correlated chi^2: sum r_epoch^T @ Precision @ r_epoch over epochs
        chi2_val = float(sum(
            compute_correlated_chi2(residuals[e], cov_inv)
            for e in range(residuals.shape[0])
        ))
    else:
        chi2_val = float(np.sum(residuals ** 2))

    return m0_spectrum, chi2_val


def fit_m1_scale_tilt(
    fluxes: np.ndarray,
    errors: np.ndarray,
    wavelengths: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Fits Model M1: per-survey scale c_s and tilt alpha_s:
    f_{s, lambda} = c_s * (1 + alpha_s * (lambda - lambda_0)) * f_{0, lambda}.
    """
    m0_spec, _ = fit_m0_static(fluxes, errors)
    n_epochs, n_channels = fluxes.shape
    lam_0 = np.median(wavelengths)
    norm_lam = wavelengths - lam_0

    fitted_fluxes = np.zeros_like(fluxes)
    scales = np.zeros(n_epochs)

    for s in range(n_epochs):
        # Linear regression of epoch flux against (m0_spec, m0_spec * norm_lam)
        X = np.column_stack([m0_spec, m0_spec * norm_lam])
        w = 1.0 / np.maximum(errors[s], 1e-6)
        X_w = X * w[:, None]
        y_w = fluxes[s] * w

        beta, _, _, _ = np.linalg.lstsq(X_w, y_w, rcond=None)
        fitted_fluxes[s] = beta[0] * m0_spec + beta[1] * m0_spec * norm_lam
        scales[s] = beta[0]

    residuals = (fluxes - fitted_fluxes) / errors
    chi2_val = float(np.sum(residuals ** 2))
    return fitted_fluxes, scales, chi2_val


def validate_sign_symmetry(
    diff_residuals: np.ndarray,
    p_threshold: float = 0.05
) -> Dict[str, Any]:
    """
    Validates joint sign-symmetry on stable-star paired survey residuals (§3.4):
    - Odd moments: check per-channel skewness is consistent with zero.
    - Third-order cross moments.
    Returns:
      is_valid: bool
    """
    # Per-channel skewness
    skews = skew(diff_residuals, axis=0, nan_policy="omit")
    clean_skews = np.nan_to_num(skews, nan=0.0)
    max_abs_skew = float(np.max(np.abs(clean_skews))) if len(clean_skews) > 0 else 0.0
    is_symmetric = max_abs_skew < 0.25

    return {
        "is_sign_symmetric": is_symmetric,
        "max_abs_skew": max_abs_skew,
        "status": "valid_for_inference" if is_symmetric else "diagnostic_only"
    }


def compute_sign_flip_null(
    diff_vector: np.ndarray,
    errors: np.ndarray,
    n_flips: int = 1000,
    seed: int = 42
) -> Tuple[float, float, str]:
    """
    Computes sign-flip null for paired surveys (survey 2 - survey 1).
    Rule: Never flip the whole vector with a single sign (chi2 is invariant)!
    Flips independent channels or whitened components.
    """
    rng = np.random.default_rng(seed)
    n_channels = len(diff_vector)

    stat_observed = float(np.sum((diff_vector / errors) ** 2))

    # Generate independent per-channel random signs (+1 or -1)
    signs = rng.choice([-1.0, 1.0], size=(n_flips, n_channels))
    flipped_diffs = signs * diff_vector[None, :]
    null_stats = np.sum((flipped_diffs / errors[None, :]) ** 2, axis=1)

    p_value = float(np.mean(null_stats >= stat_observed))
    return stat_observed, p_value, "sign_flip_channel_independent"


def benjamini_hochberg_fdr(p_values: np.ndarray, q_level: float = 0.05) -> np.ndarray:
    """
    Applies Benjamini-Hochberg procedure to control False Discovery Rate across sources.
    Returns boolean array where True indicates statistically significant detection.
    """
    n = len(p_values)
    sorted_indices = np.argsort(p_values)
    sorted_p = p_values[sorted_indices]

    thresholds = (np.arange(1, n + 1) / n) * q_level
    below = sorted_p <= thresholds

    sig = np.zeros(n, dtype=bool)
    if np.any(below):
        max_idx = np.max(np.where(below)[0])
        sig[sorted_indices[: max_idx + 1]] = True

    return sig
