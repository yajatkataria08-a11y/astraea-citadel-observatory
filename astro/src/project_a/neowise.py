"""
neowise.py - NEOWISE Synthetic W1/W2 Photometry & Historical Baseline Consistency

Specification Reference: §3.6 (NEOWISE Mid-Infrared Baseline)
Research Precedent:
  Karambelkar et al. (2026, arXiv:2602.07129):
    "Two New FU Orionis Objects Discovered via NEOWISE and SPHEREx"
    Demonstrated that SPHEREx channels at 3.4 um and 4.6 um overlap the WISE W1/W2 bandpasses,
    enabling synthetic photometry for direct archive comparison. FUOr outburst candidates with
    delta_W1 > 1.0 mag AND multi-epoch detection are classified as genuine;
    single-epoch detections are penalised as likely cosmic-ray glints.

Implements:
  - compute_synthetic_wise(): SPHEREx spectrum -> synthetic W1/W2 photometry via Gaussian bandpass.
  - assess_neowise_consistency(): Scores historical delta-mag as genuine outburst or artifact.
"""

from typing import Dict, Optional, Tuple
import numpy as np


# WISE bandpass centres and approximate widths (sigma in microns)
_W1_CENTRE_UM = 3.4
_W1_SIGMA_UM = 0.35
_W2_CENTRE_UM = 4.6
_W2_SIGMA_UM = 0.50

# Thresholds from Karambelkar et al. (2026)
_GENUINE_OUTBURST_THRESHOLD_MAG = 1.0   # delta mag that flags a likely FUOr / outburst
_MULTI_EPOCH_MIN = 2                    # need >= 2 epochs for genuine outburst classification


def compute_synthetic_wise(
    wavelengths: np.ndarray,
    flux_spectrum: np.ndarray
) -> Tuple[float, float]:
    """
    Derives synthetic WISE W1 (3.4 um) and W2 (4.6 um) AB magnitudes from a SPHEREx spectrum
    using Gaussian bandpass approximations for the WISE bandpasses.

    Motivated by Karambelkar et al. (2026, arXiv:2602.07129): SPHEREx channels overlap
    NEOWISE W1/W2 and enable direct archive cross-matching for mid-IR transient discovery.

    Args:
        wavelengths:    1-D array of SPHEREx channel wavelengths in microns, shape (n_channels,)
        flux_spectrum:  1-D flux density array in arbitrary linear units, shape (n_channels,)

    Returns:
        w1_mag: synthetic W1 (3.4 um) AB magnitude
        w2_mag: synthetic W2 (4.6 um) AB magnitude
    """
    # Gaussian transmission curves centred on W1 and W2
    t_w1 = np.exp(-((wavelengths - _W1_CENTRE_UM) ** 2) / (2 * _W1_SIGMA_UM ** 2))
    t_w2 = np.exp(-((wavelengths - _W2_CENTRE_UM) ** 2) / (2 * _W2_SIGMA_UM ** 2))

    # Band-integrated flux: weighted average over transmission
    w1_flux = np.sum(flux_spectrum * t_w1) / max(np.sum(t_w1), 1e-6)
    w2_flux = np.sum(flux_spectrum * t_w2) / max(np.sum(t_w2), 1e-6)

    # Convert to magnitudes (relative AB scale; zero-point cancels in delta-mag)
    w1_mag = -2.5 * np.log10(max(float(w1_flux), 1e-10))
    w2_mag = -2.5 * np.log10(max(float(w2_flux), 1e-10))

    return w1_mag, w2_mag


def assess_neowise_consistency(
    w1_synthetic: float,
    w2_synthetic: float,
    neowise_w1_baseline: Optional[float] = None,
    neowise_w2_baseline: Optional[float] = None,
    n_epochs_detected: int = 1
) -> Dict:
    """
    Compares SPHEREx synthetic W1/W2 to archival NEOWISE baseline magnitudes and
    produces a novelty confidence score for the interestingness ranker.

    Classification rules from Karambelkar et al. (2026, arXiv:2602.07129):
      - delta_W1 >= 1.0 mag AND n_epochs >= 2  → genuine outburst (high confidence)
      - delta_W1 >= 1.0 mag AND n_epochs == 1  → possible cosmic-ray glint (penalty)
      - delta_W1 < 1.0 mag                     → no significant mid-IR change

    Args:
        w1_synthetic:        SPHEREx-derived synthetic W1 magnitude
        w2_synthetic:        SPHEREx-derived synthetic W2 magnitude
        neowise_w1_baseline: Archival NEOWISE W1 quiescent magnitude (None → no comparison)
        neowise_w2_baseline: Archival NEOWISE W2 quiescent magnitude (None → no comparison)
        n_epochs_detected:   Number of SPHEREx epochs showing the brightening

    Returns:
        dict with keys:
          delta_w1:        magnitude difference (baseline - synthetic); positive = brightening
          delta_w2:        same for W2
          neowise_novelty_score: float in [0, 1], feed into InterestingnessRanker
          classification:  str label
          confidence:      float in [0, 1]
    """
    if neowise_w1_baseline is None or neowise_w2_baseline is None:
        # No NEOWISE archive entry — neutral score
        return {
            "delta_w1": 0.0,
            "delta_w2": 0.0,
            "neowise_novelty_score": 0.0,
            "classification": "no_archive_baseline",
            "confidence": 0.0,
        }

    delta_w1 = float(neowise_w1_baseline - w1_synthetic)   # positive = object brightened
    delta_w2 = float(neowise_w2_baseline - w2_synthetic)

    abs_delta = max(abs(delta_w1), abs(delta_w2))

    if abs_delta >= _GENUINE_OUTBURST_THRESHOLD_MAG and n_epochs_detected >= _MULTI_EPOCH_MIN:
        classification = "genuine_outburst"
        confidence = float(np.clip(abs_delta / 2.0, 0.5, 1.0))
        novelty_score = confidence
    elif abs_delta >= _GENUINE_OUTBURST_THRESHOLD_MAG and n_epochs_detected < _MULTI_EPOCH_MIN:
        classification = "possible_cosmic_ray_glint"
        confidence = 0.3
        novelty_score = 0.3   # Penalised single-epoch detection
    elif abs_delta >= 0.3:
        classification = "minor_mid_ir_change"
        confidence = float(np.clip(abs_delta / _GENUINE_OUTBURST_THRESHOLD_MAG, 0.0, 0.5))
        novelty_score = confidence
    else:
        classification = "no_significant_change"
        confidence = 0.0
        novelty_score = 0.0

    return {
        "delta_w1": delta_w1,
        "delta_w2": delta_w2,
        "neowise_novelty_score": novelty_score,
        "classification": classification,
        "confidence": confidence,
    }
