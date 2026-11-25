"""
labels.py - Candidate Vetting Label Tiers and Strict Leakage Prevention

Specification Reference: §2.6
- Labels (four tiers):
  1. Confirmed, dynamically anchored: Confirmed with measured mass (provenance 'Mass', not a limit).
     Strongest positive; train.
  2. Confirmed, statistically validated: Confirmed with no measured mass.
     Positive, but potentially circular with vetting methods. Train, always reported separately.
  3. Certified false positive: Strongest negative; train.
  4. Unresolved candidate: Unknown; never a positive in training; evaluate separately.

- Leakage Controls:
  Drop the pipeline score, probabilistic-disposition columns, and false-positive flag columns
  (koi_fpflag_*, koi_score, koi_pdisposition, toi equivalents) from all main models!
"""

from typing import List, Tuple
import pandas as pd
import numpy as np


# Columns that must be dropped from feature vectors to prevent target leakage
LEAKAGE_COLUMNS = [
    # Kepler disposition / score / flags
    "koi_score",
    "koi_pdisposition",
    "koi_disposition",
    "koi_fpflag_nt",
    "koi_fpflag_ss",
    "koi_fpflag_co",
    "koi_fpflag_ec",
    "koi_vet_stat",
    # TESS disposition / flags
    "tfopwg_disp",
    "toi_score",
    "toi_fpflag",
    "toi_fpflag_nt",
    "toi_fpflag_ss",
    "toi_fpflag_co",
    "toi_fpflag_ec",
    # Identifiers & target columns
    "host_key",
    "group_id",
    "kic_id",
    "tic_id",
    "epic_id",
    "gaia_id",
    "target_label",
    "host_label_tier",
    "role",
]


def assign_host_label_tier(row: pd.Series) -> str:
    """
    Assigns one of the four required label tiers based on physical provenance and disposition.
    """
    disp = str(row.get("disposition", "")).upper()
    mass_prov = str(row.get("pl_bmassprov", "")).strip()
    mass_lim = row.get("pl_bmasselim", 0)

    if "CONFIRMED" in disp or disp == "C":
        if mass_prov == "Mass" and mass_lim == 0:
            return "dynamically_anchored"
        else:
            return "statistically_validated"
    elif "FALSE POSITIVE" in disp or disp == "FP":
        return "certified_false_positive"
    elif "CANDIDATE" in disp or disp == "PC":
        return "unresolved_candidate"
    else:
        return "no_b2_object"


def clean_features_for_vetting(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Cleans catalog dataset, strips leakage columns, and extracts target labels.
    
    Returns:
      X: cleaned feature dataframe (strictly free of disposition/flag leakage)
      y: binary target (1 for positive confirmed, 0 for false positive, -1 for unresolved candidate)
      tiers: label tier series
    """
    df = df.copy()
    if "host_label_tier" not in df.columns:
        df["host_label_tier"] = df.apply(assign_host_label_tier, axis=1)

    # Encode binary target for training
    # dynamically_anchored: 1
    # statistically_validated: 1
    # certified_false_positive: 0
    # unresolved_candidate: -1 (excluded from training)
    target = pd.Series(-1, index=df.index, dtype=int)
    target[df["host_label_tier"].isin(["dynamically_anchored", "statistically_validated"])] = 1
    target[df["host_label_tier"] == "certified_false_positive"] = 0

    # Strip leakage columns
    cols_to_drop = [c for c in LEAKAGE_COLUMNS if c in df.columns]
    X = df.drop(columns=cols_to_drop)

    # Drop non-numeric and text columns
    X_numeric = X.select_dtypes(include=[np.number]).fillna(0.0)

    # Sanitize column names for gradient boosting (LightGBM/XGBoost JSON character restrictions)
    import re
    X_numeric.columns = [re.sub(r'[\[\]\{\}:,"]', '_', str(c)) for c in X_numeric.columns]

    return X_numeric, target, df["host_label_tier"]
