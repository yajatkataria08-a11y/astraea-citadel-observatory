"""
quarantine.py - Stage 0 Instrument Quarantine Protocol

Specification Reference: §3.5
- Stage 0: Quarantine before astrophysical scoring.
- Flags:
  * Flagged detector channels (saturation, bad pixels)
  * Stellar crowding / blends
  * Bright-star proximity (diffraction spikes, ghosting)
  * Missing channels (incomplete 6-detector coverage)
  * Cross-release mismatch (QR2 gain vs QR3 without correction)
  * Detector-edge contamination
  * Atmospheric/instrument template contamination (aurora, He, shuttle glow)
- Rule: Quarantined sources are investigated as instrument systematic cases,
  NEVER discarded silently.
"""

from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd


class InstrumentQuarantine:
    """Evaluates whether a source or observation must be quarantined before ML."""

    def __init__(
        self,
        edge_pixel_margin: int = 8,
        min_channels_required: int = 90,
        max_flagged_fraction: float = 0.15,
        bright_star_sep_arcsec: float = 30.0
    ):
        self.edge_pixel_margin = edge_pixel_margin
        self.min_channels_required = min_channels_required
        self.max_flagged_fraction = max_flagged_fraction
        self.bright_star_sep_arcsec = bright_star_sep_arcsec

    def evaluate_source(self, obs_record: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Returns:
          is_quarantined: bool
          quarantine_reasons: list of triggered diagnostic flags
        """
        reasons = []

        # 1. Missing or incomplete spectral channels
        n_channels = obs_record.get("n_valid_channels", 0)
        if n_channels < self.min_channels_required:
            reasons.append(f"insufficient_channels_{n_channels}_lt_{self.min_channels_required}")

        # 2. Flagged pixel fraction
        flag_fraction = obs_record.get("flagged_pixel_fraction", 0.0)
        if flag_fraction > self.max_flagged_fraction:
            reasons.append(f"high_flagged_fraction_{flag_fraction:.2f}")

        # 3. Detector edge proximity
        dist_to_edge = obs_record.get("dist_to_detector_edge_px", 100)
        if dist_to_edge < self.edge_pixel_margin:
            reasons.append(f"detector_edge_proximity_{dist_to_edge}px")

        # 4. Bright star proximity
        bright_sep = obs_record.get("nearest_bright_star_arcsec", 999.0)
        if bright_sep < self.bright_star_sep_arcsec:
            reasons.append(f"bright_star_proximity_{bright_sep:.1f}arcsec")

        # 5. Uncorrected release mixing
        release = str(obs_record.get("release", "QR3"))
        flux_corr_applied = obs_record.get("flux_correction_applied", True)
        if release == "QR2" and not flux_corr_applied:
            reasons.append("uncorrected_qr2_release_mixing")

        # 6. Atmospheric template contamination
        atm_contam = obs_record.get("atmospheric_template_flag", False)
        if atm_contam:
            reasons.append("atmospheric_template_contamination")

        is_quarantined = len(reasons) > 0
        return is_quarantined, reasons
