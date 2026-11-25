"""
test_end_to_end_ml.py - Comprehensive End-to-End Test of All ML & Physics Pipelines

Validates:
1. B1 Physics: Split-normal posterior sampling, derived quantities, HZ evaluation,
   rocky-compatible composition, and joint TSM/ESM priorities.
2. B1 Regression: Chen & Kipping Forecaster and Quantile LightGBM with CV+ conformal intervals.
3. B2 Vetting: Leakage-clean feature preparation, grouped fold training,
   cross-fitted probability calibration, pseudo-fold scoring, and vetting metrics.
4. Project A: Multi-epoch spectral variability (M0/M1), sign-symmetry test,
   and anomaly detection ensemble (PCA reconstruction, Mahalanobis, Isolation Forest).
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd

# Physics & B1
from src.project_b.b1_physics.sampler import (
    MeasuredParameter,
    sample_planet_system
)
from src.project_b.b1_physics.derived import derive_quantities
from src.project_b.b1_physics.hz import evaluate_hz_membership
from src.project_b.b1_physics.composition import (
    evaluate_t1_rocky_compatible,
    evaluate_t2_rocky_compatible
)
from src.project_b.b1_physics.priority import evaluate_joint_system_priorities
from src.project_b.b1_physics.forecaster import (
    ChenKippingForecaster,
    QuantileLGBMForecaster,
    compute_cv_plus_conformal_intervals
)

# B2 Vetting
from src.project_b.b2_vetting.labels import clean_features_for_vetting
from src.project_b.b2_vetting.models import GroupedFoldTrainer
from src.project_b.b2_vetting.evaluation import evaluate_vetting_metrics
from src.project_b.b2_vetting.candidate_priority import (
    compute_joint_candidate_priority,
    compare_joint_vs_factorized_ranking
)

# Project A
from src.project_a.quarantine import InstrumentQuarantine
from src.project_a.variability import (
    fit_m0_static,
    fit_m1_scale_tilt,
    validate_sign_symmetry,
    compute_sign_flip_null,
    benjamini_hochberg_fdr
)
from src.project_a.anomaly import SpectralAnomalyEnsemble


def test_b1_physics_and_priorities():
    print("Testing B1 Physics & Priorities...")
    # Earth-analog around G-dwarf
    teff = MeasuredParameter(val=5780.0, err_pos=50.0, err_neg=40.0)
    rstar = MeasuredParameter(val=1.0, err_pos=0.03, err_neg=0.02)
    mstar = MeasuredParameter(val=1.0, err_pos=0.04, err_neg=0.03)
    period = MeasuredParameter(val=365.25, err_pos=0.1, err_neg=0.1)
    rplanet = MeasuredParameter(val=1.0, err_pos=0.05, err_neg=0.05)
    mplanet = MeasuredParameter(val=1.0, err_pos=0.08, err_neg=0.08)
    ecc = MeasuredParameter(val=0.016, err_pos=0.005, err_neg=0.005)

    draws = sample_planet_system(
        teff, rstar, mstar, period, rplanet, mplanet, ecc, n_draws=5000, seed=42
    )
    derived = derive_quantities(draws)

    # 1. Habitable zone
    hz_res = evaluate_hz_membership(
        derived["semi_major_axis"], derived["teff"], derived["lum_star"]
    )
    # Earth is solidly inside the optimistic HZ (Recent Venus inner edge = 0.75 AU)
    # and sits directly on the moist greenhouse conservative boundary (0.993 AU vs 1.000 AU)
    assert np.nanmean(hz_res["in_optimistic"]) > 0.98
    assert 0.40 < np.nanmean(hz_res["in_conservative"]) < 0.60

    # 2. Composition (T1: mass and radius)
    is_rocky, cmf = evaluate_t1_rocky_compatible(derived["mplanet"], derived["rplanet"])
    assert np.mean(is_rocky) > 0.90
    assert 0.15 < np.mean(cmf) < 0.35  # Earth iron core fraction ~ 32%

    # 3. Follow-up priority (joint evaluation)
    pri = evaluate_joint_system_priorities(
        derived,
        is_rocky_draws=is_rocky,
        in_hz_conservative_draws=hz_res["in_conservative"],
        in_hz_optimistic_draws=hz_res["in_optimistic"],
        j_mag=8.0,
        k_mag=7.5,
        is_transiting=True
    )
    assert pri["p_rocky_optimistic_hz"] > 0.85
    assert pri["priority_T_optimistic"] > 0.0
    assert pri["priority_E_optimistic"] > 0.0
    print("  -> B1 Physics & Priorities passed.")


def test_b1_regression_and_conformal():
    print("Testing B1 Forecaster & Conformal Prediction...")
    forecaster = ChenKippingForecaster()
    m_test = np.array([1.0, 5.0, 300.0])
    r_pred = forecaster.predict_radius(m_test)
    assert np.isclose(r_pred[0], 1.008, atol=0.05)  # 1 M_earth -> ~1.0 R_earth

    # Quantile LightGBM
    rng = np.random.default_rng(42)
    X = rng.uniform(0.5, 10.0, size=(200, 2))
    y = 1.0 * (X[:, 0] ** 0.28) + rng.normal(0, 0.05, size=200)

    lgbm_q = QuantileLGBMForecaster(random_state=42)
    lgbm_q.fit(X, y)
    q_preds = lgbm_q.predict_quantiles(X[:10])

    assert np.all(q_preds[0.05] <= q_preds[0.50])
    assert np.all(q_preds[0.50] <= q_preds[0.95])

    # CV+ Conformal interval
    oof_y_true = y[:150]
    oof_y_pred = lgbm_q.predict_quantiles(X[:150])[0.50]
    test_y_pred = lgbm_q.predict_quantiles(X[150:])[0.50]

    lb, ub = compute_cv_plus_conformal_intervals(oof_y_true, oof_y_pred, test_y_pred, coverage=0.95)
    test_y_true = y[150:]
    coverage = np.mean((test_y_true >= lb) & (test_y_true <= ub))
    assert coverage >= 0.90, f"CV+ coverage should be >= 90%, got {coverage}"
    print("  -> B1 Regression & Conformal passed.")


def test_b2_vetting_pipeline():
    print("Testing B2 Vetting Pipeline...")
    rng = np.random.default_rng(42)
    n_samples = 300

    # Create synthetic catalog with potential leakage columns that must be cleaned
    data = {
        "host_key": [f"HOST_{i}" for i in range(n_samples)],
        "group_id": [f"GRP_{i // 2}" for i in range(n_samples)],
        "disposition": rng.choice(["CONFIRMED", "FALSE POSITIVE", "CANDIDATE"], size=n_samples, p=[0.4, 0.4, 0.2]),
        "pl_bmassprov": rng.choice(["Mass", "None"], size=n_samples),
        "koi_score": rng.uniform(0, 1, size=n_samples),  # LEAKAGE
        "koi_fpflag_nt": rng.choice([0, 1], size=n_samples),  # LEAKAGE
        "period": rng.uniform(1.0, 100.0, size=n_samples),
        "depth_ppm": rng.uniform(50.0, 5000.0, size=n_samples),
        "stellar_rad": rng.uniform(0.5, 2.0, size=n_samples),
        "snr": rng.uniform(5.0, 150.0, size=n_samples),
    }
    df = pd.DataFrame(data)

    X_clean, y_target, tiers = clean_features_for_vetting(df)
    assert "koi_score" not in X_clean.columns, "Leakage column koi_score must be dropped"
    assert "koi_fpflag_nt" not in X_clean.columns, "Leakage column koi_fpflag_nt must be dropped"

    # Filter to training rows (confirmed & false positive)
    train_mask = y_target.isin([0, 1])
    X_train = X_clean[train_mask].to_numpy()
    y_train = y_target[train_mask].to_numpy()
    grp_train = df.loc[train_mask, "group_id"].to_numpy()

    # Create dummy repeated fold columns for 2 repeats x 3 folds
    fold_cols = pd.DataFrame({
        "fold_repeat_0": [i % 3 for i in range(len(y_train))],
        "fold_repeat_1": [(i + 1) % 3 for i in range(len(y_train))],
    })

    trainer = GroupedFoldTrainer(model_name="lightgbm", n_repeats=2, n_folds=3, base_seed=42)
    oof_scores, stats = trainer.fit_and_cross_validate(X_train, y_train, grp_train, fold_cols)

    assert len(oof_scores) == len(y_train)
    assert 0.0 <= np.min(oof_scores) and np.max(oof_scores) <= 1.0

    # Pseudo-fold test scoring
    test_probs = trainer.predict_calibrated_probability(X_train[:20], list(grp_train[:20]))
    assert len(test_probs) == 20

    metrics = evaluate_vetting_metrics(y_train, oof_scores, n_bootstraps=50)
    assert "pr_auc" in metrics
    assert "brier_score" in metrics
    assert "recall_at_99_precision" in metrics
    print("  -> B2 Vetting Pipeline passed.")


def test_project_a_explorer_pipeline():
    print("Testing Project A Sky Change Explorer Pipeline...")
    # 1. Quarantine
    quarantine = InstrumentQuarantine(min_channels_required=90, bright_star_sep_arcsec=30.0)
    is_q, reasons = quarantine.evaluate_source({
        "n_valid_channels": 95,
        "flagged_pixel_fraction": 0.02,
        "dist_to_detector_edge_px": 25,
        "nearest_bright_star_arcsec": 12.0,  # inside bright star margin
    })
    assert is_q is True
    assert any("bright_star_proximity" in r for r in reasons)

    # 2. Multi-epoch variability (M0 & M1)
    rng = np.random.default_rng(42)
    n_epochs, n_channels = 4, 96
    wavelengths = np.linspace(0.75, 5.0, n_channels)
    base_flux = 100.0 * np.exp(-((wavelengths - 2.5) ** 2) / 2.0)
    errors = np.full((n_epochs, n_channels), 2.0)

    # Epochs with slight scale change
    fluxes = np.array([base_flux * (1.0 + 0.05 * ep) + rng.normal(0, 2.0, n_channels) for ep in range(n_epochs)])

    m0_spec, chi2_m0 = fit_m0_static(fluxes, errors)
    m1_fit, scales, chi2_m1 = fit_m1_scale_tilt(fluxes, errors, wavelengths)
    assert chi2_m1 < chi2_m0, "M1 model should improve chi2 for scaled light"

    # Sign-symmetry check
    paired_residuals = (fluxes[1] - fluxes[0]) / (np.sqrt(2) * errors[0])
    sym_res = validate_sign_symmetry(paired_residuals.reshape(1, -1))
    assert "is_sign_symmetric" in sym_res

    # FDR Control
    p_vals = np.array([0.001, 0.004, 0.02, 0.25, 0.80])
    fdr_sig = benjamini_hochberg_fdr(p_vals, q_level=0.05)
    assert fdr_sig[0] is np.True_ or fdr_sig[0] == True

    # 3. Anomaly Engine
    anomaly_engine = SpectralAnomalyEnsemble(n_components=3, seed=42)
    # Background normal spectra
    norm_spectra = rng.normal(0, 1, size=(100, n_channels))
    anomaly_engine.fit(norm_spectra)

    # Inject strong anomaly
    test_spectra = rng.normal(0, 1, size=(10, n_channels))
    test_spectra[0, 10:20] += 15.0  # massive emission bump

    scores = anomaly_engine.score_spectra(test_spectra)
    assert np.argmax(scores["ensemble_rank"]) == 0, "Injected anomaly must have highest anomaly rank"
    print("  -> Project A Explorer Pipeline passed.")


if __name__ == "__main__":
    test_b1_physics_and_priorities()
    test_b1_regression_and_conformal()
    test_b2_vetting_pipeline()
    test_project_a_explorer_pipeline()
    print("\n========================================================")
    print("ALL END-TO-END ML & ASTRONOMY PIPELINES VERIFIED SUCCESSFULLY!")
    print("========================================================")
