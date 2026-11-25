"""JSON-safety helpers. Starlette refuses NaN/Inf, so every payload goes through clean()."""
import math
from typing import Any

import numpy as np


def clean(obj: Any) -> Any:
    """Recursively convert numpy types to Python and NaN/Inf to None."""
    if obj is None or isinstance(obj, (str, bool)):
        return obj
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        f = float(obj)
        return f if math.isfinite(f) else None
    if isinstance(obj, int):
        return obj
    if isinstance(obj, dict):
        return {str(k): clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [clean(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return [clean(v) for v in obj.tolist()]
    try:  # pandas Timestamp, etc.
        return str(obj)
    except Exception:
        return None


def num(x: Any):
    """float or None (NaN-safe)."""
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None
