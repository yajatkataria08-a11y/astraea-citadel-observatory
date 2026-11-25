import json
import math
import random

import pytest

API = "/api/v1"


def _no_nan(o):
    if isinstance(o, float):
        assert math.isfinite(o)
    elif isinstance(o, dict):
        [_no_nan(v) for v in o.values()]
    elif isinstance(o, list):
        [_no_nan(v) for v in o]


def test_health_and_model(client):
    h = client.get(f"{API}/health").json()
    assert h["status"] == "ok" and h["model"]["ready"] and h["astroBridge"]["available"] and h["triageDb"]
    m = h["model"]["metrics"]
    assert m["test_roc_auc"] > 0.8
    assert "kepid" not in m["features"] and "snr" in m["features"]      # leak-free feature set


def test_list_shape_matches_frontend_type(client):
    r = client.get(f"{API}/targets?limit=60").json()
    assert r["total"] > 1000 and len(r["items"]) == 60
    need = {"id", "hostKey", "alias", "catalog", "ra", "dec", "periodDays", "transitDepthPpm", "transitDurationHours",
            "radiusEarth", "insolationEarth", "teffKelvin", "statusBadge", "vettingScore", "isQuarantined",
            "shapDrivers", "spectralWavelengths", "spectralFluxes", "spectralErrors", "transitPoints"}
    for t in r["items"]:
        assert need <= t.keys(), need - t.keys()
        assert t["statusBadge"] in {"CONFIRMED_PLANET", "QUARANTINED", "FUOR_OUTBURST", "CANDIDATE", "FALSE_POSITIVE"}
        assert t["catalog"] in {"TOI", "KOI", "SPHEREx", "TESS-Sector-68"}
        assert len(t["spectralFluxes"]) == len(t["spectralWavelengths"]) == len(t["spectralErrors"])
    _no_nan(r)
    ids = [t["id"] for t in r["items"][:5]]
    assert "DEMO-FUOR-01" in ids and "DEMO-ANOMALY-01" in ids        # featured first
    assert all(t["isSynthetic"] for t in r["items"] if t["id"].startswith("DEMO"))


def test_filters_sort_paging(client):
    a = client.get(f"{API}/targets?catalog=KOI&limit=5").json()
    assert all(t["catalog"] == "KOI" for t in a["items"])
    b = client.get(f"{API}/targets?q=kepler-90&limit=20").json()
    assert b["total"] >= 7 and all("kepler-90" in (t["alias"] + t["id"]).lower() for t in b["items"])
    c = client.get(f"{API}/targets?status=FALSE_POSITIVE&limit=5").json()
    assert all(t["statusBadge"] == "FALSE_POSITIVE" for t in c["items"])
    p1 = client.get(f"{API}/targets?limit=5&offset=0").json()["items"]
    p2 = client.get(f"{API}/targets?limit=5&offset=5").json()["items"]
    assert not ({t["id"] for t in p1} & {t["id"] for t in p2})
    assert client.get(f"{API}/targets?limit=0").status_code == 422
    assert client.get(f"{API}/targets?sort=bogus").status_code == 422


def test_shap_additive_and_leak_free(client):
    for tid in ["KOI-00351.01", "TOI-700.02", "DEMO-ANOMALY-01"]:
        s = client.get(f"{API}/shap/{tid}").json()
        total = s["baseline"] + sum(d["impact"] for d in s["drivers"])
        assert abs(total - s["score"]) < 1e-9
        assert not any(w in d["feature"].lower() for d in s["drivers"] for w in ("disposition", "kepid", "fpflag"))
    assert client.get(f"{API}/shap/NOPE").status_code == 404


def test_demo_quarantine_tripwire(client):
    t = client.get(f"{API}/targets/DEMO-ANOMALY-01").json()
    assert t["isQuarantined"] and t["statusBadge"] == "QUARANTINED" and "sigma" in t["quarantineReason"]


def test_physics_never_errors_across_many_targets(client):
    ids = [t["id"] for t in client.get(f"{API}/targets?limit=200").json()["items"]]
    random.Random(1).shuffle(ids)
    for tid in ids[:60]:
        r = client.get(f"{API}/physics/{tid}?n_draws=1000")
        assert r.status_code == 200, (tid, r.text)
        j = r.json()
        _no_nan(j)
        if j.get("computed"):
            assert j["hz_coefficients_verified"] is False and 0 <= j["p_hz_conservative"] <= 1


def test_triage_roundtrip(client):
    r = client.post(f"{API}/triage/KOI-00351.01/verdict", json={"verdict": "CONFIRMED", "notes": "ok", "reviewer": "pytest"})
    assert r.status_code == 200 and r.json()["verdict"] == "CONFIRMED"
    assert client.post(f"{API}/triage/KOI-00351.01/verdict", json={"verdict": "MAYBE"}).status_code == 422
    assert client.post(f"{API}/triage/NOPE/verdict", json={"verdict": "BOGUS"}).status_code == 404
    h = client.get(f"{API}/triage/KOI-00351.01").json()["history"]
    assert h[0]["notes"] == "ok"
    t = client.get(f"{API}/targets/KOI-00351.01").json()
    assert t["humanVerdict"] == "CONFIRMED" and t["triageNotes"] == "ok"


def test_batch_job_and_sse(client):
    j = client.post(f"{API}/batch/scan", json={"source": "toi"}).json()
    assert j["total"] > 1000
    events = []
    with client.stream("GET", f"{API}/batch/stream/{j['batchId']}") as s:
        assert s.headers["content-type"].startswith("text/event-stream")
        for line in s.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))
    assert events[-1]["status"] == "COMPLETED" and events[-1]["pct"] == 100
    assert events[-1]["processed"] == events[-1]["total"]
    assert [e["processed"] for e in events] == sorted(e["processed"] for e in events)
    assert client.get(f"{API}/batch/{j['batchId']}").json()["summary"]["scored"] == j["total"]
    assert client.post(f"{API}/batch/scan", json={"source": "x"}).status_code == 422
    assert client.get(f"{API}/batch/nope").status_code == 404


def test_cors_preflight(client):
    r = client.options(f"{API}/targets", headers={"Origin": "http://localhost:3000",
                                                    "Access-Control-Request-Method": "GET"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    r = client.options(f"{API}/triage/x/verdict", headers={"Origin": "http://localhost:3000",
                                                            "Access-Control-Request-Method": "POST",
                                                            "Access-Control-Request-Headers": "content-type"})
    assert r.status_code == 200


def test_cors_any_local_port_and_reject_foreign(client):
    for origin in ("http://localhost:3001", "http://127.0.0.1:5173", "http://localhost:3000"):
        r = client.options(f"{API}/health", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
        assert r.headers.get("access-control-allow-origin") == origin, origin
    r = client.options(f"{API}/health", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in r.headers


def test_auth_flow(client):
    em = "Tester@Example.com"
    r = client.post(f"{API}/auth/signup", json={"name": "Tester", "email": em, "password": "correct horse 9"})
    assert r.status_code == 201, r.text
    tok = r.json()["token"]
    assert "password" not in r.text and r.json()["user"]["email"] == "tester@example.com"
    assert client.post(f"{API}/auth/signup", json={"name": "T", "email": "tester@example.com", "password": "another-pass1"}).status_code == 409
    assert client.post(f"{API}/auth/signup", json={"name": "T", "email": "bad", "password": "longenough1"}).status_code == 422
    assert client.post(f"{API}/auth/signup", json={"name": "T", "email": "x@y.io", "password": "short"}).status_code == 422
    assert client.post(f"{API}/auth/login", json={"email": em, "password": "correct horse 9"}).status_code == 200
    assert client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}).json()["user"]["name"] == "Tester"
    assert client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}x"}).status_code == 401
    assert client.get(f"{API}/auth/me").status_code == 401
    # verdict reviewer comes from the token
    client.post(f"{API}/triage/KOI-00351.01/verdict", json={"verdict": "BOGUS", "notes": "auth"},
                headers={"Authorization": f"Bearer {tok}"})
    assert client.get(f"{API}/triage/KOI-00351.01").json()["history"][0]["reviewer"] == "Tester"


def test_login_throttle(client):
    client.post(f"{API}/auth/signup", json={"name": "Lock", "email": "lock@example.com", "password": "rightpass123"})
    codes = [client.post(f"{API}/auth/login", json={"email": "lock@example.com", "password": "wrong"}).status_code for _ in range(7)]
    assert codes[:5] == [401] * 5 and codes[5] == 429


# ---------------- OAuth ----------------
def test_oauth_providers_and_unconfigured(client):
    r = client.get("/api/v1/auth/providers")
    assert r.status_code == 200 and set(r.json()["providers"]) == {"google", "microsoft", "github"}
    r = client.get("/api/v1/auth/oauth/google/start", follow_redirects=False)  # no client id in test env
    assert r.status_code == 302 and "oauth_error" in r.headers["location"]
    assert client.get("/api/v1/auth/oauth/nope/start").status_code == 404


def test_oauth_full_flow_and_linking(client, monkeypatch):
    from app.services import oauth
    from app import state as st
    monkeypatch.setitem(oauth.OAUTH_CLIENTS, "google", ("id", "secret"))
    prof = {"subject": "g-1", "email": "Oauth.User@Example.com", "name": "OA User", "email_verified": True}
    monkeypatch.setattr(oauth, "fetch_profile", lambda p, c, client=None: prof)

    r = client.get("/api/v1/auth/oauth/google/start?next=//evil.com", follow_redirects=False)
    assert r.status_code == 302 and r.headers["location"].startswith("https://accounts.google.com/")
    from urllib.parse import urlparse, parse_qs
    state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]
    assert st.auth.read_state(state)["next"] == "/pipelines"  # open redirect blocked

    # callback without the nonce cookie (login CSRF) is refused
    nonce = r.cookies.get("astraea_oauth_nonce")
    client.cookies.clear()
    bad = client.get(f"/api/v1/auth/oauth/google/callback?code=x&state={state}", follow_redirects=False)
    assert "oauth_error" in bad.headers["location"]

    client.cookies.set("astraea_oauth_nonce", nonce)
    ok = client.get(f"/api/v1/auth/oauth/google/callback?code=x&state={state}", follow_redirects=False)
    loc = ok.headers["location"]
    assert "/login/callback#token=" in loc
    token = loc.split("token=")[1].split("&")[0]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).json()["user"]
    assert me["email"] == "oauth.user@example.com"

    # an OAuth-only account can't be entered with a password
    assert client.post("/api/v1/auth/login", json={"email": me["email"], "password": "anything1"}).status_code == 401


def test_oauth_unverified_email_does_not_take_over_account(client):
    from app import state as st
    from app.services.auth import AuthError
    client.post("/api/v1/auth/signup", json={"name": "Vic", "email": "victim@example.com", "password": "correcthorse1"})
    try:
        st.auth.oauth_login("microsoft", "ms-evil", "victim@example.com", "Attacker", False)
        assert False, "must refuse"
    except AuthError as e:
        assert e.status == 409
    # verified email links to the existing account
    u = st.auth.oauth_login("google", "g-vic", "victim@example.com", "Vic", True)
    assert u["email"] == "victim@example.com"
