"""
Project A: SPHEREx Sky Change Explorer ML Pipeline
"""

from .quarantine import InstrumentQuarantine
from .variability import (
    fit_m0_static,
    fit_m1_scale_tilt,
    validate_sign_symmetry,
    compute_sign_flip_null,
    benjamini_hochberg_fdr,
    fit_background_covariance,
    compute_correlated_chi2,
)
from .anomaly import SpectralAnomalyEnsemble, MaskedSpectralAutoencoder
from .spectral_typing import SpectralTypingClassifier, generate_standard_infrared_templates
from .moving_objects import MovingObjectScreener
from .ranking import InterestingnessRanker
from .injection_recovery import InjectionRecoveryValidator
from .neowise import compute_synthetic_wise, assess_neowise_consistency
from .shap_explainer import DiscoveryPriorityExplainer
from .pipeline import SkyChangeExplorerPipeline

__all__ = [
    "InstrumentQuarantine",
    "fit_m0_static",
    "fit_m1_scale_tilt",
    "validate_sign_symmetry",
    "compute_sign_flip_null",
    "benjamini_hochberg_fdr",
    "fit_background_covariance",
    "compute_correlated_chi2",
    "SpectralAnomalyEnsemble",
    "MaskedSpectralAutoencoder",
    "SpectralTypingClassifier",
    "generate_standard_infrared_templates",
    "MovingObjectScreener",
    "InterestingnessRanker",
    "InjectionRecoveryValidator",
    "compute_synthetic_wise",
    "assess_neowise_consistency",
    "DiscoveryPriorityExplainer",
    "SkyChangeExplorerPipeline",
]
