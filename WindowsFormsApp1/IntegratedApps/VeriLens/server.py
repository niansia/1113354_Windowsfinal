"""VeriLens -- Misinformation Forensics Lab backend.

Orchestrates the whole multimodal fake-news pipeline:

  text  --> sklearn classifier (textmodel.py)  --\
  image --> YOLO(ONNX) + OpenCV forensics (detector.py) --> C++ fusion engine
  source--> credibility heuristic                --/      (forensics_core.cpp)
                                                              |
                                                     verdict + explainable factors
                                                              |
                                              SQLite case store (casedb.py) + web UI

Run:  python server.py --port 8794
The native C++ engine is built on first run (g++); a pure-Python fusion fallback
keeps the app working if g++ is missing. YOLO/OpenCV/sklearn are loaded once.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import html as _html
import os
import re
import subprocess
import sys
import threading
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(APP_ROOT))
import webcheck  # noqa: E402  (stdlib-only; needs APP_ROOT on sys.path)
WEB_ROOT = APP_ROOT / "web"
ENGINE_SRC = APP_ROOT / "engine" / "forensics_core.cpp"
ENGINE_EXE = APP_ROOT / "build" / ("ForensicsCore.exe" if os.name == "nt" else "ForensicsCore")

MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"}

# crude source-credibility heuristic (domain or name keyword -> prior)
SOURCE_CRED = {
    "reuters": 0.85, "ap": 0.85, "bbc": 0.82, "cna": 0.8, "中央社": 0.8, "公視": 0.8,
    "nytimes": 0.8, "guardian": 0.78, "天下": 0.72, "聯合報": 0.7, "自由": 0.68, "中時": 0.66,
    "the onion": 0.1, "洋蔥": 0.1, "satire": 0.15, "kanye": 0.3, "line群組": 0.25, "我朋友說": 0.2,
    "內容農場": 0.15, "blogspot": 0.4, "facebook": 0.4, "ptt": 0.45, "dcard": 0.45,
}


def log(*a):
    print(*a, flush=True)


def source_credibility(src: str) -> float:
    if not src:
        return 0.5
    s = src.lower()
    for k, v in SOURCE_CRED.items():
        if k in s:
            return v
    return 0.5


# ------------------------------------------------------------------ URL ingest
# Fetch a news/article URL server-side and extract the headline, body text and
# lead image so the user can verify a link directly (no copy-paste). Stdlib only.
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
_SKIP_TAGS = {"script", "style", "noscript", "template", "svg"}
_TEXT_TAGS = {"title", "h1", "p"}


class ArticleExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.og_title = ""
        self.og_desc = ""
        self.og_image = ""
        self.h1 = []
        self.paragraphs = []
        self._cur = None
        self._buf = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in _SKIP_TAGS:
            self._skip += 1
            return
        if tag == "meta":
            d = {k.lower(): (v or "") for k, v in attrs}
            key = (d.get("property") or d.get("name") or "").lower()
            content = d.get("content", "").strip()
            if not content:
                return
            if key == "og:title":
                self.og_title = content
            elif key in ("og:description", "description", "twitter:description"):
                if not self.og_desc:
                    self.og_desc = content
            elif key in ("og:image", "og:image:url", "twitter:image"):
                if not self.og_image:
                    self.og_image = content
            return
        if tag in _TEXT_TAGS and self._skip == 0:
            self._cur = tag
            self._buf = []

    def handle_endtag(self, tag):
        if tag in _SKIP_TAGS and self._skip > 0:
            self._skip -= 1
            return
        if tag == self._cur:
            text = _html.unescape("".join(self._buf)).strip()
            text = re.sub(r"\s+", " ", text)
            if tag == "title" and not self.title:
                self.title = text
            elif tag == "h1" and text:
                self.h1.append(text)
            elif tag == "p" and text:
                self.paragraphs.append(text)
            self._cur = None
            self._buf = []

    def handle_data(self, data):
        if self._cur and self._skip == 0:
            self._buf.append(data)


def _fetch_bytes(url, cap):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.read(cap)
    except Exception:  # noqa: BLE001
        return None


def fetch_article(url: str):
    if not re.match(r"^https?://", url, re.I):
        return None
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": _UA, "Accept-Language": "zh-TW,zh,en;q=0.8"})
        with urllib.request.urlopen(req, timeout=9) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            raw = resp.read(2_500_000)
            final_url = resp.geturl()
    except Exception as exc:  # noqa: BLE001
        log("[fetch] could not open url: %s" % exc)
        return None
    text = raw.decode(charset, "replace")
    # late charset detection from a <meta charset> if the default mangled CJK
    m = re.search(r'charset=["\']?\s*([\w-]+)', text[:2048], re.I)
    if m and m.group(1).lower() not in ("utf-8", "utf8") and charset.lower() in ("utf-8", "iso-8859-1"):
        try:
            text = raw.decode(m.group(1), "replace")
        except Exception:
            pass
    p = ArticleExtractor()
    try:
        p.feed(text)
    except Exception:  # noqa: BLE001
        pass
    headline = (p.og_title or p.title or (p.h1[0] if p.h1 else "")).strip()
    # drop the trailing " - Site Name" that many <title>s carry
    headline = re.split(r"\s+[|\-–—]\s+", headline)[0] if headline else headline
    paras = [x for x in p.paragraphs if len(x) >= 30]
    body = "\n".join(paras[:80]).strip()
    if len(body) < 100 and p.og_desc:
        body = p.og_desc.strip()
    source = urllib.parse.urlparse(final_url).netloc
    image_bytes = None
    if p.og_image:
        image_bytes = _fetch_bytes(urllib.parse.urljoin(final_url, p.og_image), 9_000_000)
    if not headline and not body:
        return None
    return {"headline": headline[:300], "body": body[:6000], "source": source,
            "image_bytes": image_bytes, "url": final_url, "thin": len(body) < 120}


class VeriLens:
    def __init__(self):
        self.detector = None
        self.textmodel = None
        self.db = None
        self.engine_ok = False

    def warm(self):
        self.engine_ok = self._ensure_engine()
        # heavy AI imports happen here (kept off the import path so the HTTP server
        # can start instantly and report readiness as components come online)
        try:
            from detector import Detector
            self.detector = Detector(log=log)
        except Exception as exc:  # noqa: BLE001
            log("[warm] detector unavailable: %s" % exc)
        try:
            from textmodel import TextModel
            self.textmodel = TextModel(log=log)
        except Exception as exc:  # noqa: BLE001
            log("[warm] textmodel unavailable: %s" % exc)
        try:
            from casedb import CaseDB
            self.db = CaseDB()
        except Exception as exc:  # noqa: BLE001
            log("[warm] casedb unavailable: %s" % exc)
        log("[warm] ready: engine=%s yolo=%s text=%s db=%s" % (
            self.engine_ok,
            bool(self.detector and self.detector.ready),
            bool(self.textmodel and self.textmodel.ready),
            bool(self.db)))

    # ---- C++ engine ----
    def _ensure_engine(self):
        if ENGINE_EXE.exists():
            return True
        gpp = self._find_gpp()
        if not gpp:
            log("[engine] g++ not found -- using Python fusion fallback")
            return False
        ENGINE_EXE.parent.mkdir(parents=True, exist_ok=True)
        try:
            r = subprocess.run([gpp, "-std=c++17", "-O2", str(ENGINE_SRC), "-o", str(ENGINE_EXE)],
                               capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                log("[engine] compile failed:\n" + r.stderr)
                return False
            log("[engine] built ForensicsCore")
            return True
        except Exception as exc:  # noqa: BLE001
            log("[engine] compile error: %s" % exc)
            return False

    @staticmethod
    def _find_gpp():
        for name in ("g++", "g++.exe", "c++"):
            for d in os.environ.get("PATH", "").split(os.pathsep):
                p = Path(d) / name
                if p.exists():
                    return str(p)
        return None

    def _run_engine(self, signals, headline, body):
        lines = ["S\t%s\t%s" % (k, v) for k, v in signals.items()]
        stdin = "\n".join(lines) + "\n---HEADLINE---\n" + headline + "\n---BODY---\n" + body + "\n"
        if ENGINE_EXE.exists():
            try:
                r = subprocess.run([str(ENGINE_EXE)], input=stdin.encode("utf-8"),
                                   capture_output=True, timeout=8)
                out = r.stdout.decode("utf-8", "replace").strip()
                if out:
                    return json.loads(out.splitlines()[-1])
            except Exception as exc:  # noqa: BLE001
                log("[engine] run failed, using fallback: %s" % exc)
        return self._py_fuse(signals, headline, body)

    @staticmethod
    def _py_fuse(signals, headline, body):
        """Compact pure-Python mirror of forensics_core.cpp (graceful fallback)."""
        full = (headline + "\n" + body).lower()
        click = sum(full.count(w) for w in ["震驚", "瘋傳", "獨家", "曝光", "100%", "不轉",
                                            "shocking", "you won't believe", "exposed", "must see"])
        src = sum(full.count(w) for w in ["根據", "表示", "指出", "研究", "according to", "said", "study"])
        ling = max(0.0, min(1.0, 0.15 + click * 0.12 - src * 0.05))
        ml = float(signals.get("mlFake", 0.5))
        sc = float(signals.get("srcCred", 0.5))
        tamper = float(signals.get("imgTamper", 0.0))
        has_img = float(signals.get("hasImage", 0)) > 0.5

        def logit(p):
            p = min(max(p, 1e-4), 1 - 1e-4)
            return math.log(p / (1 - p))
        L = logit(ml) + 2.2 * (ling - 0.45) + 1.6 * (0.5 - sc)
        factors = [
            {"key": "text_model", "contribution": round(logit(ml), 3), "value": ml,
             "direction": "fake" if ml > 0.5 else "credible"},
            {"key": "writing_style", "contribution": round(2.2 * (ling - 0.45), 3), "value": round(ling, 3),
             "direction": "fake" if ling > 0.45 else "credible"},
            {"key": "source_credibility", "contribution": round(1.6 * (0.5 - sc), 3), "value": sc,
             "direction": "fake" if sc < 0.5 else "credible"},
        ]
        if "webFake" in signals:
            wf = min(max(float(signals["webFake"]), 0.02), 0.98)
            c = 1.8 * logit(wf)
            L += c
            factors.append({"key": "web_crossref", "contribution": round(c, 3), "value": round(wf, 3),
                            "direction": "fake" if wf > 0.5 else "credible"})
        if has_img:
            L += 2.0 * (tamper - 0.35)
            factors.append({"key": "image_tampering", "contribution": round(2.0 * (tamper - 0.35), 3),
                            "value": tamper, "direction": "fake" if tamper > 0.35 else "credible"})
        p_fake = 1 / (1 + math.exp(-L))
        cred = (1 - p_fake) * 100
        verdict = "credible" if cred >= 66 else "questionable" if cred >= 40 else "likely_false"
        factors.sort(key=lambda f: -abs(f["contribution"]))
        return {"engine": "python", "verdict": verdict, "credibility": round(cred, 1),
                "pFake": round(p_fake, 4), "confidence": round(abs(p_fake - 0.5) * 180, 1),
                "factors": factors, "claims": [],
                "features": {"lingRisk": round(ling, 3), "clickbait": click, "source": src},
                "signals": signals}

    # ---- analysis pipeline ----
    def analyze(self, headline, body, source, image_bytes, url="", do_web=True):
        extracted = None
        if url:
            art = fetch_article(url)
            if not art:
                return {"ok": False, "error": "fetch_failed"}
            headline = headline or art["headline"]
            body = body or art["body"]
            source = source or art["source"]
            if not image_bytes and art.get("image_bytes"):
                image_bytes = art["image_bytes"]
            extracted = {"headline": headline, "body": body, "source": source,
                         "url": art["url"], "thin": art.get("thin", False)}

        signals = {"srcCred": round(source_credibility(source), 3)}
        image_result = None
        if image_bytes:
            signals["hasImage"] = 1
            if self.detector:
                image_result = self.detector.analyze_image(image_bytes)
            if image_result:
                signals["imgTamper"] = round(image_result["tamper"], 3)
                signals["yoloPersons"] = image_result["yoloPersons"]
                signals["yoloObjects"] = image_result["yoloObjects"]
        else:
            signals["hasImage"] = 0

        if self.textmodel and self.textmodel.ready:
            p = self.textmodel.prob_fake(headline + "\n" + body)
            if p is not None:
                signals["mlFake"] = round(p, 3)

        # web cross-reference: query fact-check databases (Cofacts + web) for this claim
        web = {"ran": False, "webFake": None, "hits": []}
        if do_web:
            try:
                web = webcheck.web_crossref((headline + "\n" + body).strip(), log=log)
            except Exception as exc:  # noqa: BLE001
                log("[web] crossref error: %s" % exc)
            if web.get("webFake") is not None:
                signals["webFake"] = web["webFake"]

        verdict = self._run_engine(signals, headline, body)
        verdict["textModelReady"] = bool(self.textmodel and self.textmodel.ready)
        verdict["image"] = image_result
        verdict["source"] = source
        verdict["sourceCredibility"] = signals["srcCred"]
        verdict["extracted"] = extracted
        verdict["web"] = web

        if self.db:
            try:
                cid = self.db.insert({
                    "headline": headline or (body[:80] if body else "(image)"),
                    "verdict": verdict["verdict"], "credibility": verdict["credibility"],
                    "pFake": verdict["pFake"], "confidence": verdict.get("confidence", 0),
                    "hasImage": signals["hasImage"], "yoloPersons": signals.get("yoloPersons", 0),
                    "yoloObjects": signals.get("yoloObjects", 0), "imgTamper": signals.get("imgTamper", 0),
                    "mlFake": signals.get("mlFake", 0),
                    "lingRisk": verdict.get("features", {}).get("lingRisk", 0), "source": source,
                })
                verdict["caseId"] = cid
            except Exception as exc:  # noqa: BLE001
                log("[db] insert failed: %s" % exc)
        return verdict

    def health(self):
        return {
            "engine": self.engine_ok,
            "yolo": bool(self.detector and self.detector.ready),
            "yoloClasses": len(self.detector.names) if self.detector else 0,
            "textModel": bool(self.textmodel and self.textmodel.ready),
            "db": bool(self.db),
        }


def make_handler(app: VeriLens):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path == "/api/health":
                return self._json(app.health())
            if path == "/api/cases":
                return self._json({"recent": app.db.recent(30) if app.db else [],
                                   "stats": app.db.stats() if app.db else {}})
            return self._static(path)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(length) if length else b""
            try:
                body = json.loads(raw.decode("utf-8")) if raw else {}
            except json.JSONDecodeError:
                return self._json({"ok": False, "error": "bad json"}, 400)
            if self.path.split("?", 1)[0] == "/api/analyze":
                img_bytes = None
                data_url = body.get("image")
                if data_url and isinstance(data_url, str) and "," in data_url:
                    try:
                        img_bytes = base64.b64decode(data_url.split(",", 1)[1])
                    except Exception:
                        img_bytes = None
                try:
                    res = app.analyze(str(body.get("headline", "")).strip(),
                                      str(body.get("body", "")).strip(),
                                      str(body.get("source", "")).strip(),
                                      img_bytes,
                                      str(body.get("url", "")).strip(),
                                      body.get("web", True) is not False)
                    return self._json(res)
                except Exception as exc:  # noqa: BLE001
                    log("[analyze] error: %s" % exc)
                    return self._json({"ok": False, "error": "analysis failed"}, 500)
            return self._json({"ok": False, "error": "not found"}, 404)

        def _json(self, obj, code=200):
            data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def _static(self, path):
            if path in ("/", ""):
                path = "/index.html"
            target = (WEB_ROOT / path.lstrip("/")).resolve()
            if not str(target).startswith(str(WEB_ROOT.resolve())) or not target.is_file():
                self.send_error(404)
                return
            data = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", MIME.get(target.suffix, "application/octet-stream"))
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

    return Handler


def main():
    ap = argparse.ArgumentParser(description="VeriLens backend")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8794)
    args = ap.parse_args()

    app = VeriLens()
    httpd = ThreadingHTTPServer((args.host, args.port), make_handler(app))
    log("[http] VeriLens on http://%s:%d" % (args.host, args.port))
    # warm AI components in the background so the dashboard loads immediately
    threading.Thread(target=app.warm, daemon=True).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
