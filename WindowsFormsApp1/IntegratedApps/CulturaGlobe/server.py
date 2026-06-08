"""Cultura — World Cultures Globe: tiny static server for the FusionOS host.

The whole experience is client-side (Three.js globe + procedural Web Audio + the
bundled cultures dataset), so this just serves web/ over HTTP and answers a health
probe the WinForms host uses before opening the in-app WebView window.

Run:  python server.py --port 8795
"""
from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent
WEB_ROOT = APP_ROOT / "web"

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

        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path == "/api/health":
                data = json.dumps({"ok": True, "app": "cultura"}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
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
