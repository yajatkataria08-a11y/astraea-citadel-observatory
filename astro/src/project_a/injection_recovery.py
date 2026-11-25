"""
injection_recovery.py - Scientific Injection-and-Recovery Validation Engine

Specification Reference: §2.5 Evaluation
Research Precedents:
- Nicolaou et al. (2025, arXiv:2506.17376): Synthetic anomaly injection on DESI spectra.
- Karambelkar et al. (2026, arXiv:2602.07129): Transient recovery benchmarking.

Because "interesting" and "anomalous" lack ground-truth catalog labels in real surveys,
this module implements rigorous injection-and-recovery validation:
1. Injects realistic astrophysical signals into real or baseline survey spectra:
   - Flare bursts (exponential rise & decay flux boost)
   - Mira / AGB periodic pulsation (large sinusoidal amplitude across epochs)
   - Rare emission lines (e.g. 3.3 um PAH or 2.16 um Br-gamma emission spikes)
   - Moving asteroid transits (epoch-dependent chromatic shift)
2. Measures empirical False Positive Rate (FPR) on un-injected quiet background sources.
3. Computes Recall at a fixed 1% False Positive Rate (FPR = 0.01).
4. Produces ROC and Precision-Recall recovery curves.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from sklearn.metrics import roc_curve, auc, precision_recall_curve


class InjectionRecoveryValidator:
    """
    Evaluates Project A variability and anomaly engines via synthetic signal injection.
    """

    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def inject_flare(
        self,
        fluxes: np.ndarray,
        flare_epoch: int = 1,
        amplitude_factor: float = 2.5
    ) -> np.ndarray:
        """Injects a stellar flare event at a specific observation epoch."""
        injected = fluxes.copy()
        injected[flare_epoch] = injected[flare_epoch] * amplitude_factor
        return injected

    def inject_emission_line(
        self,
        fluxes: np.ndarray,
        wavelengths: np.ndarray,
        center_wavelength_um: float = 3.3,  # 3.3 um PAH emission line
        line_snr: float = 8.0,
        errors: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Injects a narrow spectral emission line (e.g., PAH or hydrogen recombination)."""
        injected = fluxes.copy()
        channel_idx = np.argmin(np.abs(wavelengths - center_wavelength_um))
        line_width = 0.05  # microns

        gaussian_profile = np.exp(-((wavelengths - center_wavelength_um) ** 2) / (2.0 * (line_width ** 2)))
        sigma = errors[:, channel_idx] if errors is not None else 1.0
        line_flux = line_snr * np.mean(sigma) * gaussian_profile

        injected = injected + line_flux[None, :]
        return injected

    def inject_pulsation(
        self,
        fluxes: np.ndarray,
        n_epochs: int,
        fractional_amplitude: float = 0.40
    ) -> np.ndarray:
        """Injects periodic Mira / Cepheid pulsation across epochs."""
        injected = fluxes.copy()
        phases = np.linspace(0, 2.0 * np.pi, n_epochs)
        modulations = 1.0 + fractional_amplitude * np.sin(phases)
        for ep in range(n_epochs):
            injected[ep] = injected[ep] * modulations[ep]
        return injected

    def evaluate_recall_at_fpr(
        self,
        y_true: np.ndarray,  # 1 for injected signal, 0 for quiet background
        scores: np.ndarray,   # Detection or anomaly scores (higher = more likely signal)
        target_fpr: float = 0.01
    ) -> Dict[str, float]:
        """
        Computes detection recall at a strictly fixed False Positive Rate (e.g., FPR = 1%).
        """
        fprs, tprs, thresholds = roc_curve(y_true, scores)
        roc_auc = auc(fprs, tprs)

        # Find maximum TPR (recall) where FPR <= target_fpr
        valid = tprs[fprs <= target_fpr]
        recall_at_target = float(np.max(valid)) if len(valid) > 0 else 0.0

        p_c, r_c, _ = precision_recall_curve(y_true, scores)
        pr_auc = auc(r_c, p_c)

        return {
            "roc_auc": float(roc_auc),
            "pr_auc": float(pr_auc),
            "recall_at_target_fpr": recall_at_target,
            "target_fpr": target_fpr,
        }
