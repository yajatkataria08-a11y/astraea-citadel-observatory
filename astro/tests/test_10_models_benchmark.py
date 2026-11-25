"""
test_10_models_benchmark.py - Comparative Benchmark of 10 Exoplanet Vetting ML Models

Exercises all 10 machine learning models on identical grouped folds:
1. Logistic Regression (floor)
2. Random Forest
3. Extra Trees
4. Gradient Boosting (Friedman GBDT)
5. HistGradientBoosting
6. LightGBM
7. XGBoost
8. MLP Neural Net
9. Calibrated SVM
10. Stacking Ensemble
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
from src.project_b.b2_vetting.models import (
    MODEL_CATALOG,
    GroupedFoldTrainer,
    benchmark_all_10_models
)


def test_all_10_models_fit_and_predict():
    print("=" * 70)
    print("BENCHMARKING ALL 10 EXOPLANET VETTING MACHINE LEARNING MODELS")
    print("=" * 70)

    rng = np.random.default_rng(42)
    n_samples = 300
    n_features = 12

    # Synthesize realistic transit features
    # (period, depth, duration, snr, impact parameter, stellar teff, logg, metallicity, etc.)
    X = rng.normal(0, 1, size=(n_samples, n_features))
    # Make some non-linear exoplanet signal
    signal = 1.2 * X[:, 0] - 0.8 * (X[:, 1] ** 2) + 1.5 * np.sin(X[:, 2]) + 0.5 * X[:, 3] * X[:, 4]
    prob_true = 1.0 / (1.0 + np.exp(-signal))
    y = (rng.uniform(0, 1, size=n_samples) < prob_true).astype(int)

    # 100 distinct groups to test grouped folds
    group_ids = np.array([f"GRP_{i:04d}" for i in range(100) for _ in range(3)])

    # Split into 240 dev and 60 test
    dev_mask = np.arange(n_samples) < 240
    test_mask = ~dev_mask

    X_dev, y_dev, grp_dev = X[dev_mask], y[dev_mask], group_ids[dev_mask]
    X_test, y_test, grp_test = X[test_mask], y[test_mask], list(group_ids[test_mask])

    # 2 repeats x 3 folds for fast unit benchmark
    fold_columns = pd.DataFrame({
        "fold_repeat_0": [i % 3 for i in range(len(y_dev))],
        "fold_repeat_1": [(i + 1) % 3 for i in range(len(y_dev))],
    })

    # Run all 10 models
    df_leaderboard = benchmark_all_10_models(
        X_dev=X_dev,
        y_dev=y_dev,
        group_ids_dev=grp_dev,
        fold_columns=fold_columns,
        X_test=X_test,
        y_test=y_test,
        group_ids_test=grp_test,
        model_subset=None,  # all 10
        n_repeats=2,
        n_folds=3,
        base_seed=42,
        n_bootstraps=50
    )

    print("\nLEADERBOARD OF 10 BENCHMARKED MODELS (Ranked by Out-Of-Fold PR-AUC):")
    print("-" * 110)
    display_cols = [
        "model_key",
        "oof_pr_auc",
        "oof_recall_at_99_prec",
        "oof_brier_score",
        "oof_ece",
        "test_pr_auc",
        "calibrator"
    ]
    formatted = df_leaderboard[display_cols].copy()
    formatted["oof_pr_auc"] = formatted["oof_pr_auc"].map(lambda x: f"{x:.4f}")
    formatted["oof_recall_at_99_prec"] = formatted["oof_recall_at_99_prec"].map(lambda x: f"{x:.4f}")
    formatted["oof_brier_score"] = formatted["oof_brier_score"].map(lambda x: f"{x:.4f}")
    formatted["oof_ece"] = formatted["oof_ece"].map(lambda x: f"{x:.4f}")
    formatted["test_pr_auc"] = formatted["test_pr_auc"].map(lambda x: f"{x:.4f}")
    print(formatted.to_string(index=False))
    print("-" * 110)

    # Verification assertions
    assert len(df_leaderboard) == 10, f"Expected 10 benchmarked models, got {len(df_leaderboard)}"
    for _, row in df_leaderboard.iterrows():
        assert 0.0 <= row["oof_pr_auc"] <= 1.0
        assert 0.0 <= row["test_pr_auc"] <= 1.0
        assert 0.0 <= row["oof_brier_score"] <= 1.0

    best_model = df_leaderboard.iloc[0]["model_key"]
    print(f"\nTop Performing Model: {best_model} (PR-AUC: {df_leaderboard.iloc[0]['oof_pr_auc']:.4f})")
    print("=" * 70)


if __name__ == "__main__":
    test_all_10_models_fit_and_predict()
