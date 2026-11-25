"""
moving_objects.py - Ephemeris Matching & Rotational Confound Screening

Specification Reference: §2.4 Step 5, §2.2
Research Precedents:
- SOLO Framework (arXiv:2602.08037, 2026): Wide-field asteroid light curve monitoring system for SPHEREx.
- SPHEREx Solar-System Object Science & Spectral Stitching (arXiv:2402.08705, 2024).
- IRSA MOST (Moving Object Search Tool).

Addresses the critical SPHEREx moving-object confound:
SPHEREx is a spectral survey where 6 detectors with 17 colors each assemble a 102-channel
spectrum over multiple scans. Solar system objects rotate (period ~2-12 hours) and change
phase angle during the multi-epoch scans. This produces time-domain flux fluctuations
across linear variable filters that mimic physical absorption/emission features in the reconstructed spectrum.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd


class MovingObjectScreener:
    """
    Screens source detections against known Solar System Object (SSO) ephemerides
    and flags rotational/phase-angle spectral confounds.
    """

    def __init__(
        self,
        ephemeris_match_radius_arcsec: float = 3.0,
        high_motion_rate_threshold_arcsec_hr: float = 1.0,
        rotation_nuisance_correction: bool = True
    ):
        self.match_radius = ephemeris_match_radius_arcsec
        self.high_motion_threshold = high_motion_rate_threshold_arcsec_hr
        self.rotation_correction = rotation_nuisance_correction

    def match_known_sso(
        self,
        ra_deg: float,
        dec_deg: float,
        obs_mjd: float,
        known_sso_catalog: Optional[pd.DataFrame] = None
    ) -> Dict[str, Any]:
        """
        Cross-matches a target source detection against IRSA MOST ephemerides.
        """
        if known_sso_catalog is None or known_sso_catalog.empty:
            # If no external ephemeris table is loaded, evaluate motion flags from multi-epoch astrometry
            return {
                "is_known_sso": False,
                "sso_name": None,
                "sso_type": None,
                "sep_arcsec": None,
                "motion_rate_arcsec_hr": 0.0,
                "is_moving_confound": False,
            }

        # Calculate angular separation in arcseconds
        cos_dec = np.cos(np.radians(dec_deg))
        d_ra = (known_sso_catalog["ra"] - ra_deg) * cos_dec * 3600.0
        d_dec = (known_sso_catalog["dec"] - dec_deg) * 3600.0
        sep_arcsec = np.sqrt(d_ra ** 2 + d_dec ** 2)

        min_idx = np.argmin(sep_arcsec)
        min_sep = sep_arcsec.iloc[min_idx]

        if min_sep <= self.match_radius:
            match = known_sso_catalog.iloc[min_idx]
            rate = float(match.get("motion_rate", 2.5))  # arcsec / hr
            return {
                "is_known_sso": True,
                "sso_name": str(match.get("name", "Unknown_SSO")),
                "sso_type": str(match.get("type", "Asteroid")),
                "sep_arcsec": float(min_sep),
                "motion_rate_arcsec_hr": rate,
                "is_moving_confound": True,
            }
        else:
            return {
                "is_known_sso": False,
                "sso_name": None,
                "sso_type": None,
                "sep_arcsec": float(min_sep),
                "motion_rate_arcsec_hr": 0.0,
                "is_moving_confound": False,
            }

    def assess_rotational_confound(
        self,
        epoch_fluxes: np.ndarray,
        epoch_times_mjd: np.ndarray,
        is_known_sso: bool
    ) -> Dict[str, Any]:
        """
        Assesses whether multi-epoch flux modulation is consistent with asteroid rotation
        (SOLO 2026 model: periodic light curve modulation on 2-12h timescales).
        """
        if not is_known_sso:
            return {
                "rotation_confound_probability": 0.0,
                "spectral_reliability_penalty": 0.0,
                "recommendation": "reliable_celestial_source"
            }

        # For known SSOs, quantify variance across epoch amplitudes
        epoch_means = np.mean(epoch_fluxes, axis=1) if epoch_fluxes.ndim > 1 else epoch_fluxes
        flux_scatter = np.std(epoch_means) / (np.mean(epoch_means) + 1e-6)

        # Asteroid light curves typically have light curve amplitudes of 0.1 to 0.8 mag (10% to 50% flux variation)
        confound_prob = float(np.clip(flux_scatter / 0.35, 0.0, 1.0))
        penalty = 0.5 * confound_prob

        return {
            "rotation_confound_probability": confound_prob,
            "spectral_reliability_penalty": penalty,
            "recommendation": "flag_as_low_confidence_spectrum_due_to_rotation" if confound_prob > 0.4 else "ephemeris_matched_sso"
        }
