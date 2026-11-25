import os, sys, tempfile
from pathlib import Path

os.environ["TRIAGE_DB"] = str(Path(tempfile.mkdtemp()) / "triage_test.sqlite3")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c
