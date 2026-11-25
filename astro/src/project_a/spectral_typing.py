"""
spectral_typing.py - SPHEREx Spectral Classification and Template Fitting

Specification Reference: §2.4 Step 4
Research Precedents:
- SPIFF Pipeline (arXiv:2604.22012, 2026): Hybrid ultracool-dwarf templates and infrared spectral library for SPHEREx.
- Lakshmipathaiah et al. (2023, MNRAS, arXiv:2309.12957): Probabilistic Classification of IR-selected targets
  for SPHEREx mission in search of Young Stellar Objects (YSOs).
- Akeson et al. (2025, arXiv:2511.15823): SPHEREx Image & Spectrophotometry Processing.

Provides:
1. Chi-squared template library matching across 5 astrophysical classes:
   - Ultracool dwarfs (M/L/T/Y dwarfs, methane & water absorption bands)
   - Young Stellar Objects (YSOs, infrared excess from protoplanetary disks)
   - Active Galactic Nuclei (AGN / Quasars, power-law continuum + broad emission)
   - Evolved AGB / Carbon Stars (PAH / silicate / CO absorption features)
   - Standard Main-Sequence Stars (Rayleigh-Jeans tail in near-IR)
2. Probabilistic classification accounting for heteroskedastic measurement errors.
3. Goodness-of-fit reduced chi-squared and best-fit scale normalization.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd


# Synthetic SPHEREx near-infrared spectral templates (0.75 to 5.0 microns, 102 channels)
def generate_standard_infrared_templates(wavelengths: np.ndarray) -> Dict[str, np.ndarray]:
    """
    Generates representative spectral energy distribution (SED) templates
    for SPHEREx 0.75 - 5.0 micron wavelength regime.
    """
    templates = {}

    # 1. Main Sequence Star (approx 5800K blackbody-like SED)
    # Rayleigh-Jeans tail declining steeply into near-IR: F_lambda ~ lambda^-4
    sed_ms = (1.0 / wavelengths) ** 2.5
    templates["main_sequence"] = sed_ms / np.mean(sed_ms)

    # 2. Ultracool Dwarf (T-dwarf / Y-dwarf: deep H2O at 1.4 & 1.9 um, CH4 at 2.2 & 3.3 um)
    sed_ucd = np.exp(-((wavelengths - 1.2) ** 2) / 0.1) + 0.6 * np.exp(-((wavelengths - 1.6) ** 2) / 0.15)
    # Deep methane and water absorption troughs
    sed_ucd *= (1.0 - 0.75 * np.exp(-((wavelengths - 1.4) ** 2) / 0.02))
    sed_ucd *= (1.0 - 0.85 * np.exp(-((wavelengths - 1.9) ** 2) / 0.03))
    sed_ucd *= (1.0 - 0.65 * np.exp(-((wavelengths - 3.3) ** 2) / 0.08))
    templates["ultracool_dwarf"] = np.maximum(sed_ucd / np.mean(sed_ucd), 0.01)

    # 3. Young Stellar Object (YSO: strong infrared excess beyond 2.0 um from circumstellar dust)
    sed_yso = (1.0 / wavelengths) ** 1.5 + 1.2 * (wavelengths / 3.0) ** 1.8
    # 3.05 um water ice and 3.3 um PAH absorption/emission features
    sed_yso *= (1.0 - 0.3 * np.exp(-((wavelengths - 3.05) ** 2) / 0.05))
    templates["young_stellar_object"] = sed_yso / np.mean(sed_yso)

    # 4. Active Galactic Nucleus (AGN: flat power-law continuum + hot dust bump at 3-5 um)
    sed_agn = (wavelengths ** 0.3) + 0.5 * np.exp(-((wavelengths - 3.5) ** 2) / 1.0)
    templates["active_galactic_nucleus"] = sed_agn / np.mean(sed_agn)

    # 5. Evolved AGB / Mira Star (cool photosphere with strong CO absorption at 2.3 & 4.6 um)
    sed_agb = np.exp(-((wavelengths - 1.6) ** 2) / 0.8) + 0.8 * np.exp(-((wavelengths - 2.2) ** 2) / 0.5)
    sed_agb *= (1.0 - 0.4 * np.exp(-((wavelengths - 2.35) ** 2) / 0.04))  # CO bandhead
    sed_agb *= (1.0 - 0.5 * np.exp(-((wavelengths - 4.6) ** 2) / 0.15))   # fundamental CO
    templates["evolved_agb_star"] = np.maximum(sed_agb / np.mean(sed_agb), 0.01)

    return templates


class SpectralTypingClassifier:
    """
    Fits observed multi-channel SPHEREx spectra to astrophysical templates
    incorporating channel-dependent flux uncertainties.
    """

    def __init__(self, wavelengths: np.ndarray):
        self.wavelengths = wavelengths
        self.n_channels = len(wavelengths)
        self.templates = generate_standard_infrared_templates(wavelengths)
        self.class_names = list(self.templates.keys())

    def fit_spectrum(
        self,
        flux: np.ndarray,
        error: np.ndarray
    ) -> Dict[str, Any]:
        """
        Fits an observed spectrum to the template library using optimal weighted least-squares:
        scale_k = sum(w * flux * template) / sum(w * template^2)
        chi2_k  = sum(w * (flux - scale_k * template)^2)
        """
        w = 1.0 / np.maximum(error ** 2, 1e-12)
        chi2_dict = {}
        scales = {}

        for name, tpl in self.templates.items():
            denom = np.sum(w * (tpl ** 2))
            numer = np.sum(w * flux * tpl)
            scale = numer / denom if denom > 0 else 0.0
            scale = max(scale, 1e-6)

            fit_flux = scale * tpl
            res = (flux - fit_flux) / np.maximum(error, 1e-6)
            chi2_val = float(np.sum(res ** 2))

            chi2_dict[name] = chi2_val
            scales[name] = float(scale)

        # Convert chi^2 to posterior probabilities via softmax on -0.5 * chi^2
        min_chi2 = min(chi2_dict.values())
        d_chi2 = {k: v - min_chi2 for k, v in chi2_dict.items()}
        # Temperature factor to prevent overconfident posteriors
        exp_terms = {k: np.exp(-0.5 * d / max(self.n_channels / 20.0, 1.0)) for k, d in d_chi2.items()}
        sum_exp = sum(exp_terms.values())
        probs = {k: float(v / sum_exp) for k, v in exp_terms.items()}

        best_class = min(chi2_dict, key=chi2_dict.get)
        dof = max(self.n_channels - 1, 1)

        return {
            "best_class": best_class,
            "best_reduced_chi2": float(chi2_dict[best_class] / dof),
            "class_probabilities": probs,
            "all_chi2": chi2_dict,
            "optimal_scales": scales,
        }
