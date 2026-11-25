"""
test_lightcurve_vetting.py - Verifies Astrophysical Light Curve Tests & TabPFN Benchmark

Specification Reference: §1.3, §2.6, Project B2 Roadmap
- Student's t-test odd-even transit depth consistency (Eclipsing Binary detection)
- Secondary occultation search (Thermal/Secondary eclipse detection)
- Difference-image centroid shift tripwire test (Background EB blend test)
- TabPFN tabular foundation model instantiation and score consistency
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from src.project_b.b2_vetting.lightcurve_vetting import (
    compute_odd_even_transit_depth_test,
    search_secondary_eclipse,
    compute_difference_image_centroid_tripwire
)
from src.project_b.b2_vetting.models import get_base_model, MODEL_CATALOG


def test_planet_lightcurve():
    # 1. Genuine Planet Simulation
    t = np.linspace(0, 30, 3000)
    period = 3.2
    epoch = 1.0
    dur = 2.4
    phase = ((t - epoch + 0.5 * period) % period) / period - 0.5
    in_tr = np.abs(phase) < (dur / 24.0 / period) / 2.0

    flux = np.ones_like(t)
    flux[in_tr] -= 0.003 # 3000 ppm transit depth
    flux += np.random.normal(0, 0.0002, size=len(t))

    res_oe = compute_odd_even_transit_depth_test(t, flux, period, epoch, dur)
    res_sec = search_secondary_eclipse(t, flux, period, epoch, dur)
    res_cen = compute_difference_image_centroid_tripwire(0.05, 0.04, sigma_threshold=3.0)

    assert not res_oe["is_odd_even_eb"], f"Genuine planet falsely flagged as EB: t={res_oe['t_statistic']}"
    assert not res_sec["has_secondary_eclipse"], f"Genuine planet falsely flagged with secondary: ratio={res_sec['secondary_ratio']}"
    assert not res_cen["is_quarantined"], f"Genuine planet falsely quarantined: sigma={res_cen['centroid_sigma']}"
    print("[PASS] Genuine Planet Light Curve Diagnostics Verified")


def test_eclipsing_binary_lightcurve():
    # 2. Eclipsing Binary Simulation (Alternating odd and even depths)
    t = np.linspace(0, 30, 3000)
    period = 3.2
    epoch = 1.0
    dur = 2.4
    phase = ((t - epoch + 0.5 * period) % period) / period - 0.5
    in_tr = np.abs(phase) < (dur / 24.0 / period) / 2.0
    t_num = np.floor((t - epoch + 0.5 * period) / period).astype(int)

    flux = np.ones_like(t)
    odd_mask = in_tr & (t_num % 2 == 1)
    even_mask = in_tr & (t_num % 2 == 0)

    flux[odd_mask] -= 0.040  # 4.0% primary eclipse
    flux[even_mask] -= 0.015 # 1.5% secondary eclipse
    flux += np.random.normal(0, 0.0003, size=len(t))

    res_oe = compute_odd_even_transit_depth_test(t, flux, period, epoch, dur)
    assert res_oe["is_odd_even_eb"], f"Eclipsing binary missed by odd-even test: t={res_oe['t_statistic']}"
    assert res_oe["t_statistic"] > 5.0, f"Expected strong t-stat for EB, got {res_oe['t_statistic']}"
    print(f"[PASS] Eclipsing Binary Caught: Odd-Even t-statistic = {res_oe['t_statistic']:.2f} > 3.0sigma")


def test_secondary_eclipse_detection():
    # 3. Secondary Eclipse Simulation at Phase 0.5
    t = np.linspace(0, 30, 3000)
    period = 4.0
    epoch = 1.0
    dur = 3.0
    phase = ((t - epoch + 0.5 * period) % period) / period - 0.5
    dur_phase = (dur / 24.0 / period) / 2.0

    flux = np.ones_like(t)
    pri_tr = np.abs(phase) < dur_phase
    sec_tr = np.abs(np.abs(phase) - 0.5) < dur_phase

    flux[pri_tr] -= 0.020 # Primary
    flux[sec_tr] -= 0.008 # Secondary
    flux += np.random.normal(0, 0.0002, size=len(t))

    res_sec = search_secondary_eclipse(t, flux, period, epoch, dur)
    assert res_sec["has_secondary_eclipse"], "Secondary occultation missed"
    assert res_sec["secondary_ratio"] > 0.20, f"Expected significant secondary ratio, got {res_sec['secondary_ratio']}"
    print(f"[PASS] Secondary Eclipse Caught: Depth = {res_sec['secondary_depth_ppm']:.0f} ppm (ratio = {res_sec['secondary_ratio']*100:.1f}%)")


def test_centroid_shift_quarantine():
    # 4. Centroid Shift Tripwire
    res_clean = compute_difference_image_centroid_tripwire(0.08, 0.04, sigma_threshold=3.0)
    assert not res_clean["is_quarantined"]
    assert np.isclose(res_clean["centroid_sigma"], 2.0)

    res_blend = compute_difference_image_centroid_tripwire(0.35, 0.05, sigma_threshold=3.0)
    assert res_blend["is_quarantined"]
    assert np.isclose(res_blend["centroid_sigma"], 7.0)
    assert "Background EB blend" in res_blend["reason"]
    print(f"[PASS] Centroid Shift Tripwire: Clean = {res_clean['centroid_sigma']:.1f}sigma, Blend = {res_blend['centroid_sigma']:.1f}sigma (Quarantined)")


def test_tabpfn_model_interface():
    # 5. TabPFN Model Instantiation and Scoring
    assert "tabpfn" in MODEL_CATALOG, "TabPFN must be cataloged in MODEL_CATALOG as per spec §0"
    model = get_base_model("tabpfn", seed=42)

    X_dummy = np.random.normal(0, 1, size=(60, 8))
    y_dummy = (X_dummy[:, 0] + X_dummy[:, 1] > 0).astype(int)

    model.fit(X_dummy, y_dummy)
    probs = model.predict_proba(X_dummy)[:, 1]
    assert len(probs) == 60
    assert np.all((probs >= 0.0) & (probs <= 1.0))
    print(f"[PASS] TabPFN Benchmark Model Verified: {type(model).__name__} (Probability range: [{probs.min():.3f}, {probs.max():.3f}])")


def main():
    print("=" * 78)
    print("ASTRAEA OBSERVATORY: ASTROPHYSICAL LIGHT CURVE & TABPFN TEST SUITE")
    print("=" * 78)

    test_planet_lightcurve()
    test_eclipsing_binary_lightcurve()
    test_secondary_eclipse_detection()
    test_centroid_shift_quarantine()
    test_tabpfn_model_interface()

    print("=" * 78)
    print("[SUCCESS] All astrophysical vetting tripwires and TabPFN verified!")


if __name__ == "__main__":
    main()
