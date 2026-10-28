"""Local HTTP receiver: accepts a POSTed JSON test report and saves test-report.json.

Run:  python receiver/receiver.py            (listens on port 8000)
Env:  PORT (default 8000), REPORT_FILE (default test-report.json), RECEIVER_TOKEN (optional shared secret)
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", "8000"))
REPORT_FILE = os.environ.get("REPORT_FILE", "test-report.json")
TOKEN = os.environ.get("RECEIVER_TOKEN", "")


class Handler(BaseHTTPRequestHandler):
    def _reply(self, code, text):
        body = text.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._reply(200, "Report receiver is running. POST JSON to /report\n")

    def do_POST(self):
        if self.path != "/report":
            return self._reply(404, "Not found. Use POST /report\n")
        if TOKEN and self.headers.get("X-Token") != TOKEN:
            return self._reply(401, "Unauthorized\n")
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        try:
            report = json.loads(raw)
        except json.JSONDecodeError:
            return self._reply(400, "Invalid JSON\n")
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        summary = report.get("summary", {})
        print(f"[receiver] saved {REPORT_FILE}: status={summary.get('overall_status')} "
              f"commit={str(report.get('commit_sha', ''))[:7]}", flush=True)
        self._reply(200, "Report saved\n")


if __name__ == "__main__":
    print(f"[receiver] listening on http://0.0.0.0:{PORT}/report -> {REPORT_FILE}", flush=True)
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
