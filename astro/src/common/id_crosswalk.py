"""
id_crosswalk.py - Provenance, Identity Resolution and Crosswalk Management

Core principles from Pipeline Spec Revision 5, §1.1:
- host_key: Physical identity key, resolved through TIC ID (or normalized archive hostname).
            Merged ONLY on a 'certain' match.
- group_id: Split and grouping unit, defined as the connected component over all links
            with status in {'certain', 'probable', 'ambiguous'}.
- Never use a Gaia source ID as a group or hash key.
- Maintain id_crosswalk table:
    host_key, group_id, kic, epic, tic, hostname, gaia_dr2, gaia_dr3, gaia_dr4,
    match_method, match_status, conflict_type, match_date
- Unresolved hosts: flagged with 'identity_conflict', sent to review queue,
  excluded from headline rankings and test-set metrics (with sensitivity run including them).
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
import pandas as pd
import numpy as np


class MatchStatus(str, Enum):
    CERTAIN = "certain"
    PROBABLE = "probable"
    AMBIGUOUS = "ambiguous"
    UNRESOLVED = "unresolved"


class ConflictType(str, Enum):
    NONE = "none"
    ONE_ALIAS_MULTI_TIC = "one_alias_multi_tic"
    MULTI_TIC_SAME_STAR = "multi_tic_same_star"
    PROPER_MOTION_OR_CROWDING = "proper_motion_or_crowding"
    UNRESOLVED_DISCREPANCY = "unresolved_discrepancy"


@dataclass
class IdentityLink:
    hostname: str
    tic_id: Optional[str] = None
    kic_id: Optional[str] = None
    epic_id: Optional[str] = None
    gaia_dr2_id: Optional[str] = None
    gaia_dr3_id: Optional[str] = None
    gaia_dr4_id: Optional[str] = None
    match_status: MatchStatus = MatchStatus.PROBABLE
    conflict_type: ConflictType = ConflictType.NONE
    match_method: str = "archive_direct"
    match_date: str = "2026-11-09"


class UnionFind:
    """Disjoint Set Union (DSU) to compute connected components for group_id."""

    def __init__(self):
        self.parent: Dict[str, str] = {}

    def find(self, x: str) -> str:
        if x not in self.parent:
            self.parent[x] = x
        elif self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: str, y: str):
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x != root_y:
            # Deterministic ordering by alphabetical name
            if root_x < root_y:
                self.parent[root_y] = root_x
            else:
                self.parent[root_x] = root_y


def resolve_crosswalk(links: List[IdentityLink]) -> pd.DataFrame:
    """
    Builds the complete ID crosswalk with resolved host_key and group_id.

    Rules:
    1. host_key is physical identity:
       - If match_status == 'certain' and tic_id is present: host_key = f"TIC_{tic_id}"
       - Otherwise: host_key = normalized hostname.
    2. group_id is connected component across links with match_status in
       {'certain', 'probable', 'ambiguous'}.
       - Any star sharing an ambiguous, probable, or certain link shares the same group_id.
    3. Unresolved links remain in separate group_ids or isolated, flagged for review.
    """
    dsu = UnionFind()
    records = []

    for link in links:
        # Determine host_key
        if link.match_status == MatchStatus.CERTAIN and link.tic_id:
            host_key = f"TIC_{link.tic_id.strip()}"
        else:
            host_key = f"HOST_{link.hostname.strip().lower().replace(' ', '_')}"

        records.append({
            "host_key": host_key,
            "hostname": link.hostname,
            "tic_id": link.tic_id,
            "kic_id": link.kic_id,
            "epic_id": link.epic_id,
            "gaia_dr2_id": link.gaia_dr2_id,
            "gaia_dr3_id": link.gaia_dr3_id,
            "gaia_dr4_id": link.gaia_dr4_id,
            "match_status": link.match_status.value,
            "conflict_type": link.conflict_type.value,
            "match_method": link.match_method,
            "match_date": link.match_date,
            "exclude_from_headline": link.match_status == MatchStatus.UNRESOLVED,
        })

        # Connect entities in DSU for group_id if not unresolved
        if link.match_status in {MatchStatus.CERTAIN, MatchStatus.PROBABLE, MatchStatus.AMBIGUOUS}:
            node_host = f"H:{host_key}"
            dsu.find(node_host)
            if link.tic_id:
                node_tic = f"TIC:{link.tic_id.strip()}"
                dsu.union(node_host, node_tic)
            if link.kic_id:
                node_kic = f"KIC:{link.kic_id.strip()}"
                dsu.union(node_host, node_kic)
            if link.epic_id:
                node_epic = f"EPIC:{link.epic_id.strip()}"
                dsu.union(node_host, node_epic)
        else:
            # Unresolved: keep isolated
            dsu.find(f"H:{host_key}")

    df = pd.DataFrame(records)

    # Assign group_id from DSU representative
    def get_group(row):
        h = f"H:{row['host_key']}"
        root = dsu.find(h)
        return f"GRP_{root.replace(':', '_')}"

    df["group_id"] = df.apply(get_group, axis=1)

    # Diagnostics required by §1.1:
    # Report largest component size and number of groups formed through ambiguous links
    group_sizes = df.groupby("group_id")["host_key"].nunique()
    largest_component = group_sizes.max() if not group_sizes.empty else 0
    ambiguous_groups = df[df["match_status"] == MatchStatus.AMBIGUOUS.value]["group_id"].nunique()

    df.attrs["largest_component_size"] = int(largest_component)
    df.attrs["ambiguous_group_count"] = int(ambiguous_groups)
    df.attrs["match_status_counts"] = df["match_status"].value_counts().to_dict()

    return df
