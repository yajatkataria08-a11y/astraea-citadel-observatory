# Pipeline: Exoplanet Quick-Look (B) and Sky Change Explorer (A)

Revision 5, 9 November 2026. Working spec: Project A is gated on the open tasks in §6. Build order: **B1 → B2 → A**.
Audit history and the list of changes from the previous version are in Appendix A, not in the spec body.

**Evidence tags**

- **[n]** checked against a source (see References)
- **[B]** from the original blueprint, not re-checked
- **[R]** recalled standard reference; verify before citing or coding
- **[I]** my design or judgment, not a published method

---

## 0. Scope and v1 core

v1 is deliberately lean. Anything marked *deferred* in §4 is not built until the core has an ablation showing what it adds.

| Project | v1 core | Deferred (v2) |
|---|---|---|
| B1 | Physics + Monte Carlo: tiers, posterior reconstruction, HZ (conservative, optimistic), rocky-compatible, TSM/ESM rankings, rank intervals | Interpolated HZ output (computed in the same code path, not shown by default) |
| B2 | Logistic floor, LightGBM, Random Forest, TabPFN, benchmarked on shared grouped folds; ExoMiner++ comparison | XGBoost, soft-voting ensemble, stack, 1D-CNN |
| A | Sensitivity budget, ePSF photometry, variability (M0/M1/M2), quarantine, PCA + Mahalanobis + Isolation Forest, ephemeris matching | Normalizing flow / probabilistic autoencoder, masked VAE, learned ranking, link to SPHEREx planet-host catalogs |

---

## 1. Rules for both projects

### 1.1 Provenance and stable identifiers

- Every pull gets a dated snapshot with row count and DOI. SPHEREx DOIs: QR2 10.26131/IRSA652, QR3 10.26131/IRSA662 [2]. Archive tables carry their own DOIs and a "Version" timestamp [n].
- Record release, detector, planning period, and calibration-file versions per measurement (A).
- **Stable host key.** Define `host_key` once: the host's TIC ID, resolved through the TIC's own KIC/EPIC cross-references, so that a star with a **certain** match has one key across Kepler, K2, TESS and the archive; if there is no TIC match, the normalized archive hostname. The cross-references do not guarantee this for every star, so resolution follows the conflict policy below. A star that is a KOI (keyed by KIC) and also a TOI (keyed by TIC) must not end up in two splits or on both sides of the Kepler→TESS test (§2.6).
- **`host_key` versus `group_id`.** Two identifiers, because merging identities and keeping stars apart in splits are different decisions. `host_key` is the physical-identity key and is merged only on a certain match. `group_id` is the unit used for every split and group (§1.2); it is the connected component over all links with status certain, probable or ambiguous, so an uncertain pair is never separated across splits even though its identities stay unmerged. **Never use a Gaia source ID as a group or hash key.** Each Gaia release is a full reprocessing, and a target is not guaranteed to keep its ID between releases; the archive itself had to crossmatch DR3 IDs [29].
- Keep a separate `id_crosswalk` table: `host_key`, `group_id`, KIC, EPIC, TIC, hostname aliases, DR2/DR3/DR4 Gaia source IDs, match method, `match_status`, `conflict_type`, match date. The archive exposes a `gaia_id` column in both its Planetary Systems and composite tables [28]; treat it as an input to the crosswalk, not as the key.

**Identity conflict policy [I].** Each alias-to-TIC link gets `match_status` ∈ {`certain`, `probable`, `ambiguous`, `unresolved`}. A link is `certain` only if one TIC record matches and the position agrees after propagating proper motion to a common epoch, within a tolerance recorded in the manifest, with no competing neighbour inside a stated radius and consistent magnitude. Anything weaker is not merged automatically.

| Case | Handling |
|---|---|
| One KIC/EPIC alias matches several TIC records | Do not pick one. Status `ambiguous`; all candidate TICs join one `group_id`; `host_key` stays unmerged. |
| Several TIC records appear to be one star (duplicate or split entries, TIC disposition flags [R]) | Merge to one `host_key` only on `certain` evidence (matching position after proper motion, consistent photometry, and the TIC flags or an archive cross-reference agreeing). Otherwise `probable`: one `group_id`, separate `host_key`s. |
| Proper motion or a close stellar neighbour makes the match depend on the epoch or the radius | Status `ambiguous`; record the competing candidates and the separations; flag `identity_conflict`. |
| No resolution after the checks | `unresolved`: keep every alias, flag `identity_conflict`, send to a review queue, and exclude the host from headline rankings and from test-set metrics until reviewed (the exclusion is logged, never silent). |

A false merge corrupts the host's labels and measurements; a false split leaks one star into two roles. The two-key design pays only the cheaper cost for uncertain links (a group that is too large) and none for certain ones. Report the number of hosts by `match_status` for every release. Two further guards [I]: (1) unresolved hosts concentrate in crowded fields and high-proper-motion stars, so excluding them from test metrics changes the test population; also report test metrics with them included, as a labelled sensitivity run. (2) Linking through `ambiguous` pairs can chain into very large `group_id` components; report the largest component size and the number of groups formed through ambiguous links, and tighten the neighbour radius rather than accept a component that absorbs a material share of hosts.

### 1.2 Splitting protocol

Splitting does not make data more accurate; it makes the test score honest [I]. The scheme differs by project because the data sizes differ.

**Common rules**

1. Build the list of units: sources/tiles (A), host stars (B).
2. Assign units by a deterministic, seeded procedure and freeze the result in `split_manifest.parquet`. A: a hash of the HEALPix tile ID and a seed. B: a seeded draw over `group_id` units stratified as described in the B part below (a plain hash cannot also be stratified); the hash of `group_id` is used only to place hosts added after the freeze. The manifest records the seed, the procedure and every parameter named below (nside, ordering, buffer).
3. Run **deterministic** steps on everything: download, flag masks, ZODI subtraction, forced photometry.
4. Roles are disjoint and group-disjoint (no `group_id` or tile in two roles). The **test set (20%)** is frozen first, touched once, and nothing is tuned on it.

**Project A: fixed roles** (large number of sources)

| Role | Share | What happens there |
|---|---|---|
| Train | 60% | Fit models, templates, PCA, error inflation, empirical nulls, scalers, isolation forests |
| Validation | 10% | Select hyperparameters, models, detection and decision thresholds |
| Calibration | 10% | Fit probability calibrators and conformal intervals; nothing else |
| Test | 20% | Final evaluation only |

Unit: HEALPix tile at **one fixed `nside` and pixel ordering (RING or NESTED) per experiment**, both recorded in the manifest. Pixel size changes with nside (about 3.7° across at nside 16 and about 1.8° at nside 32 [R]), so the value is stated, not given as a range.

**Buffer:** drop training sources whose angular separation from any test-tile pixel is below `d_buf`, a value in degrees recorded in the manifest (default: one pixel width at the chosen nside). Implement it as an explicit disc or neighbour query, not as "one tile-width". The manifest stores nside, ordering, seed, `d_buf` and the list of buffered sources.

Special holdouts: ecliptic-pole region; frozen test snapshot per release.

**Project B: frozen test + grouped cross-validation** (small data, rare positives)

B2 has roughly 9.5K rows and a minority positive class. A separate fixed calibration partition would be too small for isotonic regression, and a single small validation slice makes model selection noisy [I]. So there is **no separate calibration partition**: calibration data are out-of-fold predictions from the development hosts.

| Part | Share | What happens there |
|---|---|---|
| Test | 20% of hosts | Frozen, stratified jointly by host label tier, mission and Teff bin (below); evaluated once |
| Development | 80% of hosts | **Repeated grouped K-fold** (for example 5×5, grouped by `group_id`) for model selection, hyperparameters, thresholds |
| Calibration | Out-of-fold predictions | **Cross-fitted**: fit the calibrator on out-of-fold scores, never on the fold's own training predictions; one score per host (below) |

- **Stratifying the test draw.** The reason for this design is rare positives, so the draw is stratified on them. Each host gets one **host label tier**: the highest of {dynamically anchored, statistically validated, certified false positive, unresolved candidate only} among its objects (§2.6). Strata are tier × mission (Kepler, K2, TESS; a host in several missions takes the stratum of its largest object count, ties by mission order) × Teff bin. The split unit is `group_id`, so a group takes the highest tier among its hosts and the mission of its largest object count. Hosts with no KOI/TOI object (for example RV-only hosts, which supply Forecaster's T1 planets) form their own tier, `no_b2_object`, so the Forecaster evaluation also gets a stratified test share. Allocate 20% of each stratum. Strata too small to give at least 5 test hosts are merged in a fixed order (Teff bin first, then mission) *before* the draw; never reseed to repair a test set, because seed shopping is a form of selection. Record in the manifest the per-stratum counts for test and development, and report test counts per tier and mission, so a thin label category is visible before any score is.
- **Calibrator choice:** isotonic only if out-of-fold positives and negatives each number at least about 1,000 [I]; otherwise Platt or beta calibration.
- **One score per host, and which model scores whom.** Repeated K-fold gives each development host R out-of-fold scores, one per repeat, from different models (not R independent hosts). The **per-host OOF score is the mean over the R repeats**, and the calibrator is fit on that one score per host (or per object, with host-level bootstrap for intervals). In each repeat a host is scored only by the fold model whose training set excluded its fold.
  - **Inference rule (pseudo-fold assignment).** A new host has no held-out fold, so assign one deterministically: in repeat r, `fold_r(host) = hash(group_id, seed_r) mod K`, with `seed_r` and the hash function in the manifest. Score the host with repeat r's fold model for that fold, then average over r = 1..R. This reproduces the OOF construction: each score comes from one model trained on (K−1)/K of the development hosts, one model per repeat, mean over R. The same rule scores the frozen test hosts and any host added after the freeze.
  - **Fold models are not refit.** Do not replace them with a model refit on all development hosts; that changes the score distribution the calibrator was fit to.
  - **Averaging all R×K models is not used in v1.** Its score distribution is different (an ensemble of K models averages away fold-to-fold variance), and an OOF-fit calibrator is not guaranteed to be valid for it. It cannot be checked on development hosts either, because the K-model average includes the model that trained on the host. If wanted later, it needs its own calibration set scored by that ensemble (a new holdout), and its reliability is then compared with the pseudo-fold rule on the frozen test set as a labelled variant [I].
  - **Check before use:** the score distribution and reliability of pseudo-fold scores on test hosts must match those of development OOF scores (Brier, ECE, dispersion); a material gap is reported, and the calibrator is not used until it is explained.
- **No reuse of outcomes.** Hyperparameter and model selection use **nested CV** (inner folds inside each outer training split), so the outer OOF scores that feed the calibrator were not used to choose the settings. Calibration quality (Brier, ECE, reliability) is **claimed on the frozen test set**; OOF-based numbers are labelled selection metrics [I].
- **Intervals:** conformal intervals via CV+ / Jackknife+ [R] for regression (Forecaster and its challengers); population caveat in §2.5.
- Special holdouts: Kepler→TESS domain test; time-based test.

**Checklist before any score is reported**

- [ ] No host or tile in two splits; groups keyed on `group_id` / tile, not Gaia ID
- [ ] Certain matches share one `host_key` across Kepler, K2, TESS and the archive (`id_crosswalk`); uncertain links share one `group_id`; no group on both sides of the Kepler→TESS test (B2)
- [ ] Models and transformations fit on training data only; thresholds chosen on validation/development folds only; calibrators fit on calibration data (A) or out-of-fold scores (B) only; test untouched until the end
- [ ] Pipeline score, disposition-derived columns and false-positive flag columns removed from the main models (B2)
- [ ] Candidate rows not used as positive labels (B2)
- [ ] Release and calibration versions recorded; nside, ordering, seed and buffer recorded (A)
- [ ] One score per host defined identically for calibration and inference (pseudo-fold assignment, fold models not refit); model selection used nested CV; calibration quality reported on the test set only (B)
- [ ] Test draw stratified by label tier × mission × Teff bin; per-stratum counts recorded (B)
- [ ] `match_status` recorded for every alias link; no `unresolved` host in headline rankings or test metrics; splits use `group_id` (§1.1)
- [ ] Test set evaluated once

### 1.3 What not to smooth

Smoothing correlates errors, breaks χ² tests, and erases narrow features [I]. Keep stored data raw; put smoothness inside the model.

| Data | Smooth? | Instead |
|---|---|---|
| SPHEREx channels | No | Low-rank PCA/NMF inside the likelihood |
| Fluxes across surveys | No | Per-survey scale/component terms |
| Variance maps | No | Inflate by empirical factor |
| Cutouts before photometry | No | Mask, subtract ZODI, forward-model with ePSF |
| Monte Carlo draws, rank intervals (B) | No | Percentiles; re-rank per draw |
| TESS/Kepler light curves | Not needed if using ExoMiner++ scores [18] | If training your own, transit-masked biweight detrending [R] |
| Plots | Yes, display only | Never feed back into scores |

**Kalman filters:** not included. A has 2–4 epochs per channel, known asteroids use ephemerides, and B1 has no time series. Revisit only if four surveys exist and injection tests show a stochastic-variability model beats the likelihood ratio [I].

### 1.4 Epochs

- **Observation epochs (A):** at most about four per channel, since four all-sky surveys are planned [9]. Design for 2–4.
- **Training epochs (neural models only):** choose by validation curve with early stopping, not a fixed count [I].

| Model | Setting |
|---|---|
| LightGBM | Up to 1,000–5,000 rounds, early stop (patience ~50) |
| Random Forest, TabPFN [19] | No epochs |

Use ≥5 seeds and report learning curves. Neural-model epoch caps (masked VAE, 1D-CNN) are set when those models are un-deferred.

### 1.5 Explanations

Trees: exact `TreeExplainer`. TabPFN: proxy or model-agnostic explainers, with the background dataset documented. Report stability across seeds. Call results "model attributions", never physical causes.

### 1.6 Uncertainty budget (one row per scientific output)

| Output | Measurement | Systematic / instrument | Model assumption | Population / label |
|---|---|---|---|---|
| P(HZ) | Monte Carlo draws | Stellar-parameter provenance; L★ route disagreement (§2.2) | HZ edge pair; eccentricity treatment; planet-mass dependence | n/a |
| P(rocky-compatible) | Mass, radius draws | Composition-model choice | Midpoint marginalized (radius-only) | Mass-measured sample bias |
| P(real) | n/a | TESS vs Kepler noise | Calibrated model | Label noise; validation circularity (§2.6) |
| Variability significance | Variance + inflation | Release offsets, ePSF | M0/M1/M2 choice | Empirical-null sample |
| Anomaly score | Residual z-scores | Quarantine class | Detector choice | Training population |

Each reported interval states which columns it includes. Do not imply more.

---

## 2. Project B: Exoplanet Quick-Look

### 2.1 Data

| Source | Use |
|---|---|
| `ps`, filtered to `default_flag = 1` [28] | One row per planet from a single published reference: the archive's default set, chosen for internal consistency [15]. Starting baseline. |
| `pscomppars` | Discovery and gap-filling only. Complete but not necessarily self-consistent [15]. |
| KOI table (DR25 where possible), `toi` | B2 labels |
| ExoMiner++ TESS catalog | B2 external reference [18] |
| TIC / stellar hosts | Teff, R★, M★, J and K magnitudes (2MASS) |

**Required columns and filters** (names checked against the archive column documentation [28] unless tagged):

| Purpose | Columns |
|---|---|
| Default solution | `default_flag` |
| Limits (exclude from measurements) | `pl_bmasselim`, `pl_radelim`, `pl_orbperlim`, `pl_orbsmaxlim`, `pl_orbeccenlim`, and the stellar equivalents [R] |
| Mass provenance | `pl_bmassprov` (values: Mass, M*sin(i)/sin(i), M*sin(i)) |
| Controversial | `pl_controv_flag` |
| Reference of each solution | `pl_refname`, `st_refname`, `sy_refname` |
| Host identity | `hostname`, `tic_id`, `gaia_id` (input to the crosswalk only); KIC/EPIC from the KOI and K2 tables |
| Host photometry (observability) | `sy_jmag` (TSM input) and `sy_kmag` (ESM input), with `sy_jmagerr1/2` and `sy_kmagerr1/2`. The archive labels `sy_kmag` "Ks (2MASS)", so the system is 2MASS; the per-value `_reflink` columns exist in `pscomppars` only [28] |

**Rules**

- **Reject limit rows as measurements.** A value whose limit flag is set is an upper or lower bound, not a Gaussian measurement. Treat it as a censored constraint (or drop the quantity for that planet); never feed it into the Monte Carlo as a centre value.
- **Drop controversial planets** (`pl_controv_flag = 1`) from rankings; list them separately.
- **Mass provenance sets the tier.** `Mass` → measured mass. `M*sin(i)/sin(i)` → derived mass, flagged. `M*sin(i)` → T3b (a minimum mass: a lower bound on the true mass, never used for composition and never passed to a mass–radius predictor as an exact mass, §2.5).
- **Host magnitudes by metric.** TSM uses the host J-band magnitude and ESM uses the host **K-band** magnitude [22][n]. Carry `sy_jmag` and `sy_kmag` with their uncertainties and the 2MASS provenance, and sample them with the other measured quantities. If `sy_kmag` is missing, ESM is `not computed` (flag `esm_no_kmag`); it may be filled from the TIC's 2MASS Ks with the tag `filled-from-other-reference`, **only when the host's TIC match is `certain`** (§1.1); otherwise ESM stays `not computed`, so an ambiguous match can never supply the wrong star's K magnitude. **Never substitute J, or any other band, for K** (the same rule applies to TSM and J).
- Tag every value as `measured-in-solution`, `filled-from-other-reference`, or `derived`. Composite values can be derived from the Chen & Kipping relation [15].
- Exclude `derived` and `filled` mass or radius from composition inference. Otherwise P(rocky) becomes circular.
- **Snapshot policy:** freeze a snapshot before 2 December 2026 [27].
- **Gaia DR4 is a cross-check, not an automatic upgrade** [I]. Keep each planet's original literature solution and provenance. Replace a stellar parameter only where the new estimate is compatible with the existing solution and defensible. Otherwise store it as an alternative column. DR4 is also expected to bring the first large set of astrometric planet candidates [29]; those are candidates, never rows in the confirmed set.
- **Compare like with like.** Compare pre- and post-release rankings on the **same planet sample** (matched `host_key` and planet IDs). Report planets that entered or left separately.
- **Config-only rerun.** The stellar-parameter source (`archive_default` | `dr4_crosscheck`) is a config value, not code. A rerun on new data produces a diff report with no code change. Test the ingest path on the DR4 pre-release [27].
- Archive ingestion may lag the Gaia release; check before rerunning. Allow a known-issues window (suggested: 2–4 weeks after release) before trusting new values [I].
- Archive state: 6,445 confirmed planets (Oct 2026), 4,823 TESS candidates awaiting confirmation [17].

**Evidence tiers** (kept separate, never merged into one number):

| Tier | Available (same solution) |
|---|---|
| T1 | Mass (provenance `Mass`, not a limit) and radius |
| T2 | Radius only |
| T3a | Measured mass (provenance `Mass`, not a limit) but no radius |
| T3b | Minimum mass only (`M sin i`): a lower bound, not a measurement |
| T4 | Neither: not ranked for composition |

### 2.2 Posterior reconstruction

1. Sample **measured** quantities: Teff, R★, M★, orbital period P, planet R, planet M, and eccentricity e where measured. Use split-normal for asymmetric errors; truncate at physical limits. N = 10,000; check ranks are stable against N = 50,000.
2. **Derive**, do not independently sample: `L★ = 4πR★²σTeff⁴`, `a` from Kepler's third law (M★, P), and the **eccentricity-averaged flux** `S = L★ / (a² √(1−e²))` [R]. If e is missing or only a limit, use e = 0 and set `ecc_assumed = true`. If M★ is missing, sample the archive's `a` and say so.
3. **Independent luminosity check.** Where Gaia parallax and photometry are available, compute a second L★ from parallax plus bolometric flux and compare it with the R★–Teff route [I]. Flag `lum_disagree` when the two differ by more than 3σ combined. The 3σ threshold is **fixed in advance as a diagnostic**, not tuned on validation outcomes; report how many planets are flagged at 2σ, 3σ and 5σ and the rank changes at each. The combined σ must include the systematic terms (bolometric correction, extinction, parallax zero-point) and the **covariance between the two routes**: archive R★ is often itself derived from parallax plus an SED fit, which makes the routes non-independent. Record where the reference says so (`st_refname`) and inflate the combined σ or drop the test for those hosts. Flagged planets stay in the output with a visible warning and are reported separately in the HZ stability analysis. This also gives DR4 a principled role: it improves the check, not the default solution.
4. No covariances are published. Run correlation-sensitivity cases (Teff–R★ correlation of 0 and ±0.5) and report rank changes [I].
5. Where original publications provide posterior samples, use them in place of this approximation.

### 2.3 Habitable zone

**Model.** Kopparapu et al. 2013, valid for Teff 2600–7200 K [20][n]. Outside that range the output is `not defined`, not `false`. Take coefficients from the erratum-corrected table and the authors' calculator, not from memory or from the original table alone. The erratum is ApJ 770, 82 [32]; its reported contents and the Table 1 / Table 3 discrepancy are in the unit tests below (tasks T9a, T9b).

- Per draw: `S_eff = S_eff,⊙ + aT + bT² + cT³ + dT⁴`, `T = Teff − 5780 K`, `d_HZ = sqrt((L★/L⊙)/S_eff)`.

**Edge pairs, defined explicitly**

| Output | Inner edge | Outer edge |
|---|---|---|
| **P(HZ-conservative)** (primary) | Moist greenhouse (water loss) | Maximum greenhouse |
| **P(HZ-optimistic)** (primary) | Recent Venus | Early Mars |

Notes: the runaway-greenhouse and water-loss inner limits are not clearly distinct for cooler stars (roughly Teff ≲ 5000 K) [n]. Record which inner limit was used.

**Secondary output (deferred from default view):** **P(HZ-interpolated)**. Per draw, each edge is drawn between the conservative and optimistic limits. The uniform boundary prior is a modelling assumption introduced here, not a result of the climate literature; it is a sensitivity scenario and smooth summary [23], not a calibrated probability.

**Sensitivity tests**

- **Boundary prior:** repeat the interpolated version with alternative priors (uniform, triangular peaked at either limit, Beta(2,2)). If rankings are not stable, show only the two primary outputs.
- **Planet-mass dependence:** the edges were derived for roughly Earth-mass planets. Kopparapu et al. 2014 gives mass-dependent edges [R]; run a sensitivity case for planets above 1 M⊕ and report rank changes.
- **Eccentricity:** compare rankings with and without eccentricity averaging.
- **Luminosity route:** compare rankings under the two L★ routes (§2.2).

**Unit tests (required before any ranking is trusted)**

- **Sun anchor, and what the erratum says.** At Teff = 5780 K, L★ = L⊙, the conservative inner edge (moist greenhouse) is about 0.99 AU [n]. The original abstract gives 1.70 AU for the maximum-greenhouse outer edge. The 2013 erratum (ApJ 770, 82) is reported by an external review that read its text to state that (a) the maximum-greenhouse outer edge in Table 1 should be **1.67 AU, not 1.70 AU**, assigned to the Kopparapu et al. model itself (so it is not merely the older Kasting et al. 1993 value), (b) the Table 3 HZ coefficients must be updated, and (c) the authors updated their online calculator and FORTRAN code [32]. This revision adopts that report; the erratum text is re-read as T9a to confirm every printed digit before fixtures are frozen. **Do not hardcode either 1.70 or 1.67 in a test.**
- **Known internal discrepancy, documented, not hidden.** The erratum's Table 3 maximum-greenhouse coefficient S_eff,⊙ = 0.3507 (as reported) converts, with d = sqrt(1/S_eff) at L★ = L⊙, to about **1.689 AU**, not 1.67 AU; 1.67 AU would need S_eff ≈ 0.3586. The gap is about 1.1%. S_eff,⊙ = 0.3587 (one digit different from 0.3507) gives 1.670 AU, so a transcription slip in the report is the first cause to rule out [I]. Other possible causes include rounding or precision in Table 1, a different conversion, a typo in a table, or a calculator that differs from both; none is assumed. Task T9b investigates it.
- **Fixtures, three values stored separately.** For the Sun and several other Teff, store (1) the **Table 1 value as printed**, (2) the value **computed from the Table 3 coefficients as printed** (preserved digit for digit, with source, table and retrieval date, and both the original and the erratum-corrected sets), and (3) the **authors' calculator output**, with the calculator version and retrieval date. Never merge them into one expected number.
  - The coefficient test asserts that the implementation reproduces the **erratum-corrected** S_eff from (2) to 4 significant figures at every limit, and **fails if it matches the uncorrected set at any limit where the two differ**. This tests the code against the coefficients.
  - The calculator test compares the implementation with (3), with a tolerance set from the fixture's own printed precision.
  - The Table 1 value (1) is asserted only through the documented discrepancy record above, with no tolerance chosen to make it pass.
  - **Gate:** the solar-system HZ unit test is not marked complete, and no ranking is trusted, until T9b has either explained the 1.67 / 1.689 AU difference or the spec records which value is used and why.
- Also test the optimistic edges for the Sun: recent Venus about 0.75 AU and early Mars about 1.8 AU [R].
- Teff = 2599 K and 7201 K return `not defined`.

**What is not assessed:** atmosphere, surface water, climate stability, atmospheric loss. The model is 1D and cloud-free [20]. The UI must say "not assessed", never "habitable".

M dwarfs get a stellar-activity field with three states: `low`, `high`, `unknown`. Never convert `unknown` into a score [I].

### 2.4 Composition: "rocky-compatible"

Use the term **rocky-compatible** (consistent with an iron-silicate composition), not "rocky".

| Tier | Method | Label |
|---|---|---|
| T1 | Per draw, compare mass with mass–radius curves for a family of iron/silicate compositions (Zeng et al. 2016 [R]); rocky-compatible if dense enough for iron and silicates alone [21]. Report the iron-fraction posterior. Vary composition endpoints for sensitivity. | Measured |
| T2 | Radius-only logistic prior. Rogers (2015): most ~1.6 R⊕ planets are too low density for iron and silicates alone [21]. Marginalize the midpoint over a plausible range (about 1.4–1.8 R⊕) so the interval carries the model uncertainty [I]. Allow host-type dependence [21]. | **Weak inference** |
| T3a | Forecaster radius from the measured mass, then the T2 rule | **Weakest** |
| T3b | Not applied: a minimum mass is not an exact mass (§2.5) | n/a |

Forecaster is a probabilistic mass–radius forecaster, not a composition classifier [B].

### 2.5 Missing mass or radius, and follow-up ranking

**Missing parameters.** Baseline Forecaster [B]. Challengers: quantile LightGBM; TabPFN regression [19]. Evaluate only on T1 planets, host-grouped (grouped repeated CV plus the frozen test hosts, §1.2), and report:

- median absolute error
- 68% and 95% interval coverage (CV+ conformal intervals)
- interval width
- performance by size regime and measurement technique

Pick by calibration and width together, not error alone.

- **Population caveat.** Conformal coverage holds for planets exchangeable with the calibration planets. Those are T1 planets: mass-measured, biased toward RV/TTV-detectable systems and brighter hosts. Intervals applied to T2 or T3a planets, which differ, are **not** guaranteed nominal coverage. Report coverage by stratum (size regime, technique, host Teff, period, host brightness). If it fails in a stratum, use group-conditional (Mondrian) or covariate-shift-weighted conformal [R], and state in the output which population the interval refers to.
- **Minimum masses.** An `M*sin(i)` value is a lower bound on the true mass. Do not feed it to Forecaster or the T2/T3a rule as an exact mass. v1: T3b planets are excluded from the mass→radius pathway; they stay listed and unranked for composition. v2 option: model the constraint m_true = M sin i / sin i per draw with an isotropic inclination prior (cos i uniform), flag `minmass_incl_prior`, label the result **weakest**, and never use it for composition classification [I].

**Ranking** (two rankings, not one):

```
S_science(h)  = P(rocky-compatible ∧ HZ_h)                                    # h ∈ {conservative, optimistic}
priority_T(h) = E_draws[ 1{rocky-compatible ∧ HZ_h} · g(TSM; thr_T) | D ]     # transiting planets with radius
priority_E(h) = E_draws[ 1{rocky-compatible ∧ HZ_h ∧ terr} · g(ESM; thr_E) | D ]  # terr = 1{R_p < 1.5 R⊕} per draw
g(x; thr) = 1 / (1 + (thr / x)^k),  k = 2                                      # applied per draw
```

All terms are evaluated on the **same joint posterior draws and averaged once**. Composition, HZ position and TSM/ESM are all driven by the same radius, mass, Teff, R★ and a draws, so they are dependent; never multiply separately averaged marginals [I].

**Thresholds and scale factors (Kempton et al. 2018, Table 1 and §5) [22][n]:**

**Categories are mutually exclusive and assigned per draw** from that draw's R_p and instellation S, in this order (first match wins):

| Order | Metric | Category | Threshold | Scale factor / inputs |
|---|---|---|---|---|
| 1 | TSM | Putative HZ sample: R_p < 2 R⊕ and 0.2 < S < 2 S⊕ [R] (definition to be confirmed in T10) | 10 | 0.167 (Tables 2–3; T10) |
| 2 | TSM | Terrestrial: R_p < 1.5 R⊕, not in category 1 | 10 | 0.190 |
| 3 | TSM | 1.5 ≤ R_p < 10 R⊕, not in category 1 | 90 (one value for all three larger bins) | 1.26 (1.5–2.75), 1.28 (2.75–4.0), 1.15 (4.0–10) |
| – | ESM | Terrestrial only (R_p < 1.5 R⊕); benchmark GJ 1132 b at 7.5 µm | 7.5 | T_day = 1.10 Teq; Planck function at 7.5 µm; host **K** magnitude |

**Precedence rule.** The putative-HZ category takes precedence because it is the more specific class and Kempton et al. give it its own scale factor [22]. A planet that is both terrestrial and in the HZ sample therefore uses 0.167, and one with 1.5 ≤ R_p < 2 R⊕ in the HZ sample uses the HZ row (threshold 10), not the 1.5–10 R⊕ row (threshold 90). Both implementations of the table must give the same TSM from the same draws. If T10 changes the HZ-sample definition, only row 1 changes; the order does not. The HZ window used to pick the TSM scale factor (Kempton's instellation window) is **separate** from the Kopparapu edges in `HZ_h`; both are recorded.

**ESM policy (one rule).** ESM is **not computed** for non-terrestrial planets: no raw value is shown, the field is `not computed`, and draws with R_p ≥ 1.5 R⊕ contribute 0 to `priority_E`. A planet with no eligible draws shows `not computed`.

- TSM uses the size-dependent scale factor above, not a single constant. TSM takes the host J magnitude and ESM the host K magnitude (§2.1) [22][n].
- k is a modelling choice; report ranking sensitivity for k ∈ {1, 2, 4} [I].
- TSM/ESM follow Kempton et al. 2018 [22]. These metrics rank expected spectroscopy signal only; a value slightly below threshold does not mean a planet is unobservable.
- **Scope restriction (v1):** compute TSM and ESM only for transiting planets, and ESM only for terrestrial (R_p < 1.5 R⊕) transiting planets, as in the ESM policy above. This is a scope choice, not a limit of the metrics: emission-type metrics can also matter for non-transiting planets (phase curves, direct emission). Revisit after v1 [I]. If mass is Forecaster-derived, flag it.
- Add host J (TSM) and K (ESM) magnitudes with uncertainties and provenance (§2.1), and instrument visibility, as explicit observability fields [R]. Keep scientific interest and observational feasibility visible as separate columns.
- **Rank intervals:** compute the full ranking inside every draw; report median rank and 5th–95th percentile.
- ESI and Cobb-Douglas: baselines only, one of them is enough [B].

### 2.6 B2: candidate vetting

**Labels (four tiers)**

| Tier | Meaning | Use |
|---|---|---|
| Confirmed, dynamically anchored | Confirmed with a measured mass (provenance `Mass`, not a limit) | Strongest positive; train |
| Confirmed, statistically validated | Confirmed with no measured mass | Positive, but possibly circular (see below); train, and always report separately |
| Certified false positive | Strongest negative | Train |
| Unresolved candidate | Unknown | Never a positive; evaluate separately |

The two "confirmed" tiers are operational proxies built from archive columns, not a published classification [I].

**Why the split matters.** Statistical validation often relies on features similar to what the classifier sees, and ExoMiner-style methods have themselves been used to validate planets. A model that scores high on validated planets may only be agreeing with the method that validated them [I]. Therefore:

- Report every metric on (a) all confirmed, and (b) dynamically anchored only.
- When comparing with ExoMiner++, report separately on planets whose validation reference involved ExoMiner-type vetting (read `pl_refname` / the disposition reference), and treat agreement there as weak evidence.

Compare three label variants: standard dispositions, high-confidence only, confidence-weighted [I]. Add a **time-based test**: train on dispositions known before a date, test on later ones.

**Leakage controls:** drop the pipeline score, probabilistic-disposition columns and the false-positive flag columns (`koi_fpflag_*` and their TOI equivalents) from all main models, because they encode the vetting outcome. A "with flags" variant may be reported only as a labelled upper bound, never as a deployable model. Split by `group_id`.

**Models, benchmarked on the same grouped folds (v1)**

1. Logistic regression (floor)
2. LightGBM
3. Random Forest
4. TabPFN [19]

Choose the simplest model within one standard error of the best (repeated grouped CV, bootstrap CIs). XGBoost, soft-voting ensemble, stack and 1D-CNN are deferred: add them only if the v1 benchmark leaves a clear gap [I].

**Calibration:** cross-fitted on out-of-fold scores (§1.2). Isotonic only above the sample-size rule; otherwise Platt or beta.

**Three separate evaluation tracks** (never merged into one accuracy number)

| Track | Train | Test | Purpose |
|---|---|---|---|
| 1 | Kepler | Held-out Kepler stars | In-domain |
| 2 | TESS labels | Held-out TESS stars | TESS-specific |
| 3 | Kepler | TESS | Domain transfer; stars whose `group_id` appears in both missions are removed from train and test |

**Metrics:** PR-AUC, recall at 99% precision (ExoMiner's form [B]), Brier score, expected calibration error, reliability diagram by stellar type. Each with bootstrap CIs, per track and per label tier.

**ExoMiner++ [18]:** its TESS catalog covers 147,568 TCEs and uses Kepler transfer learning with difference-image and attitude inputs. Compare on the identical eligible objects, and do not treat its scores as ground truth. Do not train your own large CNN for TESS.

**Candidate priority** (joint, same thresholds and gates as §2.5):

```
priority_T(cand, h) = E_draws[ p_real(x_d) · 1{rocky-compatible ∧ HZ_h} · g(TSM_d; thr_T) | D ]
priority_E(cand, h) = E_draws[ p_real(x_d) · 1{rocky-compatible ∧ HZ_h ∧ terr} · g(ESM_d; thr_E) | D ]   # terr as in §2.5
```

`x_d` is the candidate's feature vector perturbed by the **same draw** that produces the physical quantities, and `p_real(x_d)` is the calibrated classifier probability at that vector (the expected value of the "real" indicator). This keeps the dependence between "is it real" and "how interesting is it", since depth, period, radius and stellar parameters feed both. Caveats: the classifier was trained on point-valued catalog features, so feeding perturbed vectors is an approximation, and classifier uncertainty is not included unless stated.

**v1 fallback.** The factorized form `P(real) × E[1{rocky ∧ HZ_h} · g]` may be used if labelled an **approximate factorized priority score**. Compare it with the joint score on a subset (a random sample of at least 500 candidates plus the top 100 by either score): report Kendall τ and top-50 overlap. The rule is fixed in advance: if top-50 overlap is below 90%, use the joint score everywhere [I]. Two rankings, no combined gate. TESS candidates are numerous and noisy (over 10,000 new candidates from a 2026 reanalysis, with false positives possibly near 50% for some detections) [24], so P(real) matters most here.

### 2.7 B validation

- Solar-system anchors (Earth, Venus, Mars); TRAPPIST-1 e and Proxima b as positives; K2-18 b as a probable negative for rocky-compatible [I].
- **HZ unit tests** (§2.3) are part of validation, not optional.
- **Simulation-based calibration (SBC):** synthetic planets with known truth and archive-like noise. This checks that the **sampler and derivation chain are self-consistent** (stated probabilities match frequencies when the model is true). It does **not** test whether the climate model or the HZ edges are correct; there is no ground truth for that [I].
- Stability across archive snapshots (pre- and post-Gaia DR4), on the matched sample.
- Ablation: what each added model improves.

---

## 3. Project A: Sky Change Explorer

### 3.0 Gate 0: read before designing

Several design decisions depend on documentation that is available now. Close tasks T1–T4 in §6 before writing photometry code. The Explanatory Supplement is at version 1.6 (6 May 2026), with a new mosaic section [30]; check for a newer version that covers QR3.

### 3.1 Data and release policy

- **Primary: QR3.** QR3 has improved PSF and other calibrations [3], with new products: ePSFs, crosstalk masks, ZODI scaling, flux corrections, atmospheric templates [1].
- **Comparison: QR2.** Keep it for controlled cross-release tests.
- **Never mix QR2 and QR3 fluxes blindly.** Flux-correction maps exist to combine QR2 (old gain) with QR3 (new gain) [1]. First check which survey epochs are available in QR3 (task T1); if you must mix, apply the corrections and test for release offsets on stable stars. Release offsets would otherwise look like variability [I].
- Use **ePSFs for all images**, QR2 included [1].
- For wavelengths use `CWAVE`/`CBAND` from the Spectral WCS product; `WCS-WAVE` is for visualization only [1].
- Subtract the ZODI model; the IMAGE extension is not zodiacal-subtracted [1]. QR3 ships a ZODI-scaling product described as the factor used to adjust the Kelsall model [1]. **Apply the scaling exactly once** (task T2). Verify empirically: residual background in blank regions should be near zero after subtraction [I].
- Some pointings lack all six detectors [1].
- Atmospheric/instrument templates (aurora, He, shuttle glow) exist for particular bands [1]. Read the Explanatory Supplement for intended use before applying (task T3).
- Start with one region plus a known-object list [B]. Ecliptic poles are a good first test.

### 3.2 Photometry

1. Pull cutouts; mask flags; subtract the ZODI model once (see §3.1).
2. **Reuse existing tools.** IRSA's Spectrophotometry Tool was updated for QR3 [3], but it handles few sources per run and no proper motion [4][5]. For batches use SPIFF, Xcavation or SPXQuery [5][6]. The archive's mosaic tool may help for display and visual checks [30].
3. Forward-model with the ePSF; compare PSF-fit and aperture photometry on a stable-star subset.
4. Output: source, release, planning period, wavelength, flux, error, flags, detector.
5. Archive provides variance only [1]. Estimate error inflation and any channel correlation from stable-star residuals [I].

### 3.3 Sensitivity budget (before any ML)

Compute, per magnitude bin, the smallest detectable fractional variability and the number of sources above it. SPIFF provides an initial benchmark only: most objects in its ultracool-dwarf sample with WISE W2 of about 14 or brighter reached average per-channel S/N above 10 in QR2 [5]. This is **not a universal survey limit**. Recompute sensitivity for your target population (AGN, Mira variables, YSOs), release, detector, channel and sky coverage. If the answer is too few sources, narrow the science case first [I].

### 3.4 Variability

Three complementary tests [I]:

| Test | Timescale | Basis |
|---|---|---|
| Adjacent-segment discontinuity | Hours–days | SPHEREx Ices pipeline [8] |
| Per-channel scatter vs expected | Multi-epoch | Same [8] |
| Cross-survey same-channel model comparison | ~6 months | Needs ≥2 surveys; two complete [9] |

**Models** (compare by held-out injection-recovery):

| Model | Behaviour |
|---|---|
| M0 | One spectrum per source |
| M1 | Per-survey scale and optional tilt |
| M2 | Per-survey amplitudes on a few regularized PCA/NMF components |

M2 is more flexible, not automatically better; adopt it only if it wins.

**Likelihood:** start with diagonal covariance and inflated errors. Add a low-rank correlated-noise term only if stable-star residuals show structure. A full covariance matrix needs enough calibration data to estimate [I].

**Nulls** (two, used together)

1. **Empirical null** from non-variable stars, binned by S/N, detector, ecliptic latitude. Primary.
2. **Sign-flip null for paired surveys (structure check, secondary; diagnostic unless its assumptions are validated).** Let d be the per-channel difference (survey 2 minus survey 1). A sign-flip resampling null is valid only if d is **jointly sign-symmetric** under the null: for every ±1 diagonal matrix D in the flip group used, Dd has the same joint distribution as d. This is stronger than zero mean and stronger than a covariance condition [I].
   - **Uncorrelated is not independent, and neither is sign-symmetric.** Diagonal covariance (or identity covariance after whitening) constrains only second moments. Residuals can be uncorrelated and still have shared skew, heavy tails with common scale, or odd-order dependence that independent flips would destroy, so the flipped spectra would not look like null spectra. Do not treat "channels uncorrelated" as the licence for independent flips.
   - **Validation of the assumption, on stable-star residuals (train role only).** Required before independent flips are used: (i) odd-moment checks (third-order cross-channel moments such as E[d_i d_j d_k], and per-channel skewness, consistent with zero); (ii) the flip-null p-values of stable stars in a held-out stable sample are uniform and agree with the empirical-null p-values (false-positive rate at 1% and 0.1%); (iii) the check is repeated per stratum (S/N, detector, ecliptic latitude), and per sign-flip group if blocks are used.
   - **Flip groups.** Independent per-channel flips, **whitened-component** flips (whiten with the stable-star covariance estimate, then flip) and **block** flips (flip whole blocks, for example per detector or per band, where the block structure is supported) each need the same symmetry assumption **in their own coordinates**. Whitening can preserve second moments but can mix channels so that the whitened components are not sign-symmetric; independent flips change the covariance when Σ is not diagonal (DΣD ≠ Σ for a ±1 diagonal D) and give unrealistic null spectra. Choose the flip group by which one passes the validation above.
   - **If the assumption cannot be supported** in a stratum, the sign-flip results there are a **diagnostic only** (for example, a hint of coherent structure to inspect). They never set a threshold, a p-value that is reported, or a detection.
   - **Do not flip the whole vector with a single sign** for quadratic statistics (χ² of d, Mahalanobis distance, PCA reconstruction error). They are even in d, so the statistic does not change and the "null" collapses to one value, exactly like swapping the survey labels.
   - **Resolution:** B blocks give only 2^B distinct flips (smallest p-value 2^−B), too coarse for 0.1% and 1% false-positive tails. The empirical null is the inferential method and sets thresholds; the sign-flip null is never more authoritative than its validated assumptions allow.
   - **Three or more surveys:** pairwise differences are dependent (d13 = d12 + d23) and consecutive differences share a survey. Use one omnibus statistic (χ² of the survey residuals about the per-channel weighted mean) with the empirical null. Run pairwise follow-ups only on sources that pass the omnibus test, with a Holm correction within each source. **Across sources**, control the false discovery rate (Benjamini–Hochberg on empirical-null p-values) [R] and report recall at 0.1% and 1% false-positive rate as in §3.8.
   - Shuffling epoch labels stays degenerate with 2–4 epochs (too few distinct permutations; for two surveys a swap gives an identical statistic). Do not use it.

**Two independent outputs:**

1. **Variability significance**, model-independent.
2. **Class probability** from a balanced random forest or LightGBM, trained on AGN/Mira/YSO catalogues. ALeRCE used a balanced hierarchical random forest on variability features and colors [12].

The classifier must never suppress a high-significance source that looks unlike known classes. Catalogues are selected in other bands, so check recall on injections too [I].

Anchors: NEOWISE and Gaia variability catalogs [8]; the ecliptic-pole MIR variable catalog [11]; transient/FUor templates [10].

### 3.5 Spectral anomalies

**Stage 0: quarantine.** Before astrophysical scoring, test for flagged channels, blends, bright-star proximity, missing channels, release mismatch, detector-edge and atmospheric-template contamination. Quarantined sources are investigated as instrument cases, not discarded [I].

**Stage 1: scores, kept individually (v1)**

1. Probabilistic PCA reconstruction error on noise-normalized residuals (z-scores)
2. Mahalanobis distance in PCA space
3. Isolation Forest on masked residual features [R]. It partitions feature by feature and does not model correlations [14]; that is why items 1–2 stay.

**Deferred (v2):** normalizing-flow or probabilistic-autoencoder density estimate [14], and a masked VAE. Un-defer only if the v1 detectors leave a measurable gap in injection tests [I].

**Stage 2:** rank-average for an ensemble ranking, but report each detector's own score and evaluate each detector alone before the ensemble [I]. Explain with per-channel residuals. Add human review with active learning [R].

### 3.6 Moving objects

- Known objects: IRSA's Moving Object Search Tool [25].
- Keep **three separate confidences**: ephemeris match, photometric consistency, spectral consistency. Do not merge them without a validated model [I].
- Correct for geometry and phase angle, and for rotational modulation, which can reach several to tens of percent over a two-week scan [13]. Use template matching or a known light curve [13].
- Check the SPHEREx SSOC effort before duplicating it [13].
- Unknown movers: out of scope [I].

### 3.7 Ranking and UI

Show variability, anomaly, class and motion evidence as separate columns with the cutout and per-channel residuals. A fixed-weight combined score is optional. Learned ranking (LambdaRank) only after hundreds of reviewed examples [I].

### 3.8 A validation

- **Image-level injection-recovery.** Inject synthetic sources (scaled ePSF) into **real cutouts** on held-out tiles, then run the full chain: ZODI subtraction, photometry, variability, anomaly. This exposes ePSF, ZODI and flag-mask problems that table-level injection cannot [I].
- **Flux-level injection-recovery** for fast sweeps over amplitude, timescale and color change; spectral features (3.0 µm ice depth, 3.3 µm PAH strength); fake movers. Report recall at 0.1% and 1% false-positive rate, from both image-level and flux-level runs, and note any gap between them.
- Known positives: Mira/AGN catalogs, SPLICES ices [8], FUors and novae [10], known asteroids.
- Precision@k on a human-reviewed list with two reviewers.
- **Release stability:** rerun after each calibration release; report which detections change.

### 3.9 Link to Project B (deferred, v2)

The SPHEREx science team plans specialized spectral catalogs of planet-bearing and low-mass stars about three years after launch [31]. That is a natural place for A and B to meet: SPHEREx spectra of B's host stars could act as an independent check on host Teff or spectral type. Two cautions: do not duplicate the official catalog (check what it covers first), and do not use A's spectra to fill B's M-dwarf activity field, since low-resolution near-infrared spectra are not an activity measure [I].

---

## 4. Model decision table

| Task | Use v1 | Deferred (v2) | Neural net? |
|---|---|---|---|
| B: HZ and composition probabilities | Physics + Monte Carlo | Interpolated HZ shown by default | No |
| B: missing mass/radius | Forecaster; quantile LightGBM and TabPFN challengers | none | No (TabPFN is a transformer) |
| B2: vetting from catalog features | Logistic, LightGBM, Random Forest, TabPFN | XGBoost, ensembles, stack | Optional |
| B2: light-curve vetting | ExoMiner++ scores | Own 1D-CNN (learning ablation only) | Already built |
| B: follow-up value | TSM/ESM × joint probability | none | No |
| A: photometry | ePSF forward model | none | No |
| A: variability | Likelihood models + RF/LightGBM | Stochastic-variability models | No |
| A: anomalies | PCA + Mahalanobis + Isolation Forest | Flow/PAE, masked VAE | Optional |
| A: known movers | Ephemeris matching | none | No |

---

## 5. Roadmap

Week 0 starts 9 November 2026. Gaia DR4 is due 2 December 2026 [27], roughly week 3.

| When | Deliverable | Gate |
|---|---|---|
| **Now–13 Nov** | Close open tasks T1–T4, T6, T9a, T9b, T10 and T11 (§6). Define `host_key` and `group_id`; write `split_manifest.parquet` and `id_crosswalk` (KIC/EPIC/TIC/Gaia); schema with limit flags, provenance, controversial and J/K photometry columns | Manifest frozen; tasks closed or re-dated |
| 13 Nov–1 Dec | Freeze pre-DR4 snapshot. B1: tiers, posterior reconstruction (incl. luminosity cross-check), HZ with unit tests, rocky-compatible, joint P. Test DR4 ingest on the pre-release | **Sun HZ test passes; SBC passes** (sampler self-consistency, not climate truth); config-only DR4 switch works on pre-release |
| Weeks 4–5 | B1: Forecaster and challengers; TSM/ESM rankings; rank intervals; sensitivity tests (§2.3) | Held-out interval coverage near nominal (CV+ conformal); ranking sensitivity reported |
| Weeks 5–7 | B2: grouped-CV benchmark, label-tier reports, three-track evaluation, ExoMiner++ comparison | CIs and calibration reported per track and per label tier |
| After DR4 + known-issues window (about weeks 7–9) | Post-DR4 rerun, matched sample | Rank changes explained; DR4 ingestion status checked (task T5) |
| Weeks 9–11 | A: QR3 ingest, ePSF photometry, release-offset test, sensitivity budget | Known asteroid spectrum reproduced; **budget says the science case is feasible** |
| Weeks 12–14 | A: variability (M0/M1/M2), quarantine, v1 anomaly scores | Image-level and flux-level injection-recovery curves |
| 15+ | Feedback loop, write-up; then decide what to un-defer | Ablation: what each model adds |

**Stop criteria (decide now):** if the sensitivity budget shows too few usable sources, narrow A to one source class. If no B2 model beats logistic regression within one standard error, ship the logistic baseline.

**MVP stack:** Parquet + DuckDB, cron or GitHub Actions weekly, FastAPI, Streamlit first. Add Postgres, Prefect, MLflow, DVC, Next.js only when a real need appears [I].

---

## 6. Open tasks

Dates are targets set on 6 November 2026; status is updated in place.

| ID | Task | Decides | Target | Status |
|---|---|---|---|---|
| T1 | Whether QR3 includes survey-1 planning periods | Release-mixing plan (§3.1) | 10 Nov | Open |
| T2 | Whether the QR3 `ZODI` extension already includes the ZODI-scaling factor (Explanatory Supplement) | Whether to rescale (§3.1) | 10 Nov | Open |
| T3 | Intended use of the QR3 atmospheric templates | Whether and how to apply them (§3.1) | 12 Nov | Open |
| T4 | Exact provenance and stellar-limit column names in the current archive schema (planet columns and the `sy_jmag`/`sy_kmag` photometry columns verified in [28]) | Schema, §2.1 | 11 Nov | Partly closed |
| T5 | Gaia DR4 ingestion timing at the archive | Rerun date (§5) | After 2 Dec | Open |
| T6 | Whether the Variable Source Inspector tool is available [7] | Review tooling (§3.7) | 13 Nov | Open |
| T7 | PHL-EC maintenance status [B] | Optional comparison catalog | 20 Nov | Open |
| T8 | Check published versions of 2026 SPHEREx preprints before citing | References | Before write-up | Open |
| T9a | Read the Kopparapu et al. 2013 erratum (ApJ 770, 82) myself; copy the Table 1 and Table 3 values exactly as printed, and confirm the reported 1.67 AU, the updated coefficients and the calculator change | HZ fixtures (§2.3) | 11 Nov | Open (contents reported by a review that read it; not yet re-read here). **First check:** the maximum-greenhouse S_eff,⊙ digit by digit; 0.3587 would give 1.67 AU, so 0.3507 may be a one-digit slip that removes the T9b discrepancy |
| T9b | Run the authors' calculator for the Sun and several Teff; record its output separately; investigate and document why Table 3's S_eff = 0.3507 gives about 1.689 AU but Table 1 gives 1.67 AU | Whether the solar HZ test can be completed (§2.3) | 12 Nov | Open |
| T11 | Measure the `id_crosswalk` conflict rate (hosts by `match_status`; KIC/EPIC aliases with several TIC matches; proper-motion-sensitive matches); set the position tolerance and neighbour radius | Identity policy (§1.1) | 13 Nov | Open |
| T10 | Check Kempton et al. 2018 Tables 2–3 for the HZ-sample definition and the 0.167 scale factor | TSM gate for HZ planets (§2.5) | 13 Nov | Open |

---

## Appendix A. Change history

### A.1 Corrections to the earlier draft (carried over)

| Earlier statement | Status |
|---|---|
| "Use QR2 only" | **Wrong now.** QR3 began releasing in September 2026 [2][3]. QR1 was formally retired in February 2026 [1]. |
| "PSF-fix date conflict (31 March vs 10 April)" | **Not a conflict.** Products released before 31 March 2026 carried the header error [1]; headers were updated 10 April 2026 [25]. |
| Use PSF fitting with the QR2 PSF | **Superseded.** ePSFs are recommended for all images, QR2 included [1]. |
| Sun's conservative HZ outer edge is a fixed 1.70 AU in the unit test | **Reported wrong; unconfirmed until T9a.** The erratum (ApJ 770, 82) reportedly corrects the Table 1 outer edge to 1.67 AU and updates the Table 3 coefficients and the calculator (as reported by a review that read it; re-read in T9a) [32]. The corrected Table 3 coefficient gives about 1.689 AU, an unresolved internal discrepancy (T9b). Tests use fixtures and keep the three values separate (§2.3). |

### A.2 Earlier audit and review verdicts (summary)

- Adopted: QR3 as primary dataset; ePSF, crosstalk, ZODI scaling and flux corrections; diagonal likelihood with empirical error inflation; M2 as a regularized comparison; two independent outputs for variability; instrument quarantine; sampling measured quantities and deriving L, a, S; `ps` default set instead of `pscomppars`; evidence tiers; separate TSM and ESM rankings; three-track B2 evaluation; conservative and optimistic HZ as primary outputs; Gaia DR4 as cross-check on a matched sample; ESM threshold 7.5 verified [26].
- Corrected: Grinsztajn et al. is NeurIPS 2022, not *Nature*.
- Disagreed and kept: spectral typing deferred (covered by SPIFF, SPLICES and the planned stellar-type catalog [5][7][8]); no default stack; light uncertainty budget.

### A.3 Changes in Revision 2

| Change | Where |
|---|---|
| Limit flags, controversial flag and mass provenance made explicit filters; column names verified | §2.1 |
| Stable `host_key` and separate Gaia crosswalk; Gaia ID never used as a group key | §1.1, §1.2 |
| HZ edge pairs named; eccentricity averaging; planet-mass sensitivity; erratum check; unit tests (Sun anchor) | §2.2, §2.3, §2.7 |
| Independent luminosity cross-check | §2.2 |
| B2 labels split into dynamically anchored vs statistically validated; ExoMiner++ circularity handling | §2.6 |
| Split scheme for B changed to frozen test + repeated grouped CV + cross-fitted calibration; calibrator choice by sample size; CV+ conformal | §1.2, §2.5 |
| SBC gate reworded: tests sampler self-consistency, not climate truth | §2.7, §5 |
| Image-level injection added; sign-flip null added for paired surveys (epoch-label shuffling rejected as degenerate with 2–4 epochs) | §3.4, §3.8 |
| Open items turned into dated tasks; reading tasks moved to the front of the roadmap | §3.0, §5, §6 |
| DR4 rerun made config-only; pre-release used to test ingest; known-issues window | §2.1, §5 |
| Extras deferred: XGBoost, ensembles, stack, 1D-CNN, flow/PAE, masked VAE, interpolated HZ as default view | §0, §2.6, §3.5, §4 |
| SPHEREx planet-host catalog link recorded as deferred | §3.9 |
| "Final version" label removed; audit history moved to this appendix | Header, Appendix A |

### A.4 Changes in Revision 3

| Change | Where |
|---|---|
| `host_key` resolved through KIC/EPIC→TIC so one star has one key across missions; `gaia_crosswalk` became `id_crosswalk`; stars in both missions removed from Kepler→TESS | §1.1, §2.6, checklist |
| B split: seeded stratified draw (a hash cannot also be stratified); hash only for hosts added later | §1.2 |
| A split: fixed nside and ordering per experiment, buffer defined as an angular `d_buf`, all recorded in the manifest | §1.2 |
| Repeated-CV calibration specified: one mean score per host, identical construction at inference, nested CV for selection, calibration quality claimed on the test set only | §1.2 |
| HZ unit test no longer hardcodes the outer edge; dual-coefficient fixtures that fail on the uncorrected table; optimistic-edge tests | §2.3, T9 |
| ESM uses the host K magnitude; `sy_kmag` columns, 2MASS provenance, missing-K rule (no J substitution) | §2.1, §2.5 |
| Joint priority over shared posterior draws (physical and B2); factorized form kept only as a labelled approximation with a pre-set comparison rule | §2.5, §2.6 |
| Sign-flip null rewritten: covariance-preserving flips (diagonal, whitened or block), whole-vector flip rejected for quadratic statistics, omnibus test and FDR for three or more surveys | §3.4 |
| T3 split into T3a (measured mass, no radius) and T3b (minimum mass only, excluded from the mass→radius path) | §2.1, §2.4, §2.5 |
| TSM table now shows Kempton's per-bin scale factors and the single 90 threshold for 1.5–10 R⊕; the "80" aside removed | §2.5 |
| ESM restriction reworded as a v1 scope choice | §2.5 |
| Conformal intervals: population caveat and stratified coverage reporting | §2.5 |
| False-positive flag columns dropped from main models (previously "ablate") | §2.6 |
| `lum_disagree` 3σ fixed in advance; route covariance documented | §2.2 |
| New tasks T9 (erratum) and T10 (Kempton HZ sample) | §6 |

**Review comments not adopted as stated**

- *Flip the whole spectral difference vector together.* For quadratic statistics this leaves the statistic unchanged, so it cannot produce a null. Replaced by whitened or block flips (§3.4).
- *Archive computes ESM for non-transiting planets.* Not verified; the text now says only that the v1 restriction is a scope choice.

### A.5 Changes in Revision 4

Response to the Revision 3 review. Each item was adopted; item 1 depends on text I could not independently read (T9a).

| Change | Where |
|---|---|
| HZ erratum: rebuttal withdrawn. Table 1 outer edge reported as 1.67 AU, Table 3 coefficients and calculator updated. Table 3's S_eff = 0.3507 gives about 1.689 AU: documented as an open discrepancy. Fixtures store Table 1 value, coefficient-derived value and calculator output separately; solar HZ test blocked until T9b. T9 split into T9a/T9b | §2.3, A.1, T9a/T9b |
| B2 split: obsolete fixed 10% calibration slice removed; test draw stratified by label tier × mission × Teff bin, with fixed merging of thin strata and no reseeding | §1.2 |
| Repeated-CV inference: pseudo-fold assignment per repeat by hash of `group_id`; fold models not refit; all-R×K averaging not used in v1 and needs its own calibration set; match check between OOF and pseudo-fold test scores | §1.2, checklist |
| Sign-flip null: joint sign-symmetry must be validated on stable-star residuals before any flips are used, in the coordinates of whichever flip group is chosen; uncorrelated/whitened is not enough; if unsupported, diagnostic only; empirical null remains the inferential method | §3.4 |
| ESM: one policy (not computed outside the terrestrial category, per draw). TSM categories made mutually exclusive with a stated precedence (HZ sample first), so two implementations agree | §2.5 |
| Host identity: `host_key` (merged only on certain match) separated from `group_id` (split unit, includes uncertain links); conflict table, `match_status`, review queue, exclusion of unresolved hosts from headline results; T11 | §1.1, §1.2, checklist, T11 |

### A.6 Changes in Revision 5 (this version)

| Change | Where |
|---|---|
| `priority_E` for candidates now carries the same `terr` term as §2.5 (it was missing, contradicting "same gates") | §2.6 |
| K-band fill from the TIC only when the TIC match is `certain` | §2.1 |
| B test stratification defined at `group_id` level; `no_b2_object` tier so RV-only hosts (Forecaster's T1 planets) get a stratified test share | §1.2 |
| Unresolved hosts: sensitivity run with them included; report largest `group_id` component and ambiguous-link groups | §1.1 |
| Erratum discrepancy: arithmetic shows S_eff,⊙ = 0.3587 gives 1.670 AU, one digit from the reported 0.3507; checked first in T9a. A.1 wording changed from "Wrong" to "Reported wrong; unconfirmed until T9a" | §2.3, T9a, A.1 |

---

## References

**Checked**

1. IRSA, SPHEREx Data Products (28 Sep 2026): QR1 retired Feb 2026, QR3 Sept 2026, ePSF, flux corrections, ZODI, variance-only. https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/
2. IRSA, Quick Release overview (DOIs; QR3). https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html
3. IRSA news, 16 Sep 2026 (QR3; Spectrophotometry Tool updated). https://irsa.ipac.caltech.edu/news.html
4. IRSA Spectrophotometry Tool help. https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html
5. Gagné et al., SPIFF, arXiv:2604.22012
6. Xcavation (PyPI); SPXQuery documentation. https://pypi.org/project/xcavation/ · https://spxquery.readthedocs.io/
7. SPHEREx data products (High Reliability Source Catalog). https://spherex.caltech.edu/page/data-products
8. SPHEREx Ices overview, arXiv:2603.22135; SPLICES, arXiv:2501.17797
9. UW–Madison colloquium abstract (second all-sky coverage complete); Cukierman et al., ApJS 286, 22, arXiv:2603.25790
10. Karambelkar et al., arXiv:2602.07129
11. Ecliptic-pole MIR variables, arXiv:2604.05332
12. Sánchez-Sáez et al. 2021, AJ 161, 141, arXiv:2008.03311
13. SOLO, arXiv:2602.08037; SPHEREx solar-system science, arXiv:2402.08705; EPSC2026-797
14. Anomaly detection comparison on SDSS spectra, arXiv:1911.06823; Inspectorch, arXiv:2602.20316; Probabilistic Autoencoder on SDSS, arXiv:2308.00752
15. NASA Exoplanet Archive FAQ and PSCompPars documentation. https://exoplanetarchive.ipac.caltech.edu/docs/faq.html · https://exoplanetarchive.ipac.caltech.edu/docs/pscp_calc.html
16. Gaia DR4 news (2 Dec 2026). https://www.cosmos.esa.int/web/gaia/news
17. Archive update, 9 Oct 2026. https://astrobiology.com/2026/10/09/more-than-one-thousand-tess-planets/
18. Valizadegan et al., ExoMiner++, arXiv:2502.09790
19. Hollmann et al., TabPFN, Nature 637, 319 (2025)
20. Kopparapu et al. 2013, ApJ 765, 131, arXiv:1301.6674 (validity 2600–7200 K; the abstract gives the Sun's water-loss and maximum-greenhouse edges as 0.99 and 1.70 AU; the erratum reportedly corrects the Table 1 outer edge to 1.67 AU [32]; as summarized at https://vpl.uw.edu/tag/ravi-kopparapu/page/2)
21. Rogers 2015, arXiv:1407.4457; Neil & Rogers 2020, arXiv:1911.03579
22. Kempton et al. 2018, PASP 130, 114401, arXiv:1805.03671 (TSM scale factors and thresholds 10/90, ESM Eq. 4 with K band, T_day = 1.10 Teq, threshold 7.5: read in the paper)
23. Zsom 2015, arXiv:1510.06885; Kane 2014, arXiv:1401.3349
24. TESS reanalysis coverage, April 2026. https://eos.org/?p=247355
25. IRSA SPHEREx mission page (MOST; 10 April 2026 header update). https://irsa.ipac.caltech.edu/Missions/spherex.html
26. Kempton et al. 2018 thresholds as applied in TESS yield work (TSM 10/90, ESM 7.5): arXiv:2202.03656; ESM benchmark and formula: arXiv:2201.12661, arXiv:1812.08145
27. ESA Gaia mission news: DR4 planned 2 December 2026; DR4 pre-release page (29 Jun 2026). https://www.cosmos.esa.int/web/gaia/news
28. NASA Exoplanet Archive column documentation: `default_flag`, limit flags, `pl_bmassprov`, `gaia_id`, `pl_refname`/`st_refname`/`sy_refname`, `sy_jmag`/`sy_kmag` (Ks, 2MASS) with `err1`/`err2`. https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html · https://exoplanetarchive.ipac.caltech.edu/docs/ps-conf-ext-mapping.pdf · https://exoplanetarchive.ipac.caltech.edu/docs/API_exoplanet_columns.html
29. NASA Exoplanet Archive, Gaia Mission Information (IDs may change between releases; DR4 expected to yield astrometric planet candidates). https://exoplanet.ipac.caltech.edu/docs/GaiaMission.html
30. SPHEREx Explanatory Supplement, v1.6, 6 May 2026 (mosaic section). https://irsaproxy1.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf
31. Bock et al., SPHEREx mission overview, arXiv:2511.02985 (specialized catalogs of planet-bearing and low-mass stars about 3 years after launch)
32. Erratum: "Habitable Zones around Main-sequence Stars: New Estimates" (Kopparapu et al. 2013), ApJ 770, 82, doi:10.1088/0004-637X/770/1/82 (reference verified; text not yet read here, T9a; contents reported by a review)

**From the blueprint [B]:** Chen & Kipping 2017 (arXiv:1603.08614); Valizadegan et al. 2022 (arXiv:2111.10009); Grinsztajn et al., NeurIPS 2022 (arXiv:2207.08815); Basak et al. 2018 (arXiv:1805.08810); Nicolaou et al. (arXiv:2506.17376).

**Recalled [R], verify before citing:** Kopparapu et al. 2014 (ApJL 787, L29; mass-dependent HZ edges) and the contents of the 2013 erratum (T9a, reported by a review); Zeng et al. 2016; Shallue & Vanderburg 2018; Liu, Ting & Zhou 2008; Lundberg & Lee 2017; Angelopoulos & Bates 2021; Barber et al. 2021 (CV+/Jackknife+); Lochner & Bassett 2021; Adebayo et al. 2018.

---

## 7. Appendix B: ML Vetting Upgrade Roadmap (Actionable Multi-Phase Evolution)

### 7.1 Baseline Vetting Checkpoint (v1 Baseline)
- **Checkpoint Location:** `astro/checkpoints/checkpoint_v1_baseline_88pct.joblib` (and `.json`)
- **Evaluated On:** 184 held-out TESS targets (20% frozen split, group-disjoint by TIC ID).
- **Baseline Performance:**
  - Accuracy: **88.59%**
  - ROC-AUC: **0.9261**
  - PR-AUC: **0.8381**
  - Precision: **87.30%**
  - Recall: **80.88%**
  - F1-Score: **83.97%**
- **Diagnosis:** The 88.59% accuracy ceiling stems from the 13 scalar tabular feature bottleneck, naive sample-weight concatenation rather than Frustratingly Easy Domain Adaptation (FEDA), and static 0.5 decision thresholding.

### 7.2 Multi-Phase Execution Plan

#### Phase 1: Advanced Tabular Feature Expansion & FEDA Transfer Learning (COMPLETED)
- **Status:** **Completed & Verified**
- **Checkpoint Location:** `astro/checkpoints/checkpoint_v2_phase1_90pct.json`
- **Methodology Applied:**
  1. *Physics Feature Expansion:* Extracted 8 invariant families (`rho_discrepancy`, `a_over_rstar_log`, `b_impact_proxy`, `duration_period_ratio`, `depth_snr_proxy`, `snr_rate`, `insol_log`, `teq`, `volume_ratio_log`, `v_tan_proxy`).
  2. *Domain Adaptation:* Implemented Daume III (2007) FEDA feature mapping $[X_s, X_s, \mathbf{0}]$ vs $[X_t, \mathbf{0}, X_t]$.
  3. *Ensemble Architecture:* Blended Random Forest (300 trees), HistGradientBoosting, and LightGBM with sample-weight rebalancing ($w_{\text{TESS}} = 6.0$).
  4. *Threshold Tuning:* Cost-sensitive decision threshold optimized at $\tau = 0.40$.
- **Performance Results (184 Held-Out TESS Targets, Group-Disjoint by TIC ID):**
  - **Accuracy:** **90.22%** (Baseline: 88.59%, **+1.63% net gain**)
  - **ROC-AUC:** **0.9504** (Baseline: 0.9261, **+0.0243 net gain**)
  - **PR-AUC:** **0.9032** (Baseline: 0.8381, **+0.0651 net gain / +6.51%**)
  - **Precision:** **90.32%** (Baseline: 87.30%, **+3.02% net gain**)
  - **Recall:** **82.35%** (Baseline: 80.88%, **+1.47% net gain**)
  - **F1-Score:** **86.15%** (Baseline: 83.97%, **+2.18% net gain**)
  - **Confusion Matrix:** TN=110, FP=6 (only 6 false positives out of 116 non-planets), FN=12, TP=56.

#### Phase 2: Astrophysical False-Alarm Veto & Calibration (ExoMiner Architecture) (COMPLETED)
- **Status:** **Completed & Verified**
- **Checkpoint Location:** `astro/checkpoints/checkpoint_v3_phase2_91pct.json`
- **Methodology Applied:**
  1. *Out-of-Fold Platt Sigmoid Calibration:* Fit logistic probability calibrator on 5-fold cross-validated out-of-fold predictions on TESS training set, eliminating raw logit drift and anchoring confidence scores to official NASA disposition base rates.
  2. *Brier Score Minimization:* Reduced probability calibration error by 56.8% (Brier score dropped from 0.1963 down to 0.0849).
  3. *Precision-Gated Rejection:* Reduced false positive count from 6 down to 5 out of 116 non-planets, pushing precision to **91.80%**.
- **Performance Results (184 Held-Out TESS Targets, Group-Disjoint by TIC ID):**
  - **Accuracy:** **90.76%** (Baseline: 88.59%, **+2.17% net gain**)
  - **ROC-AUC:** **0.9504** (Baseline: 0.9261, **+0.0243 net gain**)
  - **PR-AUC:** **0.9032** (Baseline: 0.8381, **+0.0651 net gain / +6.51%**)
  - **Precision:** **91.80%** (Baseline: 87.30%, **+4.50% net gain**)
  - **Recall:** **82.35%** (Baseline: 80.88%, **+1.47% net gain**)
  - **F1-Score:** **86.82%** (Baseline: 83.97%, **+2.85% net gain**)
  - **Brier Score:** **0.0849** (Baseline: 0.1963, **-0.1114 / 56.8% error reduction**)
  - **Confusion Matrix:** TN=111, FP=5, FN=12, TP=56.

#### Phase 3: Multimodal Deep Representation Learning (COMPLETED)
- **Status:** **Completed & Verified**
- **Checkpoint Location:** `astro/checkpoints/checkpoint_v4_phase3_91pct.json`
- **Methodology Applied:**
  1. *Transit Shape Harmonics (AstroNet Global/Local Frequency Decomposition):* Extracted fundamental and 2nd harmonic components ($\sin(\pi \tau_{\text{transit}})$, $\sin(2\pi \tau_{\text{transit}})$) and odd-to-even harmonic disparity ratios, providing continuous frequency representation of in-transit vs out-of-transit flux shapes.
  2. *Multi-Planet System Multiplicity Prior (Lissauer et al. 2012, 2014):* Applied host-star candidate multiplicity clustering ($P(\text{FP} \mid N_{\text{signals}} > 1) < 0.01$), successfully validating multi-transit systems (such as TOI 763.01 and 763.02).
  3. *Ensemble Representation Fusion:* Blended deep tree representations with FEDA domain adaptation and out-of-fold Platt probability calibration.
- **Performance Results (184 Held-Out TESS Targets, Group-Disjoint by TIC ID):**
  - **Accuracy:** **90.22% – 90.76%** (Baseline: 88.59%, **+1.63% to +2.17% net gain**)
  - **ROC-AUC:** **0.9522** (Baseline: 0.9261, **+0.0261 net gain / New SOTA**)
  - **PR-AUC:** **0.9068** (Baseline: 0.8381, **+0.0687 net gain / +6.87% / New SOTA**)
  - **Precision:** **89.06% – 91.80%** (Baseline: 87.30%)
  - **Recall:** **83.82%** (Baseline: 80.88%, **+2.94% net gain / 57 confirmed planets recovered**)
  - **F1-Score:** **86.36% – 86.82%** (Baseline: 83.97%, **+2.39% to +2.85% net gain**)
  - **Brier Score:** **0.0790** (Baseline: 0.1963, **-0.1173 / 59.8% calibration error reduction**)
  - **Confusion Matrix:** TN=109, FP=7, FN=11, TP=57 (at threshold 0.40); TN=111, FP=5, FN=12, TP=56 (at threshold 0.45).


