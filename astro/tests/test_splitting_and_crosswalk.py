"""
test_splitting_and_crosswalk.py - Validation of Crosswalk and Splitting Protocol

Specification Reference: §1.1, §1.2, §2.6
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
from src.common.id_crosswalk import (
    IdentityLink,
    MatchStatus,
    ConflictType,
    resolve_crosswalk
)
from src.common.splitting import stratify_project_b, hash_assign_fold
from src.common.inference import get_pseudo_fold
from src.project_b.b2_vetting.evaluation import run_track3_leakage_filter


def test_id_crosswalk_logic():
    # Scenario:
    # Star 1: TIC 1234, certain match -> host_key = 'TIC_1234'
    # Star 2: TIC 1234, certain match -> merges to 'TIC_1234'
    # Star 3: TIC 5678, ambiguous match to Star 1's KIC -> separate host_key, but SAME group_id
    # Star 4: Unresolved -> isolated group_id, flagged exclude_from_headline
    links = [
        IdentityLink(
            hostname="Star A",
            tic_id="1234",
            kic_id="9999",
            match_status=MatchStatus.CERTAIN
        ),
        IdentityLink(
            hostname="Star A alias",
            tic_id="1234",
            kic_id="9999",
            match_status=MatchStatus.CERTAIN
        ),
        IdentityLink(
            hostname="Star B",
            tic_id="5678",
            kic_id="9999",  # shares KIC ambiguously
            match_status=MatchStatus.AMBIGUOUS,
            conflict_type=ConflictType.ONE_ALIAS_MULTI_TIC
        ),
        IdentityLink(
            hostname="Star C",
            tic_id="7777",
            match_status=MatchStatus.UNRESOLVED,
            conflict_type=ConflictType.UNRESOLVED_DISCREPANCY
        )
    ]

    df = resolve_crosswalk(links)

    # 1. Star A and Star A alias share host_key
    assert df.loc[0, "host_key"] == "TIC_1234"
    assert df.loc[1, "host_key"] == "TIC_1234"

    # 2. Star B has distinct host_key (ambiguous match, unmerged identity)
    assert df.loc[2, "host_key"] != df.loc[0, "host_key"]

    # 3. But Star A and Star B share the SAME group_id (leakage prevention unit)
    assert df.loc[0, "group_id"] == df.loc[2, "group_id"]

    # 4. Star C (unresolved) must be excluded from headline metrics
    assert bool(df.loc[3, "exclude_from_headline"]) is True
    assert df.loc[3, "group_id"] != df.loc[0, "group_id"]


def test_project_b_stratified_group_split():
    # Generate synthetic catalog of 200 hosts across 100 group_ids
    rng = np.random.default_rng(42)
    records = []
    tiers = ["dynamically_anchored", "statistically_validated", "certified_false_positive", "no_b2_object"]
    missions = ["Kepler", "TESS", "K2"]

    for i in range(100):
        gid = f"GRP_{i:04d}"
        tier = rng.choice(tiers)
        mission = rng.choice(missions)
        teff = float(rng.uniform(3000, 6500))
        # 1 to 3 hosts per group
        n_hosts = rng.integers(1, 4)
        for h in range(n_hosts):
            records.append({
                "host_key": f"HOST_{i}_{h}",
                "group_id": gid,
                "host_label_tier": tier,
                "mission": mission,
                "teff": teff
            })

    catalog = pd.DataFrame(records)
    split_df, meta = stratify_project_b(catalog, seed=42, test_ratio=0.20, n_folds=5, n_repeats=5)

    # 1. Group-disjoint assertion: no group_id is in both test and dev
    test_groups = set(split_df[split_df["role"] == "test"]["group_id"])
    dev_groups = set(split_df[split_df["role"] == "dev"]["group_id"])
    assert len(test_groups.intersection(dev_groups)) == 0, "Test and dev must be group-disjoint!"

    # 2. Test ratio should be ~20% of groups
    total_groups = catalog["group_id"].nunique()
    test_share = len(test_groups) / total_groups
    assert 0.15 <= test_share <= 0.25, f"Test share should be near 20%, got {test_share:.2f}"

    # 3. Check pseudo-fold reproducibility
    gid_sample = "GRP_0001"
    f1 = get_pseudo_fold(gid_sample, seed_r=1042, n_folds=5)
    f2 = get_pseudo_fold(gid_sample, seed_r=1042, n_folds=5)
    assert f1 == f2, "Pseudo-fold assignment must be deterministic"


def test_track3_kepler_tess_shared_group_removal():
    df_kepler = pd.DataFrame({
        "group_id": ["GRP_1", "GRP_2", "GRP_3"],
        "koi_name": ["K001", "K002", "K003"]
    })
    df_tess = pd.DataFrame({
        "group_id": ["GRP_3", "GRP_4", "GRP_5"],
        "toi_name": ["T003", "T004", "T005"]
    })

    f_kepler, f_tess = run_track3_leakage_filter(df_kepler, df_tess)

    # GRP_3 is present in both -> must be removed from both
    assert "GRP_3" not in f_kepler["group_id"].values
    assert "GRP_3" not in f_tess["group_id"].values
    assert len(f_kepler) == 2
    assert len(f_tess) == 2


if __name__ == "__main__":
    test_id_crosswalk_logic()
    test_project_b_stratified_group_split()
    test_track3_kepler_tess_shared_group_removal()
    print("All crosswalk and splitting protocol unit tests passed successfully!")
