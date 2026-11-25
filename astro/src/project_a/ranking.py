"""
ranking.py - Multi-Evidence Interestingness Ranker & Active Learning

Specification Reference: §2.4 Step 6
Research Precedents:
- Karambelkar et al. (2026, arXiv:2602.07129): Mid-infrared transient search using NEOWISE with SPHEREx context.
- Cukierman et al. (2026, arXiv:2603.25790): Spectral Map Making with SPHEREx.
- Lochner & Bassett (2021, AJ 161, 56) — Astromaly: active-learning anomaly detection achieving
  30-50% discovery-rate boost over passive scanning; motivates the 10-sample minimum threshold
  and the 50/50 heuristic–learned blend used here.

Implements the multi-evidence discovery ranking formula:
1. Stage 1: Calibrated multi-evidence score combining:
   - S_var: Spectral Variability Significance (-log10(p_value))
   - S_anom: Anomaly Percentile Rank (from PCA, Mahalanobis, Isolation Forest, Masked-AE)
   - S_novelty: Historical Difference relative to NEOWISE W1/W2 baseline
   - P_sso_penalty: Confound penalty if the object is an asteroid/moving object
2. Stage 2: Active learning ranker (Lochner & Bassett 2021):
   - Starts with fixed astrophysical weights.
   - Activates at >= 10 user reviews (lowered from 20 for faster initial adaptation).
   - Updates weights via Logistic Regression; switches to LightGBM once >= 50 reviews accumulate.
   - Blends 50% heuristic physics score with 50% learned user-preference model.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression


class InterestingnessRanker:
    """
    Ranks celestial candidates by follow-up value across variability, anomaly, and historic novelty.
    """

    def __init__(
        self,
        w_variability: float = 0.35,
        w_anomaly: float = 0.35,
        w_novelty: float = 0.30,
        sso_penalty_weight: float = 0.40
    ):
        self.w_var = w_variability
        self.w_anom = w_anomaly
        self.w_nov = w_novelty
        self.sso_penalty = sso_penalty_weight
        self.feedback_model = None
        self.user_feedback_data = []

    @staticmethod
    def get_feature_vector(
        variability_dict: Dict,
        anomaly_dict: Dict,
        spectral_type_dict: Dict,
        sso_dict: Dict,
        neowise_novelty_score: float = 0.0
    ) -> np.ndarray:
        """
        Extracts a consistent 8-dimensional feature vector from pipeline stage outputs
        for use as the input to the active-learning feedback model.

        Feature layout:
          [0] variability p-value (log10-scaled, clipped [0,1])
          [1] anomaly ensemble rank [0,1]
          [2] PCA reconstruction error (normalised)
          [3] Mahalanobis distance (normalised)
          [4] best spectral type chi2 (normalised)
          [5] is_known_sso (0/1 binary)
          [6] neowise novelty score [0,1]
          [7] masked_ae_score (normalised, 0 if not available)
        """
        p_val = float(variability_dict.get("p_value", 1.0))
        neg_log_p = -np.log10(np.clip(p_val, 1e-6, 1.0)) / 6.0  # normalise to ~[0,1]

        anom_rank = float(anomaly_dict.get("ensemble_rank", 0.0))
        pca_err = float(np.clip(anomaly_dict.get("pca_reconstruction_error", 0.0) / 10.0, 0.0, 1.0))
        mahal = float(np.clip(anomaly_dict.get("mahalanobis_distance", 0.0) / 10.0, 0.0, 1.0))
        ae_score = float(np.clip(anomaly_dict.get("masked_ae_score", 0.0) / 5.0, 0.0, 1.0))

        best_chi2 = float(np.clip(spectral_type_dict.get("best_reduced_chi2", 1.0) / 10.0, 0.0, 1.0))
        is_sso = float(sso_dict.get("is_known_sso", False))
        nov_score = float(np.clip(neowise_novelty_score, 0.0, 1.0))

        return np.array([neg_log_p, anom_rank, pca_err, mahal, best_chi2, is_sso, nov_score, ae_score])

    def compute_heuristic_score(
        self,
        p_val_variability: float,
        anomaly_percentile: float,
        neowise_delta_mag: float,
        is_sso: bool,
        sso_confound_penalty: float = 0.0
    ) -> float:
        """
        Computes the unified interestingness score in [0.0, 1.0].
        """
        # Variability significance: map p-value to [0, 1] using -log10
        # p = 1.0 -> 0.0; p = 1e-4 -> 1.0 (capped)
        neg_log_p = -np.log10(np.clip(p_val_variability, 1e-6, 1.0))
        norm_var = float(np.clip(neg_log_p / 4.0, 0.0, 1.0))

        # Anomaly score is already a percentile rank [0, 1]
        norm_anom = float(np.clip(anomaly_percentile, 0.0, 1.0))

        # Historic novelty (NEOWISE delta mag): 0 mag -> 0.0; >= 1.5 mag -> 1.0
        norm_nov = float(np.clip(abs(neowise_delta_mag) / 1.5, 0.0, 1.0))

        raw_score = (
            self.w_var * norm_var +
            self.w_anom * norm_anom +
            self.w_nov * norm_nov
        )

        # Apply moving-object confound penalty
        if is_sso:
            raw_score *= (1.0 - self.sso_penalty * max(sso_confound_penalty, 0.5))

        return float(np.clip(raw_score, 0.0, 1.0))

    def record_user_feedback(
        self,
        feature_vector: np.ndarray,
        user_label: int  # 1 for interesting, 0 for bogus/artifact
    ):
        """
        Stores user review feedback to support active learning updates.
        """
        self.user_feedback_data.append((feature_vector, user_label))

    def update_with_feedback(self) -> bool:
        """
        Trains/updates a ranking model once >= 10 user reviews are accumulated.

        Threshold: 10 samples (Lochner & Bassett 2021 showed diminishing returns below this).
        Model selection:
          - 10–49 reviews: LogisticRegression (fast, low-variance).
          - >= 50 reviews: attempts LightGBM for stronger non-linear ranking;
                           falls back gracefully to LogisticRegression if unavailable.
        """
        n = len(self.user_feedback_data)
        if n < 10:
            return False

        X = np.array([x for x, y in self.user_feedback_data])
        y = np.array([y for x, y in self.user_feedback_data])

        if len(np.unique(y)) < 2:
            return False

        if n >= 50:
            try:
                import lightgbm as lgb
                model = lgb.LGBMClassifier(
                    n_estimators=50,
                    num_leaves=15,
                    learning_rate=0.1,
                    random_state=42,
                    verbosity=-1,
                )
                model.fit(X, y)
                self.feedback_model = model
                return True
            except ImportError:
                pass   # LightGBM not installed — fall through to LogisticRegression

        lr = LogisticRegression(C=1.0, penalty="l2", max_iter=500)
        lr.fit(X, y)
        self.feedback_model = lr
        return True

    def predict_rank_score(
        self,
        feature_vector: np.ndarray,
        heuristic_score: float
    ) -> float:
        """
        Predicts final priority score blending heuristic physics with user-trained active learning.
        """
        if self.feedback_model is None:
            return heuristic_score

        p_learned = self.feedback_model.predict_proba(feature_vector.reshape(1, -1))[0, 1]
        # Blend: 50% heuristic baseline, 50% learned user preference
        return float(0.5 * heuristic_score + 0.5 * p_learned)
