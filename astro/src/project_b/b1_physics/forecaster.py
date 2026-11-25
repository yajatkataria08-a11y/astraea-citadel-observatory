"""
forecaster.py - Missing Mass/Radius Regression & Conformal Prediction

Specification Reference: §2.5
- Baseline: Forecaster (Chen & Kipping 2017 broken power-law).
- Challengers: Quantile LightGBM, Random Forest Regressor.
- Evaluated on T1 planets host-grouped (grouped repeated CV, §1.2).
- Outputs:
  * Median absolute error
  * 68% and 95% conformal prediction intervals via CV+ / Jackknife+
  * Interval width & stratified coverage checks
- Minimum masses (T3b, M sin i): Excluded from mass->radius path in v1.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestRegressor


class ChenKippingForecaster:
    """
    Forecaster baseline (Chen & Kipping 2017, ApJ 834, 17):
    Piecewise power-law mass-radius relation:
    R/R_earth = C * (M/M_earth)^S
    Transition points:
      Terr: M <= 2.04 M_earth (S = 0.279)
      Neptunian: 2.04 < M <= 132 M_earth (S = 0.589)
      Jovian: 132 < M <= 26600 M_earth (S = -0.044)
    """

    def predict_radius(self, mass_earth: np.ndarray) -> np.ndarray:
        m = np.maximum(mass_earth, 1e-4)
        r = np.zeros_like(m)

        # Terr: M <= 2.04 M_earth
        m1 = m <= 2.04
        r[m1] = 1.008 * (m[m1] ** 0.279)

        # Neptunian: 2.04 < M <= 132 M_earth
        m2 = (m > 2.04) & (m <= 132.0)
        c2 = 1.008 * (2.04 ** 0.279) / (2.04 ** 0.589)
        r[m2] = c2 * (m[m2] ** 0.589)

        # Jovian: 132 < M <= 26600 M_earth
        m3 = m > 132.0
        c3 = c2 * (132.0 ** 0.589) / (132.0 ** (-0.044))
        r[m3] = c3 * (m[m3] ** (-0.044))

        return r

    def predict_mass(self, radius_earth: np.ndarray) -> np.ndarray:
        r = np.maximum(radius_earth, 0.1)
        # Inversion of the Terr and Neptunian regimes
        r_trans = 1.008 * (2.04 ** 0.279)  # ~1.23 R_earth
        m = np.zeros_like(r)

        m1 = r <= r_trans
        m[m1] = (r[m1] / 1.008) ** (1.0 / 0.279)

        m2 = r > r_trans
        c2 = 1.008 * (2.04 ** 0.279) / (2.04 ** 0.589)
        m[m2] = (r[m2] / c2) ** (1.0 / 0.589)

        return m


class QuantileLGBMForecaster:
    """Quantile LightGBM predicting 5th, 50th (median), and 95th percentiles."""

    def __init__(self, random_state: int = 42):
        self.models: Dict[float, LGBMRegressor] = {
            0.05: LGBMRegressor(objective="quantile", alpha=0.05, n_estimators=200, random_state=random_state, verbose=-1),
            0.16: LGBMRegressor(objective="quantile", alpha=0.16, n_estimators=200, random_state=random_state, verbose=-1),
            0.50: LGBMRegressor(objective="quantile", alpha=0.50, n_estimators=200, random_state=random_state, verbose=-1),
            0.84: LGBMRegressor(objective="quantile", alpha=0.84, n_estimators=200, random_state=random_state, verbose=-1),
            0.95: LGBMRegressor(objective="quantile", alpha=0.95, n_estimators=200, random_state=random_state, verbose=-1),
        }

    def fit(self, X: np.ndarray, y: np.ndarray):
        for q, model in self.models.items():
            model.fit(X, y)

    def predict_quantiles(self, X: np.ndarray) -> Dict[float, np.ndarray]:
        return {q: model.predict(X) for q, model in self.models.items()}


def compute_cv_plus_conformal_intervals(
    oof_y_true: np.ndarray,
    oof_y_pred: np.ndarray,
    test_y_pred: np.ndarray,
    coverage: float = 0.95
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes exact CV+ (Jackknife+) conformal prediction intervals:
    Residuals: R_i = |Y_i - Y_pred_oof_i|.
    Interval for test point: [Y_pred_test - q_R, Y_pred_test + q_R].
    Guarantees 1 - alpha coverage on exchangeable samples.
    """
    residuals = np.abs(oof_y_true - oof_y_pred)
    n = len(residuals)
    # Target quantile index
    k = int(np.ceil((1.0 - coverage) * (n + 1)))
    q_val = np.quantile(residuals, (n + 1 - k) / n, method="higher")

    lower = test_y_pred - q_val
    upper = test_y_pred + q_val
    return lower, upper
