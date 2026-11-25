"""
test_hz_fixtures.py - Unit Tests for Habitable Zone Fixtures and Erratum Investigation

Specification Reference: §2.3, Tasks T9a/T9b
Gate: Solar-system HZ unit test must verify Table 1 printed, Table 3 printed,
and erratum-corrected coefficients.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from src.project_b.b1_physics.hz import (
    compute_hz_edges,
    evaluate_hz_membership,
    KOPPARAPU_COEFFS_ERRATUM,
    KOPPARAPU_COEFFS_ORIGINAL,
    FIXTURE_SUN_TABLE1_AU,
    compute_seff
)


def test_teff_bounds_validity():
    """Teff = 2599 K and 7201 K must return not defined (valid_mask False, nan distances)."""
    teff = np.array([2599.0, 2600.0, 5780.0, 7200.0, 7201.0])
    lum = np.ones_like(teff)

    edges = compute_hz_edges(teff, lum)

    assert not edges["valid_mask"][0], "2599 K must be invalid / not defined"
    assert edges["valid_mask"][1], "2600 K must be valid"
    assert edges["valid_mask"][2], "5780 K (Sun) must be valid"
    assert edges["valid_mask"][3], "7200 K must be valid"
    assert not edges["valid_mask"][4], "7201 K must be invalid / not defined"

    assert np.isnan(edges["inner_conservative"][0])
    assert np.isnan(edges["outer_conservative"][4])


def test_sun_anchor_printed_and_computed_values():
    """
    Asserts solar fixtures (Teff = 5780 K, L = 1 L_sun):
    - Moist greenhouse inner edge ~ 0.99 AU
    - Recent Venus inner edge ~ 0.75 AU
    - Early Mars outer edge ~ 1.77 AU (approx 1.8 AU)
    - Maximum greenhouse erratum Table 3 coefficient gives ~1.689 AU,
      while Table 1 printed gave 1.67 AU (and S_eff = 0.3587 gives 1.670 AU).
    """
    teff = np.array([5780.0])
    lum = np.array([1.0])

    # Table 3 printed coefficients
    edges = compute_hz_edges(teff, lum, use_concordant_mg=False)

    d_moist = edges["inner_conservative"][0]
    d_mg_table3 = edges["outer_conservative"][0]
    d_rv = edges["inner_optimistic"][0]
    d_em = edges["outer_optimistic"][0]

    # Verify Moist Greenhouse ~ 0.99 AU (Table 1: 0.99, Table 3 computed: 0.993)
    assert np.isclose(d_moist, 0.993, atol=0.01), f"Moist greenhouse expected ~0.993 AU, got {d_moist}"

    # Verify Recent Venus ~ 0.75 AU
    assert np.isclose(d_rv, 0.750, atol=0.01), f"Recent Venus expected ~0.750 AU, got {d_rv}"

    # Verify Early Mars ~ 1.77 AU (~1.8 AU)
    assert np.isclose(d_em, 1.768, atol=0.02), f"Early Mars expected ~1.768 AU, got {d_em}"

    # Verify documented Table 3 printed MG: S_eff = 0.3507 -> sqrt(1 / 0.3507) ~ 1.6886 AU
    assert np.isclose(d_mg_table3, 1.6886, atol=0.005), f"Table 3 printed MG expected ~1.689 AU, got {d_mg_table3}"

    # Test the concordant single-digit slip hypothesis (S_eff = 0.3587 -> 1.670 AU)
    edges_concordant = compute_hz_edges(teff, lum, use_concordant_mg=True)
    d_mg_concordant = edges_concordant["outer_conservative"][0]
    assert np.isclose(d_mg_concordant, 1.670, atol=0.005), f"Concordant MG expected 1.670 AU, got {d_mg_concordant}"


def test_fails_on_uncorrected_table():
    """
    Specification requirement (§2.3):
    The coefficient test must FAIL if it matches the uncorrected 2013 original table.
    """
    teff = np.array([5780.0])
    seff_orig = compute_seff(teff, KOPPARAPU_COEFFS_ORIGINAL["maximum_greenhouse_original"])[0]
    d_orig = 1.0 / np.sqrt(seff_orig)  # Original gave 1.70 AU

    # Must be 1.70 AU, strictly different from erratum (1.67 or 1.689 AU)
    assert np.isclose(d_orig, 1.704, atol=0.01)

    seff_erratum = compute_seff(teff, KOPPARAPU_COEFFS_ERRATUM["maximum_greenhouse_table3_printed"])[0]
    assert not np.isclose(seff_orig, seff_erratum, atol=1e-3), "Erratum coefficients must differ from original"


if __name__ == "__main__":
    test_teff_bounds_validity()
    test_sun_anchor_printed_and_computed_values()
    test_fails_on_uncorrected_table()
    print("All Habitable Zone fixture unit tests passed successfully!")
