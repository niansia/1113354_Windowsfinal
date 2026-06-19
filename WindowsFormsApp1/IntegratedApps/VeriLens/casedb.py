"""VeriLens case database -- every analysis is persisted to SQLite.

Demonstrates the databases side of the curriculum: a normalized table, parameterized
queries (injection-safe), indexes, and aggregate statistics for the dashboard.
"""
from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "verilens.db"


class CaseDB:
    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init()

    def _init(self):
        with self.lock:
            self.conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts           REAL    NOT NULL,
                    headline     TEXT    NOT NULL,
                    verdict      TEXT    NOT NULL,
                    credibility  REAL    NOT NULL,
                    p_fake       REAL    NOT NULL,
                    confidence   REAL    NOT NULL,
                    has_image    INTEGER NOT NULL DEFAULT 0,
                    yolo_persons INTEGER NOT NULL DEFAULT 0,
                    yolo_objects INTEGER NOT NULL DEFAULT 0,
                    img_tamper   REAL    NOT NULL DEFAULT 0,
                    ml_fake      REAL    NOT NULL DEFAULT 0,
                    ling_risk    REAL    NOT NULL DEFAULT 0,
                    source       TEXT    DEFAULT ''
                );
                CREATE INDEX IF NOT EXISTS idx_cases_ts ON cases(ts);
                CREATE INDEX IF NOT EXISTS idx_cases_verdict ON cases(verdict);
                """
            )
            self.conn.commit()

    def insert(self, rec: dict) -> int:
        with self.lock:
            cur = self.conn.execute(
                """INSERT INTO cases
                   (ts, headline, verdict, credibility, p_fake, confidence, has_image,
                    yolo_persons, yolo_objects, img_tamper, ml_fake, ling_risk, source)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (time.time(), rec.get("headline", "")[:300], rec.get("verdict", ""),
                 float(rec.get("credibility", 0)), float(rec.get("pFake", 0)),
                 float(rec.get("confidence", 0)), int(bool(rec.get("hasImage"))),
                 int(rec.get("yoloPersons", 0)), int(rec.get("yoloObjects", 0)),
                 float(rec.get("imgTamper", 0)), float(rec.get("mlFake", 0)),
                 float(rec.get("lingRisk", 0)), str(rec.get("source", "")))
            )
            self.conn.commit()
            return cur.lastrowid

    def recent(self, limit: int = 25):
        with self.lock:
            rows = self.conn.execute(
                "SELECT * FROM cases ORDER BY id DESC LIMIT ?", (int(limit),)
            ).fetchall()
        return [dict(r) for r in rows]

    def stats(self) -> dict:
        with self.lock:
            total = self.conn.execute("SELECT COUNT(*) c FROM cases").fetchone()["c"]
            by_verdict = {r["verdict"]: r["c"] for r in self.conn.execute(
                "SELECT verdict, COUNT(*) c FROM cases GROUP BY verdict").fetchall()}
            avg = self.conn.execute(
                "SELECT AVG(credibility) a, AVG(img_tamper) t FROM cases").fetchone()
            with_img = self.conn.execute(
                "SELECT COUNT(*) c FROM cases WHERE has_image=1").fetchone()["c"]
        return {
            "total": total,
            "byVerdict": by_verdict,
            "avgCredibility": round(avg["a"] or 0, 1),
            "avgTamper": round(avg["t"] or 0, 3),
            "withImage": with_img,
        }
