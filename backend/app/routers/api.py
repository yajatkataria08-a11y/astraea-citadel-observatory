import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .. import astro_bridge, state
from ..config import DATA_DIR
from ..utils import clean
from .auth import current_user

router = APIRouter()
_T0 = time.time()


def _need_ready():
    if state.catalog is None or not state.catalog.ready:
        raise HTTPException(503, detail=f"catalog not ready: {state.startup_error or 'still loading'}")


# ---------------- health / model ----------------
@router.get("/health")
def health():
    cat = state.catalog
    return clean({
        "status": "ok" if (cat and cat.ready) else "degraded",
        "uptimeSeconds": round(time.time() - _T0, 1),
        "catalog": {"ready": bool(cat and cat.ready), "counts": cat.counts if cat else {}, "dataDir": str(DATA_DIR),
                    "error": state.startup_error,
                    "tripwire": cat.tripwire_stats if cat else {}},
        "model": {"ready": state.vetting.ready, "metrics": state.vetting.metrics},
        "astroBridge": astro_bridge.status(),
        "triageDb": bool(state.triage and state.triage.ok()),
        "auth": state.auth is not None,
        "store": "pandas+parquet, sqlite (no DuckDB/Postgres/Redis)",
        "version": "1.1.0",
    })


@router.get("/model/info")
def model_info():
    _need_ready()
    return clean(state.vetting.metrics)


# ---------------- targets ----------------
@router.get("/targets")
def list_targets(q: str = "", catalog: str = "", status: str = "",
                 limit: int = Query(60, ge=1, le=200), offset: int = Query(0, ge=0),
                 sort: str = Query("score", pattern="^-?(score|period|prad)$")):
    _need_ready()
    items, total = state.catalog.list(q=q, catalog=catalog, status=status, limit=limit, offset=offset, sort=sort)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/targets/{target_id}")
def get_target(target_id: str):
    _need_ready()
    rec = state.catalog.get(target_id)
    if rec is None:
        raise HTTPException(404, detail=f"unknown target '{target_id}'")
    return rec


@router.get("/shap/{target_id}")
def get_shap(target_id: str):
    _need_ready()
    r = state.catalog.row(target_id)
    if r is None:
        raise HTTPException(404, detail=f"unknown target '{target_id}'")
    s = state.vetting.explain(target_id, r)
    return clean({"targetId": target_id, "baseline": s["baseline"], "score": s["score"], "drivers": s["drivers"],
                  "space": s["space"], "scoreContext": r["scoreContext"],
                  "note": "Model attributions only, not physical causes. Uncalibrated score."})


@router.get("/physics/{target_id}")
def get_physics(target_id: str, n_draws: int = Query(10000, ge=500, le=50000)):
    """astro B1 (Monte Carlo HZ + radius-only composition + TSM/ESM priority) for one planet."""
    _need_ready()
    r = state.catalog.row(target_id)
    if r is None:
        raise HTTPException(404, detail=f"unknown target '{target_id}'")
    res = astro_bridge.physics_summary(state.catalog.physics_params(r), n_draws=n_draws)
    return {"targetId": target_id, **res}


# ---------------- triage ----------------
class VerdictIn(BaseModel):
    verdict: str = Field(..., pattern="^(CONFIRMED|BOGUS|UNRESOLVED)$")
    notes: str = Field("", max_length=4000)
    reviewer: str = Field("anonymous", max_length=128)


@router.post("/triage/{target_id}/verdict")
def post_verdict(target_id: str, body: VerdictIn, authorization: Optional[str] = Header(None)):
    _need_ready()
    if state.catalog.row(target_id) is None:
        raise HTTPException(404, detail=f"unknown target '{target_id}'")
    user = current_user(authorization)
    reviewer = user["name"] if user else (body.reviewer or "guest")
    return state.triage.add(target_id, body.verdict, body.notes, reviewer)


@router.get("/triage/{target_id}")
def get_triage(target_id: str):
    _need_ready()
    return {"targetId": target_id, "history": state.triage.history(target_id)}


# ---------------- batch ----------------
class BatchIn(BaseModel):
    source: str = Field("all", pattern="^(all|koi|toi)$")


@router.post("/batch/scan")
async def start_batch(body: BatchIn = BatchIn()):
    _need_ready()
    return state.batch.create(body.source)


@router.get("/batch/stream/{job_id}")
async def stream_batch(job_id: str):
    _need_ready()
    if state.batch.get(job_id) is None:
        raise HTTPException(404, detail="unknown job")

    async def gen():
        last = None
        while True:
            job = state.batch.get(job_id)
            payload = json.dumps(clean(job))
            if payload != last:
                yield f"data: {payload}\n\n"
                last = payload
            if job["status"] in ("COMPLETED", "FAILED"):
                break
            await asyncio.sleep(0.15)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/batch/{job_id}")
def get_batch(job_id: str):
    _need_ready()
    j = state.batch.get(job_id)
    if j is None:
        raise HTTPException(404, detail="unknown job")
    return clean(j)
