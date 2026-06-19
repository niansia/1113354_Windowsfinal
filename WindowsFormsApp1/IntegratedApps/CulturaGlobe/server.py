"""Cultura — World Cultures Globe: tiny static server for the FusionOS host.

The whole experience is client-side (Three.js globe + procedural Web Audio + the
bundled cultures dataset), so this just serves web/ over HTTP and answers a health
probe the WinForms host uses before opening the in-app WebView window.

Run:  python server.py --port 8795
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent
WEB_ROOT = APP_ROOT / "web"

# /api/tts same-origin proxy for Google translate_tts. The browser cannot load that
# host cross-origin from a media element (ORB), so the server fetches the MP3 and
# streams it back same-origin. Tiny in-memory cache: repeat clicks cost nothing.
TTS_CACHE: dict[str, bytes] = {}
TTS_CACHE_MAX = 300

# /api/birdsong cache: iNat taxon id -> (audio bytes | None, content-type | None)
BIRDSONG_CACHE: dict = {}
BIRDSONG_CACHE_MAX = 400

MIME = {
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2"
}


def make_handler():
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _json(self, obj):
            data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path == "/api/health":
                return self._json({"ok": True, "app": "cultura"})
            if path == "/api/tts":
                qs = urllib.parse.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
                tl = qs.get("tl", [""])[0][:10]
                q = qs.get("q", [""])[0][:200]
                if not q or not re.fullmatch(r"[A-Za-z]{2,3}(-[A-Za-z]{2,4})?", tl):
                    self.send_error(400)
                    return
                key = tl + "|" + q
                body = TTS_CACHE.get(key)
                if body is None:
                    url = ("https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl="
                           + urllib.parse.quote(tl) + "&q=" + urllib.parse.quote(q))
                    try:
                        req = urllib.request.Request(url, headers={
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                        with urllib.request.urlopen(req, timeout=8) as r:
                            if "audio" not in (r.headers.get("Content-Type") or ""):
                                raise ValueError("not audio")
                            body = r.read()
                    except Exception:
                        self.send_error(502)
                        return
                    if len(TTS_CACHE) >= TTS_CACHE_MAX:
                        TTS_CACHE.clear()
                    TTS_CACHE[key] = body
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "max-age=86400")
                self.end_headers()
                self.wfile.write(body)
                return
            if path == "/api/birdsong":
                # stream a REAL bird recording for a given iNaturalist taxon id: query
                # iNat for the top sound observation of that species and proxy the audio
                # back same-origin (CORS-free for an <audio> element). Cached per taxon.
                qs = urllib.parse.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
                taxon = qs.get("taxon", [""])[0]
                if not re.fullmatch(r"\d{1,9}", taxon):
                    self.send_error(400)
                    return
                cached = BIRDSONG_CACHE.get(taxon)
                if cached is None:
                    try:
                        api = ("https://api.inaturalist.org/v1/observations?taxon_id=" + taxon
                               + "&sounds=true&per_page=1&order=desc&order_by=votes&quality_grade=research")
                        req = urllib.request.Request(api, headers={"User-Agent": "CulturaGlobe/1.0"})
                        with urllib.request.urlopen(req, timeout=8) as r:
                            data = json.loads(r.read().decode("utf-8"))
                        results = data.get("results") or []
                        sound_url = None
                        if results and results[0].get("sounds"):
                            sound_url = results[0]["sounds"][0].get("file_url")
                        if not sound_url:
                            BIRDSONG_CACHE[taxon] = (None, None)  # negative cache
                            self.send_error(404)
                            return
                        sreq = urllib.request.Request(sound_url, headers={"User-Agent": "CulturaGlobe/1.0"})
                        with urllib.request.urlopen(sreq, timeout=10) as sr:
                            ctype = sr.headers.get("Content-Type") or "audio/mpeg"
                            audio = sr.read()
                        if len(BIRDSONG_CACHE) >= BIRDSONG_CACHE_MAX:
                            BIRDSONG_CACHE.clear()
                        cached = (audio, ctype)
                        BIRDSONG_CACHE[taxon] = cached
                    except Exception:
                        self.send_error(502)
                        return
                if cached[0] is None:
                    self.send_error(404)
                    return
                audio, ctype = cached
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(audio)))
                self.send_header("Cache-Control", "max-age=86400")
                self.end_headers()
                self.wfile.write(audio)
                return
            if path == "/api/images":
                # list user-supplied marker images so the client loads only what exists
                d = WEB_ROOT / "images"
                exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
                files = sorted(f.name for f in d.glob("*") if f.is_file() and f.suffix.lower() in exts) if d.is_dir() else []
                return self._json({"images": files})
            if path in ("/", ""):
                path = "/index.html"
            target = (WEB_ROOT / path.lstrip("/")).resolve()
            if not str(target).startswith(str(WEB_ROOT.resolve())) or not target.is_file():
                self.send_error(404)
                return
            body = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", MIME.get(target.suffix.lower(), "application/octet-stream"))
            self.send_header("Content-Length", str(len(body)))
            # the 1100 bird cutouts are immutable build artifacts -- let the browser
            # cache them so the birds page opens instantly after the first visit
            if path.startswith("/birdcut/"):
                self.send_header("Cache-Control", "max-age=604800")
            else:
                self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

    return Handler


def main():
    ap = argparse.ArgumentParser(description="Cultura globe server")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8795)
    args = ap.parse_args()
    httpd = ThreadingHTTPServer((args.host, args.port), make_handler())
    print(f"[http] Cultura globe on http://{args.host}:{args.port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
