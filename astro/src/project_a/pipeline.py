"""
pipeline.py - Project A (Sky Change Explorer) End-to-End ML Pipeline — UPGRADED v2

Specification Reference: Revision 5, §3, §2.4, §2.5
Orchestrates the complete 6-stage discovery and triage architecture:
  Stage 0: Instrument Quarantine Gate (detector edges, bright-star halos, release mixing)
  Stage 1: Multi-Epoch Variability Test (M0 vs M1 likelihood ratio, Ledoit-Wolf correlated chi2,
            FDR control, sign-symmetry)  [Upgrade 1: Cukierman et al. 2026]
  Stage 2: Spectral Anomaly Engine (PCA, Mahalanobis, Isolation Forest, Masked-AE ensemble)
            [Upgrade 3: Nicolaou et al. 2025; Zhong et al. 2024]
  Stage 3: Spectral Typing & Template Matching (UCDs, YSOs, AGNs, AGBs, Main Sequence)
  Stage 3b: NEOWISE Synthetic Photometry & Historical Consistency
            [Upgrade 2: Karambelkar et al. 2026]
  Stage 4: Moving Object & Ephemeris Screener (MOST matching + rotational confound penalty)
  Stage 5: Multi-Evidence Interestingness Ranker & Candidate Triage (Active Learning)
            [Upgrade 4/5: Lochner & Bassett 2021]
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd

from .quarantine import InstrumentQuarantine
from .variability import (
    fit_m0_static,
    fit_m1_scale_tilt,
    validate_sign_symmetry,
    compute_sign_flip_null,
    benjamini_hochberg_fdr,
    fit_background_covariance,   # Upgrade 1: Ledoit-Wolf
)
from .anomaly import SpectralAnomalyEnsemble
from .spectral_typing import SpectralTypingClassifier
from .moving_objects import MovingObjectScreener
from .ranking import InterestingnessRanker
from .neowise import compute_synthetic_wise, assess_neowise_consistency   # Upgrade 2: NEOWISE
from .shap_explainer import DiscoveryPriorityExplainer                    # SHAP Explainability


class SkyChangeExplorerPipeline:
    """
    End-to-end production ML pipeline for Project A (SPHEREx Sky Change Explorer).

    Upgrade summary:
      1. Ledoit-Wolf correlated covariance in variability chi2 (Cukierman et al. 2026)
      2. NEOWISE synthetic W1/W2 photometry & archive consistency scoring (Karambelkar et al. 2026)
      3. Masked-Loss Autoencoder as 4th ensemble member in anomaly engine (Nicolaou et al. 2025)
      4. Active learning threshold lowered to 10 reviews (Lochner & Bassett 2021)
      5. Integrated get_feature_vector() for consistent 8-dim active learning features
    """

    def __init__(
        self,
        wavelengths: Optional[np.ndarray] = None,
        fdr_q_level: float = 0.05,
        pca_components: int = 5,
        seed: int = 42
    ):
        self.wavelengths = wavelengths if wavelengths is not None else np.linspace(0.75, 5.0, 102)
        self.n_channels = len(self.wavelengths)
        self.fdr_q = fdr_q_level
        self.seed = seed

        # Stage 0: Quarantine
        self.quarantine = InstrumentQuarantine(
            edge_pixel_margin=8,
            min_channels_required=90,
            max_flagged_fraction=0.15,
            bright_star_sep_arcsec=30.0
        )

        # Stage 2: Anomaly Engine (now includes Masked-AE)
        self.anomaly_engine = SpectralAnomalyEnsemble(
            n_components=pca_components,
            contamination=0.01,
            seed=seed
        )
        self.is_anomaly_engine_fitted = False

        # Stage 3: Spectral Typing
        self.spectral_typer = SpectralTypingClassifier(self.wavelengths)

        # Stage 4: Moving Objects
        self.moving_screener = MovingObjectScreener()

        # Stage 5: Interestingness Ranker (active learning wired)
        self.ranker = InterestingnessRanker()

        # SHAP Explainability Engine
        self.explainer = DiscoveryPriorityExplainer(self.ranker.feedback_model)

        # Upgrade 1: Ledoit-Wolf precision matrix (fitted via fit_background_models)
        self._background_cov_inv: Optional[np.ndarray] = None

    def fit_background_models(
        self,
        background_spectra_zscores: np.ndarray,
        channel_masks: Optional[np.ndarray] = None
    ):
        """
        Fits PCA, Isolation Forest, Masked Autoencoder, and Ledoit-Wolf covariance baselines
        on quiet non-variable background spectra.

        Args:
            background_spectra_zscores: shape (n_background, n_channels)
            channel_masks:              shape (n_background, n_channels) boolean, optional.
        """
        # Upgrade 3: fit anomaly engine with optional channel masks for masked AE
        self.anomaly_engine.fit(background_spectra_zscores, channel_masks)
        self.is_anomaly_engine_fitted = True

        # Upgrade 1: fit Ledoit-Wolf precision matrix for correlated chi2
        if background_spectra_zscores.shape[0] > background_spectra_zscores.shape[1]:
            # LedoitWolf needs n_samples > n_features for a stable estimate
            self._background_cov_inv = fit_background_covariance(background_spectra_zscores)
        # else: too few samples → keep None (diagonal fallback used automatically in fit_m0_static)

    def process_source(
        self,
        source_id: str,
        ra_deg: float,
        dec_deg: float,
        epoch_fluxes: np.ndarray,       # shape: (n_epochs, n_channels)
        epoch_errors: np.ndarray,       # shape: (n_epochs, n_channels)
        obs_metadata: Dict[str, Any],
        known_sso_catalog: Optional[pd.DataFrame] = None,
        neowise_delta_mag: float = 0.0,
        channel_mask: Optional[np.ndarray] = None,     # shape (n_channels,), bool
        neowise_w1_baseline: Optional[float] = None,   # Upgrade 2: NEOWISE archive W1
        neowise_w2_baseline: Optional[float] = None,   # Upgrade 2: NEOWISE archive W2
        n_neowise_epochs: int = 1,                     # Upgrade 2: epoch count for glint penalty
    ) -> Dict[str, Any]:
        """
        Executes the full 6-stage pipeline on an individual celestial source.

        New parameters (Upgrades 1–5):
            channel_mask:        Boolean mask of valid SPHEREx channels (True = good).
            neowise_w1_baseline: Archival NEOWISE quiescent W1 magnitude for comparison.
            neowise_w2_baseline: Archival NEOWISE quiescent W2 magnitude for comparison.
            n_neowise_epochs:    How many NEOWISE epochs show the brightening.
        """
        # -------------------------------------------------------------
        # Stage 0: Quarantine Gate
        # -------------------------------------------------------------
        is_quarantined, q_reasons = self.quarantine.evaluate_source(obs_metadata)
        if is_quarantined:
            return {
                "source_id": source_id,
                "status": "QUARANTINED",
                "quarantine_reasons": q_reasons,
                "priority_rank_score": 0.0,
                "is_variable": False,
                "is_anomalous": False,
            }

        n_epochs = epoch_fluxes.shape[0]

        # -------------------------------------------------------------
        # Stage 1: Multi-Epoch Variability Engine (Upgrade 1: correlated chi2)
        # -------------------------------------------------------------
        # Upgrade 1: pass Ledoit-Wolf precision matrix when available
        m0_spec, chi2_m0 = fit_m0_static(
            epoch_fluxes, epoch_errors, cov_inv=self._background_cov_inv
        )
        m1_fit, scales, chi2_m1 = fit_m1_scale_tilt(epoch_fluxes, epoch_errors, self.wavelengths)

        delta_chi2 = max(chi2_m0 - chi2_m1, 0.0)
        dof = max(2 * (n_epochs - 1), 1)
        from scipy.stats import chi2 as scipy_chi2
        p_val_variability = float(1.0 - scipy_chi2.cdf(delta_chi2, df=dof))

        # Sign-symmetry check
        if n_epochs >= 2:
            diff_res = (epoch_fluxes[1] - epoch_fluxes[0]) / (
                np.sqrt(epoch_errors[0] ** 2 + epoch_errors[1] ** 2) + 1e-6
            )
            sym_res = validate_sign_symmetry(diff_res.reshape(1, -1))
            is_symmetric = sym_res["is_sign_symmetric"]
        else:
            is_symmetric = True

        # -------------------------------------------------------------
        # Stage 2: Spectral Anomaly Engine (Upgrade 3: Masked-AE as 4th member)
        # -------------------------------------------------------------
        weighted_mean_err = np.sqrt(np.mean(epoch_errors ** 2, axis=0))
        z_scores = (m0_spec - np.mean(m0_spec)) / (weighted_mean_err + 1e-6)
        z_scores_2d = z_scores.reshape(1, -1)

        # Build a per-source channel mask row for the anomaly engine
        mask_2d = channel_mask.reshape(1, -1) if channel_mask is not None else None

        if self.is_anomaly_engine_fitted:
            anom_res = self.anomaly_engine.score_spectra(z_scores_2d, channel_masks=mask_2d)
            ensemble_anom_rank = float(anom_res["ensemble_rank"][0])
            pca_err = float(anom_res["pca_reconstruction_error"][0])
            mahal_dist = float(anom_res["mahalanobis_distance"][0])
            iso_score = float(anom_res["isolation_forest_score"][0])
            ae_score = float(anom_res["masked_ae_score"][0])
            residuals = anom_res["channel_residuals"][0]
        else:
            # Standalone fallback if background un-fitted
            pca_err = float(np.std(z_scores))
            mahal_dist = pca_err
            iso_score = pca_err
            ae_score = pca_err
            ensemble_anom_rank = float(np.clip(pca_err / 5.0, 0.0, 1.0))
            residuals = z_scores

        # -------------------------------------------------------------
        # Stage 3: Spectral Typing & SED Matching
        # -------------------------------------------------------------
        typing_res = self.spectral_typer.fit_spectrum(m0_spec, weighted_mean_err)

        # -------------------------------------------------------------
        # Stage 3b: NEOWISE Synthetic Photometry (Upgrade 2: Karambelkar et al. 2026)
        # -------------------------------------------------------------
        w1_synth, w2_synth = compute_synthetic_wise(self.wavelengths, m0_spec)
        neowise_res = assess_neowise_consistency(
            w1_synthetic=w1_synth,
            w2_synthetic=w2_synth,
            neowise_w1_baseline=neowise_w1_baseline,
            neowise_w2_baseline=neowise_w2_baseline,
            n_epochs_detected=n_neowise_epochs,
        )
        # Use NEOWISE novelty score when available, else fall back to caller-supplied delta_mag
        effective_neowise_delta = (
            neowise_res["neowise_novelty_score"] * 1.5   # rescale back to mag-equivalent for ranker
            if neowise_res["classification"] != "no_archive_baseline"
            else neowise_delta_mag
        )

        # -------------------------------------------------------------
        # Stage 4: Moving Object & Ephemeris Screener
        # -------------------------------------------------------------
        obs_mjd = float(obs_metadata.get("mjd", 60000.0))
        sso_match = self.moving_screener.match_known_sso(ra_deg, dec_deg, obs_mjd, known_sso_catalog)
        confound_res = self.moving_screener.assess_rotational_confound(
            epoch_fluxes,
            np.array([obs_mjd]),
            is_known_sso=sso_match["is_known_sso"]
        )

        # -------------------------------------------------------------
        # Stage 5: Multi-Evidence Interestingness Ranker (Upgrade 4/5: active learning)
        # -------------------------------------------------------------
        priority_score = self.ranker.compute_heuristic_score(
            p_val_variability=p_val_variability,
            anomaly_percentile=ensemble_anom_rank,
            neowise_delta_mag=effective_neowise_delta,
            is_sso=sso_match["is_known_sso"],
            sso_confound_penalty=confound_res["spectral_reliability_penalty"]
        )

        # Build anomaly dict for active-learning feature extraction
        anomaly_dict_full = {
            "ensemble_rank": ensemble_anom_rank,
            "pca_reconstruction_error": pca_err,
            "mahalanobis_distance": mahal_dist,
            "masked_ae_score": ae_score,
        }

        # Upgrade 5: get_feature_vector for future active-learning calls
        feature_vec = InterestingnessRanker.get_feature_vector(
            variability_dict={"p_value": p_val_variability},
            anomaly_dict=anomaly_dict_full,
            spectral_type_dict=typing_res,
            sso_dict=sso_match,
            neowise_novelty_score=neowise_res["neowise_novelty_score"],
        )

        # Blend heuristic with learned model when available (Lochner & Bassett 2021)
        priority_score = self.ranker.predict_rank_score(feature_vec, priority_score)

        # Compute SHAP explanation for discovery priority and spectral attribution
        top_wavelengths = list(self.wavelengths[np.argsort(-np.abs(residuals))[:3]])
        shap_explanation = self.explainer.explain_candidate(
            feature_vector=feature_vec,
            heuristic_score=priority_score,
            top_wavelengths_um=top_wavelengths
        )

        return {
            "source_id": source_id,
            "status": "PROCESSED",
            "priority_rank_score": priority_score,
            "feature_vector": feature_vec.tolist(),
            "shap_explanation": shap_explanation,
            "variability": {
                "delta_chi2": delta_chi2,
                "p_value": p_val_variability,
                "is_significant_fdr": p_val_variability < self.fdr_q,
                "is_sign_symmetric": is_symmetric,
                "m0_chi2": chi2_m0,
                "m1_chi2": chi2_m1,
                "ledoit_wolf_active": self._background_cov_inv is not None,
            },
            "anomaly": {
                "ensemble_rank": ensemble_anom_rank,
                "pca_reconstruction_error": pca_err,
                "mahalanobis_distance": mahal_dist,
                "isolation_forest_score": iso_score,
                "masked_ae_score": ae_score,
                "top_anomalous_wavelengths_um": list(
                    self.wavelengths[np.argsort(-np.abs(residuals))[:3]]
                ),
            },
            "spectral_type": {
                "best_class": typing_res["best_class"],
                "best_reduced_chi2": typing_res["best_reduced_chi2"],
                "class_probabilities": typing_res["class_probabilities"],
            },
            "moving_object": {
                "is_known_sso": sso_match["is_known_sso"],
                "sso_name": sso_match["sso_name"],
                "confound_recommendation": confound_res["recommendation"],
            },
            "neowise": {
                "w1_synthetic_mag": w1_synth,
                "w2_synthetic_mag": w2_synth,
                "delta_w1": neowise_res["delta_w1"],
                "delta_w2": neowise_res["delta_w2"],
                "classification": neowise_res["classification"],
                "novelty_score": neowise_res["neowise_novelty_score"],
            },
        }
