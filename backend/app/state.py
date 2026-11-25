"""Process-wide singletons, built once in the lifespan hook."""
from typing import Optional

from .config import DATA_DIR, DATA_DIR_BACKEND, DB_PATH, SEED, TOKEN_TTL_SECONDS
from .services.auth import AuthService
from .services.batch import BatchManager
from .services.catalog import Catalog
from .services.triage import TriageStore
from .services.vetting import VettingService

vetting: VettingService = VettingService(seed=SEED)
triage: Optional[TriageStore] = None
auth: Optional[AuthService] = None
catalog: Optional[Catalog] = None
batch: Optional[BatchManager] = None
startup_error: Optional[str] = None


def init() -> None:
    global triage, catalog, batch, startup_error, auth
    triage = TriageStore(DB_PATH)
    auth = AuthService(DB_PATH, DATA_DIR_BACKEND, TOKEN_TTL_SECONDS)
    catalog = Catalog(DATA_DIR, vetting, triage)
    try:
        catalog.load()
        batch = BatchManager(catalog)
    except Exception as exc:  # noqa: BLE001 - keep the API alive and report in /health
        startup_error = f"{type(exc).__name__}: {exc}"
