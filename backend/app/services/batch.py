"""
Async batch scan: scores every catalog row in chunks (vetting model + centroid tripwire) and reports progress.
Runs in-process with asyncio (no Redis/Celery needed). Progress is real: `processed` counts rows actually scored.
"""
import asyncio
import time
import uuid
from typing import Any, Dict, Optional

import numpy as np

from .catalog import Catalog, centroid_tripwire

CHUNK = 250


class BatchManager:
    def __init__(self, catalog: Catalog):
        self.catalog = catalog
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def create(self, source: str = "all", pace_seconds: float = 0.05) -> Dict[str, Any]:
        df = self.catalog.df
        if source.lower() in ("koi", "toi"):
            ids = df.index[df["catalog"].str.lower() == source.lower()].tolist()
        elif source.lower() == "all":
            ids = df.index[df["source"] != "demo"].tolist()
        else:
            raise ValueError("source must be one of: all, koi, toi")
        job_id = uuid.uuid4().hex[:12]
        job = {"batchId": job_id, "processed": 0, "total": len(ids), "pct": 0, "status": "QUEUED",
               "currentSector": source.upper(), "startedAt": time.time(), "finishedAt": None,
               "summary": None, "error": None}
        self.jobs[job_id] = job
        asyncio.get_running_loop().create_task(self._run(job, ids, pace_seconds))
        return self.public(job)

    @staticmethod
    def public(job: Dict[str, Any]) -> Dict[str, Any]:
        return {k: v for k, v in job.items() if k not in ("startedAt", "finishedAt")} | {
            "elapsedSeconds": round((job["finishedAt"] or time.time()) - job["startedAt"], 2)}

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        j = self.jobs.get(job_id)
        return self.public(j) if j else None

    async def _run(self, job: Dict[str, Any], ids: list, pace: float) -> None:
        try:
            job["status"] = "PROCESSING"
            df = self.catalog.df
            vet = self.catalog.vetting
            scores = []
            n_trip = 0
            for i in range(0, len(ids), CHUNK):
                sub = df.loc[ids[i:i + CHUNK]]
                s = await asyncio.get_running_loop().run_in_executor(None, vet.score, sub)
                scores.append(s)
                n_trip += sum(centroid_tripwire(o, e)[0] for o, e in zip(sub["cen_off"], sub["cen_err"]))
                job["processed"] = min(i + CHUNK, len(ids))
                job["pct"] = int(round(100 * job["processed"] / max(1, len(ids))))
                await asyncio.sleep(pace)
            allscores = np.concatenate(scores) if scores else np.array([])
            order = np.argsort(-allscores)[:10]
            cand = df.loc[ids]
            unl = cand["status"] == "CANDIDATE"
            job["summary"] = {
                "scored": int(len(ids)), "quarantinedByTripwire": int(n_trip),
                "highScore_ge_0_9": int((allscores >= 0.9).sum()),
                "unlabelledCandidates": int(unl.sum()),
                "topUnlabelledCandidates": [
                    {"id": cand.index[j], "score": float(allscores[j])}
                    for j in [x for x in np.argsort(-allscores) if bool(unl.iloc[x])][:10]],
                "note": "Scores are uncalibrated model outputs; TOI rows are out-of-domain for the Kepler-trained model.",
            }
            job["status"], job["pct"] = "COMPLETED", 100
        except Exception as exc:  # noqa: BLE001
            job["status"], job["error"] = "FAILED", f"{type(exc).__name__}: {exc}"
        finally:
            job["finishedAt"] = time.time()
