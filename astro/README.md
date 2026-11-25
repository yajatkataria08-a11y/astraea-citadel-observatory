# Exoplanet Quick-Look (B) & Sky Change Explorer (A) Pipelines

Production implementation of the scientific specification (**Revision 5, 9 November 2026**).

---

## 1. System Architecture & Build Order

$$\mathbf{B1} \longrightarrow \mathbf{B2} \longrightarrow \mathbf{A}$$

```
c:\astro\
├── config/
│   └── settings.yaml          # Seeds, thresholds, nside, bounds
├── src/
│   ├── common/                # Shared cross-cutting foundations
│   │   ├── id_crosswalk.py    # host_key vs group_id logic, match status
│   │   ├── splitting.py       # Group-disjoint stratified splitting (B) & spatial tiles (A)
│   │   └── inference.py       # Deterministic pseudo-fold assignment for inference
│   ├── project_b/
│   │   ├── b1_physics/        # Physics & Monte Carlo inference
│   │   │   ├── sampler.py     # Split-normal asymmetric error sampling (N=10,000)
│   │   │   ├── derived.py     # L*, a, eccentricity-averaged instellation S
│   │   │   ├── hz.py          # Kopparapu HZ (Conservative & Optimistic) with erratum
│   │   │   ├── composition.py # Rocky-compatible tiers (T1: Zeng, T2: Rogers logistic)
│   │   │   ├── forecaster.py  # Forecaster baseline & Quantile LightGBM with CV+ conformal
│   │   │   └── priority.py    # Joint Science Score & Follow-up Priority (TSM & ESM)
│   │   └── b2_vetting/        # Exoplanet candidate vetting
│   │       ├── labels.py      # 4 label tiers with strict target leakage removal
│   │       ├── models.py      # Logistic floor, LightGBM, Random Forest with cross-fitted calibration
│   │       ├── evaluation.py  # 3-track evaluation (Kepler, TESS, Kepler->TESS) with bootstrap CIs
│   │       ├── candidate_priority.py # Joint candidate priority with perturbed features
│       └── fine_tune_tess.py     # Cross-mission domain adaptation & TESS fine-tuning
│   └── project_a/             # SPHEREx Sky Change Explorer
│       ├── quarantine.py      # Stage 0 instrument/systematic quarantine
│       ├── variability.py     # Stage 1 M0/M1/M2 models, empirical null, sign-symmetry, FDR
│       ├── anomaly.py         # Stage 2 Probabilistic PCA residuals, Mahalanobis, Isolation Forest
│       ├── spectral_typing.py # Stage 3 Template SED matching (UCDs, YSOs, AGNs, AGBs)
│       ├── moving_objects.py  # Stage 4 Ephemeris matching (MOST) & rotational confound (SOLO)
│       ├── ranking.py         # Stage 5 Multi-evidence interestingness ranking & active learning
│       ├── injection_recovery.py # Stage 6 Synthetic signal injection validation (Recall @ 1% FPR)
│       └── pipeline.py        # Master 6-stage Project A discovery pipeline
└── tests/
    ├── test_hz_fixtures.py             # Unit tests for Tasks T9a/T9b (Kopparapu erratum & solar anchors)
    ├── test_splitting_and_crosswalk.py # Crosswalk resolution & leakage-free group-disjoint splits
    ├── test_end_to_end_ml.py           # Full end-to-end ML test suite
    ├── test_10_models_benchmark.py     # Comparative 10-model benchmark
    ├── test_tess_finetune.py           # Cross-mission TESS fine-tuning evaluation
    └── test_project_a_pipeline.py      # Full 6-stage Project A pipeline verification
```

---

## 2. Running Tests

Run the test suite:
```powershell
python tests/test_hz_fixtures.py
python tests/test_splitting_and_crosswalk.py
python tests/test_end_to_end_ml.py
python tests/test_10_models_benchmark.py
python tests/test_tess_finetune.py
python tests/test_project_a_pipeline.py
```
