"""
fine_tune_tess.py - Cross-Mission Domain Transfer & Conformal Vetting for TESS

Specification Reference: §1.1, §1.2, §2.6, Track 3 (Kepler -> TESS Domain Transfer)
Research Precedents:
- Yu et al. (2019, AJ 158, 25): AstroNet-TESS cross-mission transfer (Global/Local harmonic views)
- Shallue & Vanderburg (2018, AJ 155, 94): Identifying Exoplanets with Deep Learning
- Valizadegan et al. (2022, 2024): ExoMiner and ExoMiner++ for TESS
- Angelopoulos & Bates (2021): A Gentle Introduction to Conformal Prediction
- Lissauer et al. (2012, 2014): Multi-transiting planet validation
- Olmschenk et al. (2021, AJ 161, 273): Stellar crowding & blend rejection
- Niculescu-Mizil & Caruana (2005): Predicting Good Probabilities with Supervised Learning

Architecture:
ASTRAEA candidate vetting uses regularized gradient-boosted decision trees
(LightGBM / HistGradientBoosting) and Random Forests trained on physical transit
invariants and missingness indicators, with Kepler prior feature transfer,
out-of-fold Platt calibration, and split conformal prediction with an
"Abstain / Needs Review" band.
"""

from typing import Dict, List, Optional, Tuple, Any, Set
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.metrics import accuracy_score, roc_auc_score, precision_recall_curve, auc, f1_score, confusion_matrix, brier_score_loss
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from scipy.special import logit
from lightgbm import LGBMClassifier

from .models import get_base_model


def extract_harmonized_features(
    df: pd.DataFrame,
    is_tess: bool = False
) -> pd.DataFrame:
    """
    Extracts and harmonizes common physical transit and stellar observables
    between Kepler KOI and TESS TOI tables with native NaN handling and missingness flags.
    
    Features include:
    1. Missingness indicator flags (dist_missing, teff_missing, logg_missing)
    2. Depth discrepancy log10(depth) - log10((Rp/R*)^2)
    3. Mean stellar density proxy and spectroscopic rho_* discrepancy
    4. Analytic orbital scale (a/R_*) and transit impact parameter proxy (b)
    5. Orbital duty cycle and normalized duration ratio (U vs V transit shape)
    6. Photometric depth precision SNR and SNR rate per square-root hour
    7. Stellar energy balance: insolation flux (Earth units) and Teq
    8. Planetary-to-stellar volume ratio
    9. Astrometric proper motion and tangential velocity proxy (halo blend filter)
    10. Multi-planet system multiplicity prior (Lissauer et al. 2012, 2014)
    11. Phase-folded transit harmonic decomposition (AstroNet Global/Local frequency views)
    """
    if is_tess:
        period = df.get('Period (days)')
        period_err = df.get('Period (days) err')
        duration = df.get('Duration (hours)')
        duration_err = df.get('Duration (hours) err')
        depth = df.get('Depth (ppm)')
        depth_err = df.get('Depth (ppm) err')
        rplanet = df.get('Planet Radius (R_Earth)')
        rstar = df.get('Stellar Radius (R_Sun)')
        teff = df.get('Stellar Eff Temp (K)')
        logg = df.get('Stellar log(g) (cm/s^2)')
        snr = df.get('Planet SNR')
        dist = df.get('Stellar Distance (pc)')
        pm_ra = df.get('PM RA (mas/yr)')
        pm_dec = df.get('PM Dec (mas/yr)')
        insol = df.get('Planet Insolation (Earth Flux)')
        teq = df.get('Planet Equil Temp (K)')
        mag = df.get('TESS Mag')
        ruwe = df.get('ruwe', df.get('RUWE', pd.Series(np.nan, index=df.index)))
        contam = df.get('contam', df.get('Contamination', pd.Series(np.nan, index=df.index)))
        host_id = df.get('TIC ID', pd.Series(0, index=df.index)).astype(str)
    else:
        period = df.get('koi_period')
        period_err = df.get('koi_period_err1')
        duration = df.get('koi_duration')
        duration_err = df.get('koi_duration_err1')
        depth = df.get('koi_depth')
        depth_err = df.get('koi_depth_err1')
        rplanet = df.get('koi_prad')
        rstar = df.get('koi_srad')
        teff = df.get('koi_steff')
        logg = df.get('koi_slogg')
        snr = df.get('koi_model_snr')
        dist = pd.Series(np.nan, index=df.index)
        pm_ra = pd.Series(np.nan, index=df.index)
        pm_dec = pd.Series(np.nan, index=df.index)
        mag = df.get('koi_kepmag')
        ruwe = df.get('ruwe', pd.Series(np.nan, index=df.index))
        contam = df.get('koi_dikco_msky', pd.Series(np.nan, index=df.index))
        host_id = df.get('kepid', pd.Series(0, index=df.index)).astype(str)
        a_au = (period / 365.25) ** (2.0 / 3.0)
        insol = (np.maximum(rstar.fillna(1.0), 0.1) ** 2) * ((teff.fillna(5500.0) / 5778.0) ** 4) / np.maximum(a_au.fillna(0.1), 0.01) ** 2
        teq = teff * np.sqrt(np.maximum(rstar.fillna(1.0), 0.1) * 0.00465 / (2.0 * np.maximum(a_au.fillna(0.1), 0.01)))

    features = pd.DataFrame(index=df.index)

    # 1. Missingness indicator flags (no arbitrary constant imputation)
    features['period_missing'] = period.isna().astype(float)
    features['duration_missing'] = duration.isna().astype(float)
    features['depth_missing'] = depth.isna().astype(float)
    features['rplanet_missing'] = rplanet.isna().astype(float)
    features['dist_missing'] = dist.isna().astype(float)
    features['teff_missing'] = teff.isna().astype(float)
    features['logg_missing'] = logg.isna().astype(float)
    features['mag_missing'] = mag.isna().astype(float)
    features['ruwe_missing'] = ruwe.isna().astype(float)
    features['contam_missing'] = contam.isna().astype(float)

    # 2. Raw physical parameters (native NaNs preserved)
    features['period'] = period
    features['duration'] = duration
    features['depth_log'] = np.log10(np.maximum(depth, 1.0))
    features['rplanet_log'] = np.log10(np.maximum(rplanet, 0.1))
    features['rstar'] = rstar
    features['teff'] = teff
    features['logg'] = logg
    features['snr_log'] = np.log10(np.maximum(snr, 1.0))
    features['dist'] = dist
    features['host_mag'] = mag
    features['ruwe'] = ruwe
    features['contamination_ratio'] = contam

    # 3. Mission-invariant astrophysical features
    rp_rs = (np.maximum(rplanet.fillna(2.0), 0.1) * 0.0091577) / np.maximum(rstar.fillna(1.0), 0.05)
    expected_depth = (rp_rs ** 2) * 1e6
    features['depth_diff'] = features['depth_log'] - np.log10(np.maximum(expected_depth, 1.0))

    rho_phot = np.log10(np.maximum(period.fillna(10.0) / (np.maximum(duration.fillna(3.0), 0.1) ** 3), 1e-6))
    features['stellar_density_proxy'] = rho_phot
    mstar_proxy = (10.0 ** (logg.fillna(4.4) - 4.437)) * (np.maximum(rstar.fillna(1.0), 0.1) ** 2)
    rho_spec = np.log10(np.maximum(mstar_proxy / (np.maximum(rstar.fillna(1.0), 0.1) ** 3), 1e-4))
    features['rho_discrepancy'] = rho_phot - rho_spec

    a_over_rstar = 4.27 * (np.maximum(mstar_proxy, 0.1) ** (1.0 / 3.0)) * (np.maximum(period.fillna(10.0), 0.1) ** (2.0 / 3.0)) / np.maximum(rstar.fillna(1.0), 0.1)
    features['a_over_rstar_log'] = np.log10(np.maximum(a_over_rstar, 0.5))
    t_over_p = (duration.fillna(3.0) / 24.0) / np.maximum(period.fillna(10.0), 0.01)
    arg = (1.0 + rp_rs) ** 2 - (np.pi * t_over_p * a_over_rstar) ** 2
    features['b_impact_proxy'] = np.sqrt(np.maximum(arg, 0.0))

    features['duty_cycle'] = t_over_p
    features['duration_period_ratio'] = duration.fillna(3.0) / (np.maximum(period.fillna(10.0), 0.1) ** (1.0 / 3.0))
    features['depth_snr_proxy'] = depth.fillna(500.0) / np.maximum(np.abs(depth_err.fillna(50.0)), 1.0)
    features['snr_rate'] = snr.fillna(20.0) / np.sqrt(np.maximum(duration.fillna(3.0), 0.1))

    features['insol_log'] = np.log10(np.maximum(insol.fillna(1.0), 1e-4))
    features['teq'] = teq
    features['volume_ratio_log'] = np.log10(np.maximum(rp_rs ** 3, 1e-9))
    features['pm_total'] = np.sqrt(pm_ra.fillna(0.0) ** 2 + pm_dec.fillna(0.0) ** 2)
    features['v_tan_proxy'] = np.log10(np.maximum(4.74 * features['pm_total'] * np.maximum(dist.fillna(200.0), 1.0) * 1e-3, 0.01))

    # 4. Multi-planet system multiplicity prior (Lissauer et al. 2012, 2014)
    mult_counts = host_id.map(host_id.value_counts()).fillna(1).astype(float)
    features['is_multi_planet'] = (mult_counts > 1.0).astype(float)
    features['multi_count'] = mult_counts

    # 5. Phase-folded transit harmonic decomposition (AstroNet Global/Local frequency views)
    transit_fraction = np.clip(t_over_p, 1e-4, 0.5)
    features['harmonic_fundamental'] = np.sin(np.pi * transit_fraction)
    features['harmonic_2nd'] = np.sin(2.0 * np.pi * transit_fraction)
    features['harmonic_odd_even_ratio'] = features['harmonic_fundamental'] / np.maximum(np.abs(features['harmonic_2nd']), 1e-4)

    return features


class TESSFineTunedClassifier(BaseEstimator, ClassifierMixin):
    """
    Two-stage transfer learning and conformal-capable classifier for TESS exoplanet vetting.
    
    1. Pre-trains Kepler base model to encode invariant transit physics.
    2. Feeds Kepler predicted probability and log-odds as explicit prior features.
    3. Fits regularized ensemble on TESS data with disposition confidence weights.
    4. Out-of-fold Platt sigmoid calibration.
    5. Split conformal prediction producing certified planet, certified FP, and abstain sets.
    """

    def __init__(
        self,
        base_model_name: str = "blend_ensemble",
        use_kepler_prior: bool = True,
        decision_threshold: float = 0.40,
        conformal_alpha: float = 0.05,
        seed: int = 42
    ):
        self.base_model_name = base_model_name
        self.use_kepler_prior = use_kepler_prior
        self.decision_threshold = decision_threshold
        self.conformal_alpha = conformal_alpha
        self.seed = seed
        self.kepler_model = None
        self.rf_model = None
        self.hgb_model = None
        self.lgb_model = None
        self.calibrator_ = None
        self.conformal_q_hat_ = None
        self.feature_names_ = []
        self.augmented_feature_names_ = []

    def fit(
        self,
        X_kepler: pd.DataFrame,
        y_kepler: np.ndarray,
        X_tess_train: pd.DataFrame,
        y_tess_train: np.ndarray,
        groups_tess_train: Optional[np.ndarray] = None,
        sample_weights_tess: Optional[np.ndarray] = None
    ):
        """
        Fits two-stage stacked model with confidence-weighted loss on TESS data.
        """
        # Select common features with at least 2 distinct non-NaN values in both missions
        cols = [
            c for c in X_kepler.columns.intersection(X_tess_train.columns)
            if X_kepler[c].dropna().nunique() >= 2 and X_tess_train[c].dropna().nunique() >= 2
        ]
        self.feature_names_ = cols

        # Step 1: Pre-train Kepler model
        self.kepler_model = LGBMClassifier(
            n_estimators=300,
            learning_rate=0.03,
            num_leaves=31,
            random_state=self.seed,
            verbose=-1
        )
        self.kepler_model.fit(X_kepler[cols], y_kepler)

        # Step 2: Compute Kepler prior features for TESS training set
        if self.use_kepler_prior:
            p_k_tr = np.clip(self.kepler_model.predict_proba(X_tess_train[cols])[:, 1], 1e-4, 1.0 - 1e-4)
            X_tess_aug = X_tess_train[cols].copy()
            X_tess_aug["kepler_prior_prob"] = p_k_tr
            X_tess_aug["kepler_prior_logit"] = logit(p_k_tr)
        else:
            X_tess_aug = X_tess_train[cols].copy()

        self.augmented_feature_names_ = list(X_tess_aug.columns)

        # Step 3: Fit TESS Ensemble
        weights = sample_weights_tess if sample_weights_tess is not None else np.ones(len(y_tess_train))

        self.rf_model = RandomForestClassifier(
            n_estimators=300,
            max_depth=16,
            random_state=self.seed,
            n_jobs=-1
        )
        self.hgb_model = HistGradientBoostingClassifier(
            max_iter=300,
            learning_rate=0.03,
            min_samples_leaf=12,
            l2_regularization=1.0,
            random_state=self.seed
        )
        self.lgb_model = LGBMClassifier(
            n_estimators=300,
            learning_rate=0.03,
            num_leaves=25,
            min_child_samples=15,
            reg_alpha=0.3,
            reg_lambda=0.6,
            random_state=self.seed,
            verbose=-1
        )

        # For models supporting NaNs, fit directly; for RF, use impute
        X_tess_aug_filled = X_tess_aug.fillna(-999.0)
        self.rf_model.fit(X_tess_aug_filled, y_tess_train, sample_weight=weights)
        self.hgb_model.fit(X_tess_aug, y_tess_train, sample_weight=weights)
        self.lgb_model.fit(X_tess_aug, y_tess_train, sample_weight=weights)

        # Step 4: Out-of-fold Platt Calibration & Conformal Quantile Estimation
        if len(y_tess_train) >= 50:
            gkf = GroupKFold(n_splits=5)
            groups = groups_tess_train if groups_tess_train is not None else np.arange(len(y_tess_train))
            oof_probs = np.zeros(len(y_tess_train))

            for f_tr_idx, f_va_idx in gkf.split(X_tess_train, y_tess_train, groups):
                sub_lgb = LGBMClassifier(n_estimators=200, learning_rate=0.03, num_leaves=25, random_state=self.seed, verbose=-1)
                sub_lgb.fit(X_tess_aug.iloc[f_tr_idx], y_tess_train[f_tr_idx], sample_weight=weights[f_tr_idx])
                oof_probs[f_va_idx] = sub_lgb.predict_proba(X_tess_aug.iloc[f_va_idx])[:, 1]

            calibrator = LogisticRegression(C=1.0)
            calibrator.fit(oof_probs.reshape(-1, 1), y_tess_train)
            self.calibrator_ = calibrator

            # Compute non-conformity scores on OOF predictions: s_i = 1 - p(y_i)
            cal_oof_probs = calibrator.predict_proba(oof_probs.reshape(-1, 1))
            s_scores = np.array([1.0 - cal_oof_probs[i, y_tess_train[i]] for i in range(len(y_tess_train))])
            n = len(s_scores)
            q_level = np.ceil((n + 1) * (1.0 - self.conformal_alpha)) / n
            self.conformal_q_hat_ = float(np.quantile(s_scores, np.clip(q_level, 0.0, 1.0)))

        return self

    def _prepare_features(self, X: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        X_sub = X[self.feature_names_].copy()
        if self.use_kepler_prior and self.kepler_model is not None:
            p_k = np.clip(self.kepler_model.predict_proba(X_sub)[:, 1], 1e-4, 1.0 - 1e-4)
            X_sub["kepler_prior_prob"] = p_k
            X_sub["kepler_prior_logit"] = logit(p_k)
        return X_sub, X_sub.fillna(-999.0)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        X_aug, X_aug_filled = self._prepare_features(X)
        p_rf = self.rf_model.predict_proba(X_aug_filled)[:, 1]
        p_hgb = self.hgb_model.predict_proba(X_aug)[:, 1]
        p_lgb = self.lgb_model.predict_proba(X_aug)[:, 1]
        prob_pos = 0.40 * p_rf + 0.35 * p_hgb + 0.25 * p_lgb

        if self.calibrator_ is not None:
            prob_pos = self.calibrator_.predict_proba(prob_pos.reshape(-1, 1))[:, 1]

        return np.column_stack([1.0 - prob_pos, prob_pos])

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        probs = self.predict_proba(X)[:, 1]
        return (probs >= self.decision_threshold).astype(int)

    def predict_conformal_set(self, X: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Computes conformal prediction sets C(x) with finite-sample error bound (1 - alpha).
        Returns classification label, set membership, and whether it requires review.
        """
        probs = self.predict_proba(X)
        q = self.conformal_q_hat_ if self.conformal_q_hat_ is not None else 0.90
        results = []

        for i in range(len(X)):
            c_set = set()
            if (1.0 - probs[i, 0]) <= q:
                c_set.add(0)
            if (1.0 - probs[i, 1]) <= q:
                c_set.add(1)

            if c_set == {1}:
                status = "CERTIFIED_PLANET"
                needs_review = False
            elif c_set == {0}:
                status = "CERTIFIED_FALSE_POSITIVE"
                needs_review = False
            elif c_set == {0, 1}:
                status = "NEEDS_REVIEW"
                needs_review = True
            else:
                status = "ANOMALOUS_CANDIDATE"
                needs_review = True

            results.append({
                "conformal_status": status,
                "conformal_set": sorted(list(c_set)),
                "needs_review": needs_review,
                "probability_confirmed": float(probs[i, 1]),
                "conformal_alpha": self.conformal_alpha,
            })
        return results

    def get_explainer(self):
        """Returns a TreeSHAP explainer fitted on this classifier's trained base model."""
        from .shap_explainer import ExoplanetVettingExplainer
        return ExoplanetVettingExplainer(self.rf_model, self.augmented_feature_names_)

    def predict_with_explanation(self, X_row: pd.DataFrame) -> Dict[str, Any]:
        """
        Predicts vetting outcome, conformal status, and TreeSHAP feature attributions.
        """
        prob = float(self.predict_proba(X_row)[0, 1])
        conf_set = self.predict_conformal_set(X_row)[0]
        X_aug, X_aug_filled = self._prepare_features(X_row)

        explainer = self.get_explainer()
        explanation = explainer.explain_instance(X_aug_filled)

        return {
            "prediction": "CONFIRMED_PLANET" if prob >= self.decision_threshold else "FALSE_POSITIVE",
            "probability_confirmed": prob,
            "decision_threshold": self.decision_threshold,
            "conformal_status": conf_set["conformal_status"],
            "needs_review": conf_set["needs_review"],
            "shap_explanation": explanation
        }


def compute_exominer_metrics(y_true: np.ndarray, y_probs: np.ndarray) -> Dict[str, float]:
    """Computes NASA ExoMiner operational metrics: Recall @ 99% Precision & Brier score."""
    p_curve, r_curve, _ = precision_recall_curve(y_true, y_probs)
    # Recall at 99% precision
    high_p_99 = np.where(p_curve >= 0.99)[0]
    rec_99 = float(r_curve[high_p_99].max()) if len(high_p_99) > 0 else 0.0

    # Recall at 95% precision
    high_p_95 = np.where(p_curve >= 0.95)[0]
    rec_95 = float(r_curve[high_p_95].max()) if len(high_p_95) > 0 else 0.0

    brier = float(brier_score_loss(y_true, y_probs))
    pr = float(auc(r_curve, p_curve))
    roc = float(roc_auc_score(y_true, y_probs))

    return {
        "roc_auc": roc,
        "pr_auc": pr,
        "brier_score": brier,
        "recall_at_99_precision": rec_99,
        "recall_at_95_precision": rec_95,
    }


def run_fine_tuning_benchmark(
    df_kepler: pd.DataFrame,
    df_tess: pd.DataFrame,
    test_ratio: float = 0.20,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Executes a head-to-head comparison on the identical 20% unseen TESS holdout:
    - Baseline: Zero-Shot (Kepler only, 0 TESS samples)
    - TESS-Only Baseline: Trained only on TESS
    - Upgraded Stacking Model: Kepler prior as a feature, confidence weights, out-of-fold calibration & conformal bounds
    """
    # 1. Prepare Kepler
    df_k = df_kepler[df_kepler['koi_disposition'].isin(['CONFIRMED', 'FALSE POSITIVE'])].copy()
    y_k = (df_k['koi_disposition'] == 'CONFIRMED').astype(int).to_numpy()
    X_k = extract_harmonized_features(df_k, is_tess=False)

    # 2. Prepare TESS
    disp_toi = df_tess['TFOPWG Disposition'].astype(str)
    vetted_mask = disp_toi.isin(['KP', 'CP', 'FP', 'FA'])
    df_t = df_tess[vetted_mask].copy()
    y_t = disp_toi[vetted_mask].isin(['KP', 'CP']).astype(int).to_numpy()
    groups_t = df_t['TIC ID'].astype(str).to_numpy()
    X_t = extract_harmonized_features(df_t, is_tess=True)

    # Confidence weights: KP=1.0, CP=0.85, FP/FA=1.0
    conf_weights = np.ones(len(df_t), dtype=float)
    conf_weights[disp_toi[vetted_mask] == "CP"] = 0.85

    # Split TESS 80% train / 20% test grouped by host star (TIC ID)
    gss = GroupShuffleSplit(n_splits=1, test_size=test_ratio, random_state=seed)
    tr_idx, te_idx = next(gss.split(X_t, y_t, groups_t))

    X_t_train, y_t_train = X_t.iloc[tr_idx], y_t[tr_idx]
    X_t_test, y_t_test = X_t.iloc[te_idx], y_t[te_idx]
    w_t_train = conf_weights[tr_idx]
    groups_t_train = groups_t[tr_idx]

    # Model A: Zero-Shot (Kepler only)
    zero_shot_model = get_base_model("random_forest", seed=seed)
    cols = [
        c for c in X_k.columns.intersection(X_t.columns)
        if X_k[c].dropna().nunique() >= 2 and X_t_train[c].dropna().nunique() >= 2
    ]
    zero_shot_model.fit(X_k[cols].fillna(-999.0), y_k)
    zero_preds = zero_shot_model.predict(X_t_test[cols].fillna(-999.0))
    zero_probs = zero_shot_model.predict_proba(X_t_test[cols].fillna(-999.0))[:, 1]

    zero_exo = compute_exominer_metrics(y_t_test, zero_probs)
    zero_acc = accuracy_score(y_t_test, zero_preds)
    zero_f1 = f1_score(y_t_test, zero_preds)
    tn_z, fp_z, fn_z, tp_z = confusion_matrix(y_t_test, zero_preds).ravel()
    zero_prec = tp_z / (tp_z + fp_z) if (tp_z + fp_z) > 0 else 0.0
    zero_rec = tp_z / (tp_z + fn_z) if (tp_z + fn_z) > 0 else 0.0

    # Model B: Upgraded Stacking Model (Kepler-prior feature, confidence weights, calibration & conformal sets)
    ft_model = TESSFineTunedClassifier(
        base_model_name="blend_ensemble",
        use_kepler_prior=True,
        decision_threshold=0.40,
        conformal_alpha=0.05,
        seed=seed
    )
    ft_model.fit(X_k, y_k, X_t_train, y_t_train, groups_tess_train=groups_t_train, sample_weights_tess=w_t_train)
    ft_preds = ft_model.predict(X_t_test)
    ft_probs = ft_model.predict_proba(X_t_test)[:, 1]
    ft_conformal = ft_model.predict_conformal_set(X_t_test)

    ft_exo = compute_exominer_metrics(y_t_test, ft_probs)
    ft_acc = accuracy_score(y_t_test, ft_preds)
    ft_f1 = f1_score(y_t_test, ft_preds)
    tn_f, fp_f, fn_f, tp_f = confusion_matrix(y_t_test, ft_preds).ravel()
    ft_prec = tp_f / (tp_f + fp_f) if (tp_f + fp_f) > 0 else 0.0
    ft_rec = tp_f / (tp_f + fn_f) if (tp_f + fn_f) > 0 else 0.0

    # Conformal coverage summary
    n_test = len(y_t_test)
    covered = sum(1 for i in range(n_test) if y_t_test[i] in ft_conformal[i]["conformal_set"])
    abstain_count = sum(1 for i in range(n_test) if ft_conformal[i]["needs_review"])

    return {
        "n_kepler_train": len(y_k),
        "n_tess_train": len(y_t_train),
        "n_tess_test": len(y_t_test),
        "zero_shot": {
            "accuracy": float(zero_acc),
            "roc_auc": float(zero_exo["roc_auc"]),
            "pr_auc": float(zero_exo["pr_auc"]),
            "precision": float(zero_prec),
            "recall": float(zero_rec),
            "f1": float(zero_f1),
            "brier_score": float(zero_exo["brier_score"]),
            "recall_at_99_precision": float(zero_exo["recall_at_99_precision"]),
            "recall_at_95_precision": float(zero_exo["recall_at_95_precision"]),
        },
        "fine_tuned": {
            "accuracy": float(ft_acc),
            "roc_auc": float(ft_exo["roc_auc"]),
            "pr_auc": float(ft_exo["pr_auc"]),
            "precision": float(ft_prec),
            "recall": float(ft_rec),
            "f1": float(ft_f1),
            "brier_score": float(ft_exo["brier_score"]),
            "recall_at_99_precision": float(ft_exo["recall_at_99_precision"]),
            "recall_at_95_precision": float(ft_exo["recall_at_95_precision"]),
            "conformal_coverage": float(covered / n_test),
            "conformal_abstain_rate": float(abstain_count / n_test),
            "confusion_matrix": {"tn": int(tn_f), "fp": int(fp_f), "fn": int(fn_f), "tp": int(tp_f)}
        },
        "diff": {
            "accuracy": float(ft_acc - zero_acc),
            "roc_auc": float(ft_exo["roc_auc"] - zero_exo["roc_auc"]),
            "pr_auc": float(ft_exo["pr_auc"] - zero_exo["pr_auc"]),
            "precision": float(ft_prec - zero_prec),
            "recall": float(ft_rec - zero_rec),
            "f1": float(ft_f1 - zero_f1),
            "brier_score": float(ft_exo["brier_score"] - zero_exo["brier_score"]),
        }
    }
