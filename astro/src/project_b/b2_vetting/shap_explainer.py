"""
shap_explainer.py - SHAP Astrophysical Explainability for Exoplanet Vetting (Project B)

Specification Reference: §B2 Explainability
Provides local and global feature attribution using TreeSHAP on tree-based vetting models
(Random Forest, LightGBM, Gradient Boosting). Translates mathematical SHAP values
into physical astronomical justifications (e.g., depth discrepancy, density anomaly, proper motion).
"""

from typing import Dict, List, Optional, Any, Union
import numpy as np
import pandas as pd
import shap


# Astrophysical translation dictionary for features
ASTRO_FEATURE_DESCRIPTIONS = {
    "depth_diff": "Transit depth discrepancy vs expected from Rp/R* (eclipsing binary indicator)",
    "stellar_density_proxy": "Mean stellar density proxy rho_* ~ Period / Duration^3",
    "duty_cycle": "Orbital transit duty cycle (Duration / 24) / Period",
    "pm_total": "Total stellar proper motion (background blend discriminator)",
    "rplanet_log": "Planet radius log10(Rp in Earth radii)",
    "depth_log": "Transit depth log10(ppm)",
    "period": "Orbital period (days)",
    "duration": "Transit duration (hours)",
    "rstar": "Host star radius (Solar radii)",
    "teff": "Host star effective temperature (K)",
    "logg": "Host star surface gravity log(g)",
    "snr_log": "Transit model Signal-to-Noise Ratio log10(SNR)",
    "dist": "Stellar distance (pc)",
    "rho_discrepancy": "Discrepancy between photometric transit density and spectroscopic surface gravity",
    "a_over_rstar_log": "Semi-major axis to stellar radius scale log10(a/R_*)",
    "b_impact_proxy": "Analytic transit impact parameter proxy b (grazing binary filter)",
    "duration_period_ratio": "Duration to period cube-root ratio (transit U-shape vs V-shape proxy)",
    "depth_snr_proxy": "Transit depth photometric precision SNR",
    "snr_rate": "Transit SNR per square-root hour",
    "insol_log": "Incident stellar flux log10(S/S_Earth)",
    "teq": "Equilibrium temperature Teq (K)",
    "volume_ratio_log": "Planetary volume to stellar volume ratio log10(Vp/V_*)",
    "host_mag": "Host star optical/infrared apparent magnitude",
    "mag_missing": "Flag indicating missing host star passband magnitude",
    "ruwe": "Gaia DR3 Renormalised Unit Weight Error (RUWE > 1.4 flags unresolved stellar binaries)",
    "ruwe_missing": "Flag indicating target lacks Gaia astrometric RUWE data",
    "contamination_ratio": "Photometric flux contamination ratio from background blends",
    "contam_missing": "Flag indicating missing stellar contamination ratio",
    "v_tan_proxy": "Tangential stellar velocity proxy (kinematic halo background filter)",
    "is_multi_planet": "Host star multi-transiting system flag (Lissauer et al. 2012/2014 validator)",
    "multi_count": "Total number of transit signals detected around this host star",
    "harmonic_fundamental": "Fundamental harmonic amplitude of phase-folded transit profile",
    "harmonic_2nd": "Second harmonic amplitude (odd-even asymmetry and secondary eclipse proxy)",
    "harmonic_odd_even_ratio": "Fundamental-to-second harmonic ratio (transit shape vs eclipsing binary indicator)",
}


class ExoplanetVettingExplainer:
    """
    Computes TreeSHAP explanations for exoplanet vetting decisions.
    
    Attributes:
        explainer: shap.TreeExplainer instance
        feature_names: List of physical feature names
    """

    def __init__(self, tree_model: Any, feature_names: List[str]):
        """
        Initializes the TreeSHAP explainer.
        
        Args:
            tree_model: Fitted tree estimator (RandomForestClassifier, LGBMClassifier, etc.)
            feature_names: Ordered list of feature names used during training.
        """
        # If tree_model is already a fitted ensemble (RandomForest, ExtraTrees, LightGBM, XGBoost)
        if hasattr(tree_model, "estimators_") or hasattr(tree_model, "booster_"):
            self.model = tree_model
        elif hasattr(tree_model, "model"):
            self.model = tree_model.model
        elif hasattr(tree_model, "model_"):
            self.model = tree_model.model_
        else:
            self.model = tree_model

        self.feature_names = feature_names
        self.explainer = shap.TreeExplainer(self.model)

    def explain_instance(self, X_row: pd.DataFrame) -> Dict[str, Any]:
        """
        Explains an individual candidate exoplanet's vetting outcome.

        Args:
            X_row: Single-row DataFrame matching the training features.

        Returns:
            Dict containing:
              - top_drivers: Top 3 decisive physical features with SHAP values
              - astronomical_narrative: Clear sentence explaining the physical justification
              - all_shap_values: Full dictionary of feature -> SHAP attribution
        """
        if not isinstance(X_row, pd.DataFrame):
            X_row = pd.DataFrame([X_row], columns=self.feature_names)

        shap_values = self.explainer.shap_values(X_row)

        # Handle various output shapes from TreeExplainer (RandomForest vs LightGBM)
        if isinstance(shap_values, list):
            # Binary classifier: index 1 is Confirmed Planet class
            vals = np.array(shap_values[1])[0]
        elif len(shap_values.shape) == 3:
            # (n_samples, n_features, n_classes)
            vals = shap_values[0, :, 1]
        elif len(shap_values.shape) == 2:
            vals = shap_values[0]
        else:
            vals = np.array(shap_values)

        contributions = []
        for feat, val in zip(self.feature_names, vals):
            raw_v = float(X_row[feat].iloc[0])
            contributions.append({
                "feature": feat,
                "description": ASTRO_FEATURE_DESCRIPTIONS.get(feat, feat),
                "raw_value": raw_v,
                "shap_value": float(val),
                "favors": "CONFIRMED_PLANET" if val > 0 else "FALSE_POSITIVE",
            })

        # Rank by absolute magnitude of SHAP contribution
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        top_drivers = contributions[:3]

        # Construct scientific narrative
        lead = top_drivers[0]
        lead_desc = ASTRO_FEATURE_DESCRIPTIONS.get(lead["feature"], lead["feature"])
        if lead["shap_value"] > 0:
            narrative = (
                f"Candidate favored as CONFIRMED PLANET primarily due to {lead['feature']} "
                f"({lead_desc}) with SHAP impact +{lead['shap_value']:.3f}."
            )
        else:
            narrative = (
                f"Candidate favored as FALSE POSITIVE primarily due to {lead['feature']} "
                f"({lead_desc}) with SHAP impact {lead['shap_value']:.3f}."
            )

        return {
            "top_drivers": top_drivers,
            "astronomical_narrative": narrative,
            "all_attributions": {c["feature"]: c["shap_value"] for c in contributions},
        }

    def explain_dataset(self, X_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Computes global mean absolute SHAP importance across a full dataset.
        """
        shap_values = self.explainer.shap_values(X_data)
        if isinstance(shap_values, list):
            vals = np.array(shap_values[1])
        elif len(shap_values.shape) == 3:
            vals = shap_values[:, :, 1]
        else:
            vals = shap_values

        mean_abs = np.mean(np.abs(vals), axis=0)
        ranking = [
            {"feature": f, "mean_abs_shap": float(m), "description": ASTRO_FEATURE_DESCRIPTIONS.get(f, f)}
            for f, m in zip(self.feature_names, mean_abs)
        ]
        ranking.sort(key=lambda x: x["mean_abs_shap"], reverse=True)
        return {"global_importance_ranking": ranking}
