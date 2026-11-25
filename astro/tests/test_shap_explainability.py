"""
test_shap_explainability.py - Verifies SHAP Explainability in Both ML Pipelines

Tests:
1. Project B (B2 Vetting):
   - TreeSHAP local attribution on unseen TESS exoplanet candidate
   - Top 3 driving physical features (depth_diff, density, etc.)
   - Plain-English astronomical justification narrative
2. Project A (Sky Change Explorer):
   - Multi-evidence triage attribution (variability vs anomaly vs NEOWISE vs SSO)
   - Spectral attribution summary highlighting exact anomalous wavelength channels
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd

from src.project_b.b2_vetting.fine_tune_tess import extract_harmonized_features, TESSFineTunedClassifier
from src.project_a.pipeline import SkyChangeExplorerPipeline


def test_shap_project_b():
    print("\n" + "=" * 78)
    print("TESTING SHAP EXPLAINABILITY IN PROJECT B (EXOPLANET VETTING)")
    print("=" * 78)

    root = Path(__file__).resolve().parent.parent
    df_k = pd.read_parquet(root / "data/raw/koi_cumulative.parquet")
    df_t = pd.read_parquet(root / "data/raw/toi_catalog.parquet")

    X_k = extract_harmonized_features(df_k, is_tess=False)
    y_k = (df_k["koi_disposition"] == "CONFIRMED").astype(int)
    valid_k = df_k["koi_disposition"].isin(["CONFIRMED", "FALSE POSITIVE"])
    X_k, y_k = X_k[valid_k], y_k[valid_k]

    X_t = extract_harmonized_features(df_t, is_tess=True)
    disp_col = "TFOPWG Disposition" if "TFOPWG Disposition" in df_t.columns else "Disposition"
    valid_t = df_t[disp_col].isin(["CP", "KP", "FP", "FA"])
    y_t = df_t[disp_col].isin(["CP", "KP"]).astype(int)[valid_t]
    X_t, y_t = X_t[valid_t], y_t[valid_t]

    clf = TESSFineTunedClassifier(base_model_name="random_forest", tess_weight_factor=6.0, seed=42)
    # Train on first 500 samples for swift test execution
    clf.fit(X_k.iloc[:500], y_k.iloc[:500], X_t.iloc[:200], y_t.iloc[:200])

    # Explain candidate #0
    test_sample = X_t.iloc[[0]]
    result = clf.predict_with_explanation(test_sample)

    print(f"Prediction:            {result['prediction']}")
    print(f"Confidence (Planet):   {result['probability_confirmed'] * 100:.2f}%")
    print(f"Scientific Narrative:  {result['shap_explanation']['astronomical_narrative']}")
    print("Top 3 Driving Features:")
    for d in result['shap_explanation']['top_drivers']:
        print(f"  * {d['feature']:<22} | SHAP: {d['shap_value']:+.3f} | Favors: {d['favors']} | ({d['description']})")

    assert "shap_explanation" in result
    assert len(result["shap_explanation"]["top_drivers"]) == 3
    assert "depth_diff" in result["shap_explanation"]["all_attributions"]
    print("-> Project B SHAP Explainability Verified Successfully [OK]")


def test_shap_project_a():
    print("\n" + "=" * 78)
    print("TESTING SHAP EXPLAINABILITY IN PROJECT A (SKY CHANGE EXPLORER)")
    print("=" * 78)

    rng = np.random.default_rng(42)
    n_channels = 102
    wavelengths = np.linspace(0.75, 5.0, n_channels)
    pipeline = SkyChangeExplorerPipeline(wavelengths=wavelengths, seed=42)

    # Background fit
    bg_spectra = rng.normal(0, 1.0, size=(120, n_channels))
    pipeline.fit_background_models(bg_spectra)

    # Process an anomalous PAH emission object with NEOWISE brightening
    quiet_fluxes = np.ones((4, n_channels)) * 50.0 + rng.normal(0, 1.0, (4, n_channels))
    quiet_errors = np.full((4, n_channels), 1.0)
    # Inject 3.3 um PAH anomaly
    pah_idx = np.argmin(np.abs(wavelengths - 3.3))
    quiet_fluxes[:, pah_idx - 1: pah_idx + 2] += 20.0

    clean_obs = {
        "n_valid_channels": 102,
        "flagged_pixel_fraction": 0.01,
        "dist_to_detector_edge_px": 50,
        "nearest_bright_star_arcsec": 100.0,
        "mjd": 60100.0
    }

    res = pipeline.process_source(
        source_id="PAH_TRANSIENT_042",
        ra_deg=180.0,
        dec_deg=20.0,
        epoch_fluxes=quiet_fluxes,
        epoch_errors=quiet_errors,
        obs_metadata=clean_obs,
        neowise_w1_baseline=11.5,
        neowise_w2_baseline=11.0,
        n_neowise_epochs=3
    )

    exp = res["shap_explanation"]
    print(f"Source ID:             {res['source_id']}")
    print(f"Priority Rank Score:   {res['priority_rank_score']:.3f}")
    print(f"Primary Driver:        {exp['primary_discovery_driver']}")
    print(f"Scientific Narrative:  {exp['scientific_narrative']}")
    print(f"Spectral Attribution:  {exp['spectral_attribution_summary']}")
    print("Top 3 Triage Signal Components:")
    for d in exp["top_drivers"]:
        print(f"  * {d['signal_component']:<28} | Impact: {d['shap_impact']:+.3f} | {d['effect']}")

    assert "shap_explanation" in res
    assert exp["primary_discovery_driver"] in exp["all_attributions"]
    assert "3.3" in exp["spectral_attribution_summary"] or "3." in exp["spectral_attribution_summary"]
    print("-> Project A SHAP Explainability Verified Successfully [OK]")


if __name__ == "__main__":
    test_shap_project_b()
    test_shap_project_a()
    print("\n" + "=" * 78)
    print("ALL SHAP EXPLAINABILITY TESTS PASSED IN BOTH PIPELINES!")
    print("=" * 78)
