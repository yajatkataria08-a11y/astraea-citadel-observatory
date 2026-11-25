"""
candidate_priority.py - Joint Candidate Vetting and Observability Priority

Specification Reference: §2.6
- Candidate priority is joint over physical parameters and classifier probability:
    priority_T(cand, h) = E_draws[ p_real(x_d) * 1{rocky-compatible & HZ_h} * g(TSM_d; thr_T) | D ]
    priority_E(cand, h) = E_draws[ p_real(x_d) * 1{rocky-compatible & HZ_h & terr} * g(ESM_d; thr_E) | D ]
    where terr = 1{Rp < 1.5 R_earth}
- x_d is perturbed by the SAME draw that produces physical parameters.
- Factorized fallback check:
    Compare factorized form P(real) * E[1 * g] with joint form.
    Pre-set rule: If top-50 overlap < 90%, use joint score everywhere!
"""

from typing import Dict, List, Optional, Callable, Tuple, Any
import numpy as np
from scipy.stats import kendalltau
from src.project_b.b1_physics.priority import compute_tsm_per_draw, compute_esm_per_draw, soft_gate


def compute_joint_candidate_priority(
    draws: Dict[str, np.ndarray],
    is_rocky_draws: np.ndarray,
    in_hz_draws: np.ndarray,
    perturbed_features: np.ndarray,
    predict_prob_fn: Callable[[np.ndarray], np.ndarray],
    j_mag: Optional[float],
    k_mag: Optional[float],
    k_gate: float = 2.0
) -> Dict[str, float]:
    """
    Evaluates joint candidate priority where classifier probability p_real(x_d)
    is computed across perturbed draws.
    """
    # Predict p_real for each perturbed draw
    p_real = predict_prob_fn(perturbed_features)
    p_real = np.clip(p_real, 0.0, 1.0)

    rp = draws["rplanet"]
    mp = draws["mplanet"]
    rstar = draws["rstar"]
    teff = draws["teff"]
    a = draws["semi_major_axis"]
    s = draws["flux_instellation"]

    # 1. Transmission Priority
    p_real_mean = float(np.mean(p_real))
    priority_t = 0.0
    if j_mag is not None and not np.isnan(j_mag) and not np.all(np.isnan(rp)) and not np.all(np.isnan(mp)):
        tsm_d, thr_t = compute_tsm_per_draw(rp, mp, rstar, teff, a, s, j_mag)
        g_t = soft_gate(tsm_d, thr_t, k=k_gate)
        # Joint expectation
        priority_t = float(np.nanmean(p_real * is_rocky_draws * in_hz_draws * g_t))

    # 2. Emission Priority (terrestrial transiting only)
    priority_e = 0.0
    if k_mag is not None and not np.isnan(k_mag) and not np.all(np.isnan(rp)):
        esm_d, thr_e = compute_esm_per_draw(rp, rstar, teff, a, k_mag)
        terr = (rp < 1.5).astype(float)
        g_e = np.where(terr > 0, soft_gate(esm_d, thr_e, k=k_gate), 0.0)
        # Joint expectation
        priority_e = float(np.nanmean(p_real * is_rocky_draws * in_hz_draws * terr * g_e))

    return {
        "p_real_mean": p_real_mean,
        "priority_T": priority_t,
        "priority_E": priority_e,
    }


def compare_joint_vs_factorized_ranking(
    joint_scores: np.ndarray,
    factorized_scores: np.ndarray,
    top_k: int = 50
) -> Dict[str, Any]:
    """
    Compares joint vs factorized priority rankings (§2.6):
    - Reports Kendall tau rank correlation
    - Computes top-50 overlap percentage
    - Decision: If top-50 overlap < 90%, joint score is mandatory everywhere.
    """
    tau, p_val = kendalltau(joint_scores, factorized_scores)

    # Top-K overlap
    top_joint_idx = set(np.argsort(joint_scores)[-top_k:])
    top_fact_idx = set(np.argsort(factorized_scores)[-top_k:])
    overlap_count = len(top_joint_idx.intersection(top_fact_idx))
    overlap_pct = (overlap_count / top_k) * 100.0

    must_use_joint = overlap_pct < 90.0

    return {
        "kendall_tau": float(tau),
        "p_value": float(p_val),
        "top_50_overlap_pct": float(overlap_pct),
        "must_use_joint_everywhere": bool(must_use_joint),
    }
