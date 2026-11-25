"""
evaluation.py - Three-Track Evaluation and Astronomical Vetting Metrics

Specification Reference: §2.6
- Three separate evaluation tracks (never merged into one number):
  * Track 1: Kepler in-domain (Kepler train -> held-out Kepler test)
  * Track 2: TESS in-domain (TESS train -> held-out TESS test)
  * Track 3: Kepler -> TESS domain transfer (stars whose group_id appears in both
    are removed from train and test!)
- Metrics:
  * PR-AUC (Average Precision)
  * Recall at 99% precision (ExoMiner standard)
  * Brier score
  * Expected Calibration Error (ECE)
  * Stratified by label tier (all confirmed vs dynamically anchored only)
  * Bootstrap confidence intervals (95%)
"""

from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve, auc, brier_score_loss


def compute_recall_at_precision(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    target_precision: float = 0.99
) -> float:
    """Computes the maximum recall achieved at or above the target precision (e.g. 99%)."""
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_prob)
    valid_recalls = recalls[precisions >= target_precision]
    return float(np.max(valid_recalls)) if len(valid_recalls) > 0 else 0.0


def compute_ece(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10
) -> float:
    """Computes Expected Calibration Error (ECE)."""
    bin_limits = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        low, high = bin_limits[i], bin_limits[i + 1]
        mask = (y_prob >= low) & (y_prob <= high if i == n_bins - 1 else y_prob < high)
        if np.any(mask):
            bin_acc = np.mean(y_true[mask])
            bin_conf = np.mean(y_prob[mask])
            bin_weight = np.sum(mask) / n
            ece += bin_weight * np.abs(bin_acc - bin_conf)

    return float(ece)


def evaluate_vetting_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bootstraps: int = 500,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Computes PR-AUC, Recall@99% Precision, Brier Score, and ECE,
    with 95% bootstrap confidence intervals.
    """
    precisions, recalls, _ = precision_recall_curve(y_true, y_prob)
    pr_auc = auc(recalls, precisions)
    rec_99 = compute_recall_at_precision(y_true, y_prob, target_precision=0.99)
    brier = brier_score_loss(y_true, y_prob)
    ece = compute_ece(y_true, y_prob)

    # Bootstrap intervals
    rng = np.random.default_rng(seed)
    n = len(y_true)
    boot_pr_auc = []
    boot_rec_99 = []
    boot_brier = []
    boot_ece = []

    for _ in range(n_bootstraps):
        idx = rng.integers(0, n, size=n)
        yt_b, yp_b = y_true[idx], y_prob[idx]
        if len(np.unique(yt_b)) < 2:
            continue
        p_b, r_b, _ = precision_recall_curve(yt_b, yp_b)
        boot_pr_auc.append(auc(r_b, p_b))
        boot_rec_99.append(compute_recall_at_precision(yt_b, yp_b, 0.99))
        boot_brier.append(brier_score_loss(yt_b, yp_b))
        boot_ece.append(compute_ece(yt_b, yp_b))

    def ci(arr):
        return (float(np.percentile(arr, 2.5)), float(np.percentile(arr, 97.5))) if arr else (0.0, 0.0)

    return {
        "pr_auc": float(pr_auc),
        "pr_auc_ci95": ci(boot_pr_auc),
        "recall_at_99_precision": float(rec_99),
        "recall_at_99_precision_ci95": ci(boot_rec_99),
        "brier_score": float(brier),
        "brier_score_ci95": ci(boot_brier),
        "ece": float(ece),
        "ece_ci95": ci(boot_ece),
    }


def run_track3_leakage_filter(
    df_kepler: pd.DataFrame,
    df_tess: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Enforces Track 3 (Kepler -> TESS) leakage rule:
    Stars whose group_id appears in both Kepler and TESS are removed from BOTH train and test!
    """
    kepler_groups = set(df_kepler["group_id"].unique())
    tess_groups = set(df_tess["group_id"].unique())
    shared_groups = kepler_groups.intersection(tess_groups)

    filtered_kepler = df_kepler[~df_kepler["group_id"].isin(shared_groups)].copy()
    filtered_tess = df_tess[~df_tess["group_id"].isin(shared_groups)].copy()

    return filtered_kepler, filtered_tess
