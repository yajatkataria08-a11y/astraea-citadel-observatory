"""Human-in-the-loop triage persistence (SQLite, stdlib only)."""
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

VALID = {"CONFIRMED", "BOGUS", "UNRESOLVED"}


class TriageStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._conn()) as c:
            c.execute("""CREATE TABLE IF NOT EXISTS triage_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_id TEXT NOT NULL,
                verdict TEXT NOT NULL CHECK (verdict IN ('CONFIRMED','BOGUS','UNRESOLVED')),
                notes TEXT NOT NULL DEFAULT '',
                reviewer TEXT NOT NULL DEFAULT 'anonymous',
                created_at TEXT NOT NULL)""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_triage_target ON triage_reviews(target_id)")
            c.commit()

    def _conn(self):
        c = sqlite3.connect(self.path, timeout=10)
        c.row_factory = sqlite3.Row
        return c

    def add(self, target_id: str, verdict: str, notes: str = "", reviewer: str = "anonymous") -> Dict[str, Any]:
        if verdict not in VALID:
            raise ValueError(f"verdict must be one of {sorted(VALID)}")
        ts = datetime.now(timezone.utc).isoformat()
        with closing(self._conn()) as c:
            cur = c.execute("INSERT INTO triage_reviews(target_id,verdict,notes,reviewer,created_at) VALUES(?,?,?,?,?)",
                            (target_id, verdict, notes or "", reviewer or "anonymous", ts))
            c.commit()
            return {"id": cur.lastrowid, "targetId": target_id, "verdict": verdict, "notes": notes or "",
                    "reviewer": reviewer or "anonymous", "createdAt": ts}

    def history(self, target_id: str) -> List[Dict[str, Any]]:
        with closing(self._conn()) as c:
            rows = c.execute("SELECT * FROM triage_reviews WHERE target_id=? ORDER BY id DESC", (target_id,)).fetchall()
        return [{"id": r["id"], "targetId": r["target_id"], "verdict": r["verdict"], "notes": r["notes"],
                 "reviewer": r["reviewer"], "createdAt": r["created_at"]} for r in rows]

    def latest_all(self) -> Dict[str, Dict[str, Any]]:
        with closing(self._conn()) as c:
            rows = c.execute("""SELECT t.* FROM triage_reviews t
                JOIN (SELECT target_id, MAX(id) mid FROM triage_reviews GROUP BY target_id) m ON t.id=m.mid""").fetchall()
        return {r["target_id"]: {"verdict": r["verdict"], "notes": r["notes"]} for r in rows}

    def ok(self) -> bool:
        try:
            with closing(self._conn()) as c:
                c.execute("SELECT 1")
            return True
        except Exception:  # noqa: BLE001
            return False
