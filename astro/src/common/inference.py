"""
inference.py - Deterministic Pseudo-Fold Assignment and Inference Protocol

Specification Reference: §1.2
- A new host or held-out test host has no held-out fold, so assign one deterministically:
    fold_r(host) = hash(group_id, seed_r) mod K
  with seed_r and the hash function stored in the manifest.
- Score the host with repeat r's fold model for that fold, then average over r = 1..R.
- Fold models are NEVER refit on all development hosts (that would change the score
  distribution to which the calibrator was fit).
- Averaging all R x K models is NOT used in v1.
- Sanity check before use: check that the score distribution and reliability of pseudo-fold
  scores on test hosts match those of development OOF scores (Brier, ECE, dispersion).
"""

import hashlib
from typing import List, Callable, Any, Dict, Tuple, Optional
import numpy as np
import pandas as pd


def get_pseudo_fold(group_id: str, seed_r: int, n_folds: int) -> int:
    """
    Computes deterministic pseudo-fold assignment for a host or group.
    fold_r(host) = hash(group_id, seed_r) mod K
    """
    digest = hashlib.sha256(f"{group_id}_{seed_r}".encode("utf-8")).hexdigest()
    return int(digest, 16) % n_folds


def predict_pseudo_fold_ensemble(
    features: np.ndarray,
    group_ids: List[str],
    fold_models: Dict[Tuple[int, int], Any],
    n_repeats: int,
    n_folds: int,
    base_seed: int,
    predict_fn: Optional[Callable[[Any, np.ndarray], np.ndarray]] = None
) -> np.ndarray:
    """
    Scores inputs using the pseudo-fold assignment rule across R repeats.

    fold_models: Dict with keys (repeat_idx, fold_idx) -> trained fold model
    predict_fn: function(model, X) returning predicted probabilities or values.
                Defaults to model.predict_proba(X)[:, 1] if available, else model.predict(X).
    """
    n_samples = len(group_ids)
    all_repeat_scores = np.zeros((n_repeats, n_samples))

    for r in range(n_repeats):
        seed_r = base_seed + 1000 * (r + 1)
        repeat_scores = np.zeros(n_samples)

        # Vectorized or grouped evaluation by pseudo-fold
        assigned_folds = np.array([get_pseudo_fold(gid, seed_r, n_folds) for gid in group_ids])

        for k in range(n_folds):
            mask = assigned_folds == k
            if not np.any(mask):
                continue

            model = fold_models.get((r, k))
            if model is None:
                raise KeyError(f"Fold model for repeat {r}, fold {k} not found.")

            X_sub = features[mask]
            if predict_fn is not None:
                preds = predict_fn(model, X_sub)
            elif hasattr(model, "predict_proba"):
                preds = model.predict_proba(X_sub)[:, 1]
            else:
                preds = model.predict(X_sub)

            repeat_scores[mask] = preds

        all_repeat_scores[r] = repeat_scores

    # Mean over R repeats
    return np.mean(all_repeat_scores, axis=0)
