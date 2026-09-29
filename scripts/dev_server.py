#!/usr/bin/env python3
"""Local preview server with only synthetic, dynamically timed API responses."""

import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from build import DIST, build
from mock_data import SCENARIOS, make_snapshot


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/preview/")
            self.end_headers()
            return
        match = re.fullmatch(r"/mock/([a-z]+)/room/1", path)
        if match and match.group(1) in SCENARIOS:
            self.send_bytes(json.dumps(make_snapshot(match.group(1)), ensure_ascii=False).encode(),
                            "application/json; charset=utf-8")
            return
        if path == "/preview/":
            target = DIST / "preview" / "index.html"
        else:
            match = re.fullmatch(r"/preview/([a-z]+)/", path)
            if not match or match.group(1) not in SCENARIOS:
                self.send_error(404)
                return
            target = DIST / "preview" / match.group(1) / "index.html"
        self.send_bytes(target.read_bytes(), "text/html; charset=utf-8")

    def send_bytes(self, payload: bytes, content_type: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8767)
    args = parser.parse_args()
    build()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Preview: http://127.0.0.1:{args.port}/preview/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
