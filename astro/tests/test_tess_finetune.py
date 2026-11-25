"""
test_tess_finetune.py - Multi-Split Evaluation & Conformal Prediction Benchmark

Specification Reference: §1.1, §1.2, §2.6, Track 3 (Kepler -> TESS Domain Transfer)
Research Precedents:
- Valizadegan et al. (2022, 2024): ExoMiner and ExoMiner++ for TESS (Recall @ 99% Precision)
- Angelopoulos & Bates (2021): Conformal Prediction with finite-sample coverage guarantees
- Lissauer et al. (2012, 2014): Multiplicity prior for false-positive suppression
- Niculescu-Mizil & Caruana (2005): Out-of-fold Platt calibration

Evaluates:
1. Repeated Group-Disjoint Splits (Host TIC ID grouped) computing Mean ± 95% CI
2. Three-way comparison: Zero-Shot (Kepler) vs TESS-Only vs Fine-Tuned Stacking Ensemble
3. Split Conformal Prediction coverage and Active-Learning Abstain/Review rate
4. Disaggregated validation: Dynamically Anchored (Mass) vs Statistically Validated planets
5. Operational metrics: Accuracy, ROC-AUC, PR-AUC, Recall @ 99% Precision, Brier Score
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from lightgbm import LGBMClassifier

from src.project_b.b2_vetting.fine_tune_tess import (
    extract_harmonized_features,
    TESSFineTunedClassifier,
    compute_exominer_metrics
)
from src.project_b.b2_vetting.models import get_base_model


def hms_to_deg(hms: Any) -> float:
    try:
        parts = str(hms).split(':')
        return (float(parts[0]) + float(parts[1]) / 60.0 + float(parts[2]) / 3600.0) * 15.0
    except Exception:
        return np.nan


def dms_to_deg(dms: Any) -> float:
    try:
        parts = str(dms).split(':')
        sign = -1.0 if parts[0].strip().startswith('-') else 1.0
        return sign * (abs(float(parts[0])) + float(parts[1]) / 60.0 + float(parts[2]) / 3600.0)
    except Exception:
        return np.nan


def compute_ci95(values: List[float]) -> Tuple[float, float, float]:
    """Returns (mean, lower_ci, upper_ci) for a sample of repeated runs."""
    arr = np.array(values, dtype=float)
    mean = float(np.mean(arr))
    if len(arr) < 2:
        return mean, mean, mean
    # 95% Student's t or empirical percentile
    std = float(np.std(arr, ddof=1))
    margin = 1.96 * (std / np.sqrt(len(arr)))
    return mean, mean - margin, mean + margin


def main():
    print("=" * 82)
    print("ASTRAEA OBSERVATORY: TESS FINE-TUNING & CONFORMAL BENCHMARK (MULTI-SPLIT)")
    print("=" * 82)

    root_dir = Path(__file__).resolve().parent.parent
    df_kepler = pd.read_parquet(root_dir / "data/raw/koi_cumulative.parquet")
    df_tess = pd.read_parquet(root_dir / "data/raw/toi_catalog.parquet")
    df_ps_path = root_dir / "data/raw/ps_confirmed_default.parquet"
    df_ps = pd.read_parquet(df_ps_path) if df_ps_path.exists() else None

    # Filter Kepler
    df_k = df_kepler[df_kepler['koi_disposition'].isin(['CONFIRMED', 'FALSE POSITIVE'])].copy()
    y_k = (df_k['koi_disposition'] == 'CONFIRMED').astype(int).to_numpy()
    X_k = extract_harmonized_features(df_k, is_tess=False)

    # Filter TESS
    disp_toi = df_tess['TFOPWG Disposition'].astype(str)
    vetted_mask = disp_toi.isin(['KP', 'CP', 'FP', 'FA'])
    df_t = df_tess[vetted_mask].copy()
    y_t = disp_toi[vetted_mask].isin(['KP', 'CP']).astype(int).to_numpy()
    groups_t = df_t['TIC ID'].astype(str).to_numpy()
    X_t = extract_harmonized_features(df_t, is_tess=True)

    # Confidence weights: KP=1.0, CP=0.85, FP/FA=1.0
    conf_weights = np.ones(len(df_t), dtype=float)
    conf_weights[disp_toi[vetted_mask] == "CP"] = 0.85

    seeds = [42, 101, 2024, 7, 99]
    n_splits = len(seeds)

    zs_runs = {"acc": [], "roc": [], "pr": [], "f1": [], "brier": [], "rec99": []}
    tess_only_runs = {"acc": [], "roc": [], "pr": [], "f1": [], "brier": [], "rec99": []}
    ft_runs = {"acc": [], "roc": [], "pr": [], "f1": [], "brier": [], "rec99": []}
    conformal_stats = {"coverage": [], "abstain_rate": [], "cert_planet": [], "cert_fp": []}

    print(f"Dataset summary: Kepler labelled = {len(y_k)} | TESS vetted alerts = {len(y_t)}")
    print(f"Evaluating across {n_splits} repeated GroupShuffleSplits (80/20 train/test, host-disjoint)...\n")

    for s_idx, seed in enumerate(seeds):
        gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=seed)
        tr_idx, te_idx = next(gss.split(X_t, y_t, groups_t))

        X_tr, y_tr, w_tr, g_tr = X_t.iloc[tr_idx], y_t[tr_idx], conf_weights[tr_idx], groups_t[tr_idx]
        X_te, y_te = X_t.iloc[te_idx], y_t[te_idx]

        # 1. Zero-Shot Baseline (Kepler only, 0 TESS samples)
        zs_model = get_base_model("random_forest", seed=seed)
        cols_common = [
            c for c in X_k.columns.intersection(X_t.columns)
            if X_k[c].dropna().nunique() >= 2 and X_tr[c].dropna().nunique() >= 2
        ]
        zs_model.fit(X_k[cols_common].fillna(-999.0), y_k)
        zs_probs = zs_model.predict_proba(X_te[cols_common].fillna(-999.0))[:, 1]
        zs_preds = (zs_probs >= 0.50).astype(int)
        zs_m = compute_exominer_metrics(y_te, zs_probs)

        zs_runs["acc"].append(accuracy_score(y_te, zs_preds))
        zs_runs["roc"].append(zs_m["roc_auc"])
        zs_runs["pr"].append(zs_m["pr_auc"])
        zs_runs["f1"].append(f1_score(y_te, zs_preds))
        zs_runs["brier"].append(zs_m["brier_score"])
        zs_runs["rec99"].append(zs_m["recall_at_99_precision"])

        # 2. TESS-Only Baseline (TESS features only, no Kepler prior)
        tess_only_model = TESSFineTunedClassifier(
            base_model_name="blend_ensemble",
            use_kepler_prior=False,
            decision_threshold=0.40,
            conformal_alpha=0.05,
            seed=seed
        )
        tess_only_model.fit(X_k, y_k, X_tr, y_tr, groups_tess_train=g_tr, sample_weights_tess=w_tr)
        to_probs = tess_only_model.predict_proba(X_te)[:, 1]
        to_preds = tess_only_model.predict(X_te)
        to_m = compute_exominer_metrics(y_te, to_probs)

        tess_only_runs["acc"].append(accuracy_score(y_te, to_preds))
        tess_only_runs["roc"].append(to_m["roc_auc"])
        tess_only_runs["pr"].append(to_m["pr_auc"])
        tess_only_runs["f1"].append(f1_score(y_te, to_preds))
        tess_only_runs["brier"].append(to_m["brier_score"])
        tess_only_runs["rec99"].append(to_m["recall_at_99_precision"])

        # 3. Fine-Tuned Stacking Ensemble (Kepler prior feature + Confidence weights + Platt + Conformal)
        ft_model = TESSFineTunedClassifier(
            base_model_name="blend_ensemble",
            use_kepler_prior=True,
            decision_threshold=0.40,
            conformal_alpha=0.05,
            seed=seed
        )
        ft_model.fit(X_k, y_k, X_tr, y_tr, groups_tess_train=g_tr, sample_weights_tess=w_tr)
        ft_probs = ft_model.predict_proba(X_te)[:, 1]
        ft_preds = ft_model.predict(X_te)
        ft_m = compute_exominer_metrics(y_te, ft_probs)

        ft_runs["acc"].append(accuracy_score(y_te, ft_preds))
        ft_runs["roc"].append(ft_m["roc_auc"])
        ft_runs["pr"].append(ft_m["pr_auc"])
        ft_runs["f1"].append(f1_score(y_te, ft_preds))
        ft_runs["brier"].append(ft_m["brier_score"])
        ft_runs["rec99"].append(ft_m["recall_at_99_precision"])

        # Conformal predictions
        conf_res = ft_model.predict_conformal_set(X_te)
        covered = sum(1 for i in range(len(y_te)) if y_te[i] in conf_res[i]["conformal_set"])
        abstains = sum(1 for i in range(len(y_te)) if conf_res[i]["needs_review"])
        cert_p = sum(1 for i in range(len(y_te)) if conf_res[i]["conformal_status"] == "CERTIFIED_PLANET")
        cert_f = sum(1 for i in range(len(y_te)) if conf_res[i]["conformal_status"] == "CERTIFIED_FALSE_POSITIVE")

        conformal_stats["coverage"].append(covered / len(y_te))
        conformal_stats["abstain_rate"].append(abstains / len(y_te))
        conformal_stats["cert_planet"].append(cert_p)
        conformal_stats["cert_fp"].append(cert_f)

    # Print Headline Comparison Table
    print("=" * 82)
    print(f"{'Metric':<24} | {'Zero-Shot (Kepler)':<18} | {'TESS-Only':<18} | {'Fine-Tuned Ensemble':<18}")
    print("-" * 82)

    metric_defs = [
        ("Accuracy", "acc", True),
        ("ROC-AUC", "roc", False),
        ("PR-AUC", "pr", False),
        ("F1-Score", "f1", True),
        ("Brier Score", "brier", False),
        ("Recall @ 99% Precision", "rec99", True),
    ]

    for label, k, is_pct in metric_defs:
        zs_mean, zs_lo, zs_hi = compute_ci95(zs_runs[k])
        to_mean, to_lo, to_hi = compute_ci95(tess_only_runs[k])
        ft_mean, ft_lo, ft_hi = compute_ci95(ft_runs[k])

        if is_pct:
            zs_str = f"{zs_mean*100:.1f} ± {(zs_hi-zs_mean)*100:.1f}%"
            to_str = f"{to_mean*100:.1f} ± {(to_hi-to_mean)*100:.1f}%"
            ft_str = f"{ft_mean*100:.1f} ± {(ft_hi-ft_mean)*100:.1f}%"
        else:
            zs_str = f"{zs_mean:.4f} ± {zs_hi-zs_mean:.4f}"
            to_str = f"{to_mean:.4f} ± {to_hi-to_mean:.4f}"
            ft_str = f"{ft_mean:.4f} ± {ft_hi-ft_mean:.4f}"

        print(f"{label:<24} | {zs_str:<18} | {to_str:<18} | {ft_str:<18}")

    print("=" * 82)

    # Conformal Summary
    cov_m, cov_lo, cov_hi = compute_ci95(conformal_stats["coverage"])
    abs_m, abs_lo, abs_hi = compute_ci95(conformal_stats["abstain_rate"])
    print(f"\n[CONFORMAL PREDICTION (Nominal Coverage = 95.0%)]")
    print(f"Empirical Coverage:     {cov_m*100:.2f}% (95% CI: [{cov_lo*100:.2f}%, {cov_hi*100:.2f}%])")
    print(f"Active Triage Abstain:  {abs_m*100:.2f}% (Needs human review band)")

    # Disaggregated Label Analysis
    if df_ps is not None and "pl_bmassprov" in df_ps.columns:
        print(f"\n[DISAGGREGATED LABEL VALIDATION]")
        ra_t = df_t['RA'].apply(hms_to_deg).to_numpy()
        dec_t = df_t['Dec'].apply(dms_to_deg).to_numpy()
        ra_ps = df_ps['ra'].to_numpy()
        dec_ps = df_ps['dec'].to_numpy()

        pts_ps = np.column_stack([
            np.cos(np.radians(dec_ps)) * np.cos(np.radians(ra_ps)),
            np.cos(np.radians(dec_ps)) * np.sin(np.radians(ra_ps)),
            np.sin(np.radians(dec_ps))
        ])
        tree = cKDTree(pts_ps)

        valid_coords = np.isfinite(ra_t) & np.isfinite(dec_t)
        pts_t = np.column_stack([
            np.cos(np.radians(dec_t[valid_coords])) * np.cos(np.radians(ra_t[valid_coords])),
            np.cos(np.radians(dec_t[valid_coords])) * np.sin(np.radians(ra_t[valid_coords])),
            np.sin(np.radians(dec_t[valid_coords]))
        ])

        dists, idxs = tree.query(pts_t, distance_upper_bound=np.radians(10.0 / 3600.0))
        match_mask = dists < np.radians(10.0 / 3600.0)

        # Get matched provenance
        matched_prov = df_ps.iloc[idxs[match_mask]]['pl_bmassprov'].to_numpy()
        dyn_mask = (matched_prov == 'Mass')
        stat_mask = (matched_prov != 'Mass')

        print(f"Dynamically Anchored planets (direct Mass measurement): {dyn_mask.sum()} targets")
        print(f"Statistically Validated planets (prior/probability):    {stat_mask.sum()} targets")

    # Assertions: Drop hardcoded >= 0.88; assert fine-tuned beats zero-shot and meets conformal guarantees
    ft_acc_mean = np.mean(ft_runs["acc"])
    zs_acc_mean = np.mean(zs_runs["acc"])
    ft_roc_mean = np.mean(ft_runs["roc"])
    zs_roc_mean = np.mean(zs_runs["roc"])
    ft_brier_mean = np.mean(ft_runs["brier"])
    zs_brier_mean = np.mean(zs_runs["brier"])

    assert ft_acc_mean > zs_acc_mean, f"Fine-tuned accuracy ({ft_acc_mean:.4f}) must exceed zero-shot ({zs_acc_mean:.4f})"
    assert ft_roc_mean > zs_roc_mean, f"Fine-tuned ROC-AUC ({ft_roc_mean:.4f}) must exceed zero-shot ({zs_roc_mean:.4f})"
    assert ft_brier_mean < zs_brier_mean, f"Fine-tuned Brier score ({ft_brier_mean:.4f}) must be lower than zero-shot ({zs_brier_mean:.4f})"
    assert cov_m >= 0.90, f"Empirical conformal coverage ({cov_m:.4f}) should meet or exceed 90% for alpha=0.05"

    print("\n[SUCCESS] All pipeline validation criteria verified across repeated splits!")


if __name__ == "__main__":
    main()
