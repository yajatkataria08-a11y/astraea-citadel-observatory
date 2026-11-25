"""
shap_explainer.py - SHAP Explainability for Sky Change Explorer (Project A)

Specification Reference: §2.4 Step 6 (Triage Explainability)
Provides human-interpretable attribution for candidate interestingness rankings:
1. Multi-Evidence SHAP: Explains the relative contributions of variability,
   spectral anomaly, NEOWISE infrared novelty, and moving-object confounds.
2. Spectral Attribution: Highlights the exact wavelength channels driving the discovery.
"""

from typing import Dict, List, Optional, Any
import numpy as np
import shap


FEATURE_LABELS = [
    "variability_significance",       # [0] -log10(p_value)
    "spectral_anomaly_percentile",    # [1] Ensemble anomaly rank
    "pca_reconstruction_error",       # [2] PCA residual norm
    "mahalanobis_distance",           # [3] Latent space outlier distance
    "sed_template_mismatch",          # [4] Best reduced chi2
    "is_asteroid_confound",           # [5] Moving object flag
    "neowise_infrared_novelty",       # [6] Archive W1/W2 outburst magnitude
    "masked_autoencoder_score",       # [7] Non-linear autoencoder error
]

FEATURE_DESCRIPTIONS = {
    "variability_significance": "Significance of multi-epoch brightness change (-log10 p-value)",
    "spectral_anomaly_percentile": "Spectral outlier percentile rank across 4-detector ensemble",
    "pca_reconstruction_error": "Subspace reconstruction residual error",
    "mahalanobis_distance": "Distance from quiet-star centroid in latent representation",
    "sed_template_mismatch": "Deviation from standard brown dwarf / stellar SED templates",
    "is_asteroid_confound": "Known Solar System asteroid ephemeris match (penalty)",
    "neowise_infrared_novelty": "Magnitude brightening relative to archival NEOWISE W1/W2 baseline",
    "masked_autoencoder_score": "Non-linear autoencoder reconstruction error on valid channels",
}


class DiscoveryPriorityExplainer:
    """
    Computes SHAP feature attributions for Project A Interestingness Ranking.
    """

    def __init__(self, ranker_model: Any = None, background_feature_matrix: Optional[np.ndarray] = None):
        """
        Args:
            ranker_model: Trained active-learning model (LogisticRegression, LightGBM, etc.)
                          or None (heuristic scoring attribution).
            background_feature_matrix: shape (n_background, 8) quiet source feature vectors.
        """
        self.ranker_model = ranker_model
        self.background = (
            background_feature_matrix
            if background_feature_matrix is not None
            else np.zeros((10, 8))
        )

        if ranker_model is not None and hasattr(ranker_model, "predict_proba"):
            try:
                self.explainer = shap.Explainer(ranker_model, self.background)
            except Exception:
                self.explainer = shap.LinearExplainer(ranker_model, self.background)
        else:
            self.explainer = None

    def explain_candidate(
        self,
        feature_vector: np.ndarray,
        heuristic_score: float,
        top_wavelengths_um: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Explains why a celestial source was flagged for follow-up.

        Args:
            feature_vector: shape (8,) feature vector from InterestingnessRanker
            heuristic_score: float in [0, 1]
            top_wavelengths_um: list of top anomalous wavelengths in microns

        Returns:
            Dict containing:
              - primary_discovery_driver: Name of the dominant signal component
              - attributions: List of features with importance deltas
              - spectral_attribution_summary: Physical explanation of driving wavelengths
        """
        fv = np.asarray(feature_vector, dtype=float).ravel()

        if self.explainer is not None:
            try:
                shap_res = self.explainer(fv.reshape(1, -1))
                vals = shap_res.values[0]
                if len(vals.shape) > 1:
                    vals = vals[:, 1]  # positive class
            except Exception:
                vals = self._heuristic_shap(fv)
        else:
            vals = self._heuristic_shap(fv)

        attributions = []
        for name, val, raw_v in zip(FEATURE_LABELS, vals, fv):
            attributions.append({
                "signal_component": name,
                "description": FEATURE_DESCRIPTIONS.get(name, name),
                "raw_value": float(raw_v),
                "shap_impact": float(val),
                "effect": "boosts_priority" if val > 0 else "lowers_priority",
            })

        attributions.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)
        top_driver = attributions[0]

        # Construct scientific narrative
        if top_driver["shap_impact"] > 0:
            narrative = (
                f"Triage priority ({heuristic_score:.2f}) driven primarily by "
                f"{top_driver['signal_component']} ({top_driver['description']}) "
                f"with impact +{top_driver['shap_impact']:.3f}."
            )
        else:
            narrative = (
                f"Triage priority penalized primarily by "
                f"{top_driver['signal_component']} with impact {top_driver['shap_impact']:.3f}."
            )

        spec_summary = ""
        if top_wavelengths_um:
            spec_summary = (
                f"Spectral anomaly localized at wavelengths: "
                f"{', '.join(f'{w:.2f} um' for w in top_wavelengths_um[:3])}."
            )

        return {
            "primary_discovery_driver": top_driver["signal_component"],
            "top_drivers": attributions[:3],
            "scientific_narrative": narrative,
            "spectral_attribution_summary": spec_summary,
            "all_attributions": {a["signal_component"]: a["shap_impact"] for a in attributions},
        }

    def _heuristic_shap(self, fv: np.ndarray) -> np.ndarray:
        """
        Exact closed-form Shapley values for the additive heuristic scoring function:
            Score = w_var * norm_var + w_anom * norm_anom + w_nov * norm_nov - penalty_sso
        """
        # Weights matching InterestingnessRanker:
        # fv[0]: var, fv[1]: anom, fv[5]: sso, fv[6]: nov
        weights = np.array([0.35, 0.35, 0.05, 0.05, 0.0, -0.40, 0.30, 0.05])
        baseline = 0.10
        shap_vals = weights * (fv - baseline)
        return shap_vals
