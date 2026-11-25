"""
splitting.py - Splitting Protocol for Project B and Project A

Specification Reference: §1.2
- Splitting makes the test score honest.
- Assign units deterministically via seeded procedure and freeze in split_manifest.parquet.
- Roles are disjoint and group-disjoint (no group_id or tile in two roles).
- Test set (20%) frozen first, touched once, nothing tuned on it.

Project B:
- Split unit: group_id
- 20% frozen test, stratified jointly by:
    group label tier x mission (Kepler, K2, TESS) x Teff bin
- Hosts with no KOI/TOI (e.g. RV-only hosts) form 'no_b2_object' tier.
- Strata with < 5 test hosts are merged deterministically (Teff bin first, then mission)
  BEFORE the draw. Never reseed!
- Development set (80%): Repeated Grouped K-Fold (R repeats, K folds).

Project A:
- Fixed roles: Train (60%), Validation (10%), Calibration (10%), Test (20%).
- Unit: HEALPix tile ID at fixed nside and ordering (RING or NESTED).
- Buffer: Drop training sources whose angular separation from test pixels < d_buf.
"""

import hashlib
import json
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd


@dataclass
class SplitManifestMetadata:
    project: str
    seed: int
    n_splits: int
    n_repeats: int
    created_at: str
    strata_counts: Dict[str, Any]
    d_buf_deg: Optional[float] = None
    healpix_nside: Optional[int] = None
    healpix_order: Optional[str] = None


def hash_assign_fold(group_id: str, seed: int, n_folds: int) -> int:
    """Deterministic hash assignment of group_id to a fold."""
    h = hashlib.sha256(f"{group_id}_{seed}".encode("utf-8")).hexdigest()
    return int(h, 16) % n_folds


def assign_teff_bin(teff: float) -> str:
    """Bin Teff into astrophysically standard ranges for stratification."""
    if pd.isna(teff) or teff <= 0:
        return "Teff_unknown"
    elif teff < 3900:
        return "M_dwarf"
    elif teff < 5300:
        return "K_dwarf"
    elif teff < 6000:
        return "G_dwarf"
    elif teff < 7300:
        return "F_dwarf"
    else:
        return "Hot_star"


def stratify_project_b(
    df: pd.DataFrame,
    seed: int = 42,
    test_ratio: float = 0.20,
    n_folds: int = 5,
    n_repeats: int = 5,
    min_test_per_stratum: int = 5
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Performs stratified group splitting for Project B.

    Required columns in df:
    - group_id: str
    - host_label_tier: str ('dynamically_anchored', 'statistically_validated',
                            'certified_false_positive', 'unresolved_candidate', 'no_b2_object')
    - mission: str ('Kepler', 'K2', 'TESS', 'None')
    - teff: float
    """
    df = df.copy()
    if "teff_bin" not in df.columns:
        df["teff_bin"] = df["teff"].apply(assign_teff_bin)

    # Aggregate to group_id level
    # Priority for host_label_tier: dynamically_anchored > validated > cert_fp > candidate > no_b2
    tier_priority = {
        "dynamically_anchored": 5,
        "statistically_validated": 4,
        "certified_false_positive": 3,
        "unresolved_candidate": 2,
        "no_b2_object": 1,
    }

    def agg_group(grp):
        # Best tier
        best_tier = max(grp["host_label_tier"].tolist(), key=lambda t: tier_priority.get(t, 0))
        # Most frequent mission
        mission = grp["mission"].mode()[0] if not grp["mission"].empty else "None"
        # Median Teff bin
        teff_med = grp["teff"].median()
        return pd.Series({
            "tier": best_tier,
            "mission": mission,
            "teff_bin": assign_teff_bin(teff_med),
            "n_hosts": len(grp)
        })

    group_df = df.groupby("group_id").apply(agg_group, include_groups=False).reset_index()

    # Form raw stratum
    group_df["stratum"] = (
        group_df["tier"].astype(str) + "___" +
        group_df["mission"].astype(str) + "___" +
        group_df["teff_bin"].astype(str)
    )

    rng = np.random.default_rng(seed)

    # Thin strata merging rule:
    # If a stratum has < (min_test_per_stratum / test_ratio) groups, merge Teff bin first, then mission
    min_total_required = int(np.ceil(min_test_per_stratum / test_ratio))

    stratum_counts = group_df["stratum"].value_counts().to_dict()
    merged_strata = {}

    for s, count in stratum_counts.items():
        if count < min_total_required:
            t, m, teff_b = s.split("___")
            # Step 1: Merge Teff bin -> 'Teff_merged'
            merged_strata[s] = f"{t}___{m}___Teff_merged"
        else:
            merged_strata[s] = s

    group_df["stratum_step1"] = group_df["stratum"].map(merged_strata)
    step1_counts = group_df["stratum_step1"].value_counts().to_dict()

    merged_strata_step2 = {}
    for s, count in step1_counts.items():
        if count < min_total_required:
            t, m, teff_b = s.split("___")
            # Step 2: Merge mission -> 'Mission_merged'
            merged_strata_step2[s] = f"{t}___Mission_merged___{teff_b}"
        else:
            merged_strata_step2[s] = s

    group_df["final_stratum"] = group_df["stratum_step1"].map(merged_strata_step2)

    # Perform stratified draw for test set (20%)
    group_df["role"] = "dev"
    test_groups = set()

    for st, sub in group_df.groupby("final_stratum"):
        g_list = sub["group_id"].to_numpy()
        rng.shuffle(g_list)
        n_test = int(np.round(len(g_list) * test_ratio))
        # Ensure at least 1 if stratum non-empty, but capped by total
        n_test = min(max(n_test, 1), len(g_list)) if len(g_list) >= min_test_per_stratum else n_test
        test_g = g_list[:n_test]
        test_groups.update(test_g)

    group_df.loc[group_df["group_id"].isin(test_groups), "role"] = "test"

    # Now assign repeated K-fold pseudo-folds to dev groups
    dev_mask = group_df["role"] == "dev"
    dev_groups = group_df.loc[dev_mask, "group_id"].to_numpy()

    # Generate repeat fold assignments
    for r in range(n_repeats):
        repeat_seed = seed + 1000 * (r + 1)
        r_rng = np.random.default_rng(repeat_seed)
        shuffled = dev_groups.copy()
        r_rng.shuffle(shuffled)
        fold_alloc = {g: (i % n_folds) for i, g in enumerate(shuffled)}
        group_df[f"fold_repeat_{r}"] = group_df["group_id"].map(fold_alloc).fillna(-1).astype(int)

    # Merge back to source dataframe
    merged = df.merge(
        group_df[["group_id", "final_stratum", "role"] + [f"fold_repeat_{r}" for r in range(n_repeats)]],
        on="group_id",
        how="left"
    )

    metadata = {
        "project": "Project_B",
        "seed": seed,
        "n_folds": n_folds,
        "n_repeats": n_repeats,
        "total_groups": len(group_df),
        "test_groups": len(test_groups),
        "dev_groups": len(group_df) - len(test_groups),
        "strata_counts": group_df.groupby(["final_stratum", "role"]).size().unstack(fill_value=0).to_dict()
    }

    return merged, metadata
