import http.server
import socketserver
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent / "web"
HOST = "127.0.0.1"
PORT = 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        request_path = urlparse(self.path).path
        if request_path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"ok")
            return

        target = ROOT / request_path.lstrip("/")
        if request_path != "/" and not target.exists():
            self.path = "/index.html"

        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Permissions-Policy", "camera=(self), microphone=(self)")
        super().end_headers()


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
        print(f"Cosmic Gesture running at http://{HOST}:{PORT}/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
