#!/usr/bin/env python3
"""HTTP bridge server for trading-lab command runner.

Accepts POST requests with {"command": "..."} and routes them through
the allowlisted command_runner.py. Returns structured JSON responses.

Usage:
  python3 scripts/trading_bridge.py [--port 18790]
"""
import json
import os
import re
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

BRIDGE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMMAND_RUNNER = os.path.join(BRIDGE_DIR, "scripts", "command_runner.py")
LOG_FILE = os.path.join(BRIDGE_DIR, "logs", "bridge_server.log")

ALLOWLIST = [
    "generate market open brief",
    "generate midday brief",
    "generate market close brief",
    "run paper trade review",
    "show active paper trades",
    "show performance summary",
    "show political catalysts",
    "show daily brief",
    "show risk status",
    "journal search",
    "help",
]

BLOCKED_KEYWORDS = [
    "place", "cancel", "order", "trade", "approve",
    "live", "auto", "margin", "short", "option",
]


def log_entry(entry: dict):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


def is_blocked(command: str) -> bool:
    cmd_lower = command.lower()
    for kw in BLOCKED_KEYWORDS:
        if re.search(rf"\b{kw}\b", cmd_lower):
            return True
    return False


def validate_command(command: str) -> tuple[bool, str]:
    if not command or not command.strip():
        return False, "Empty command"
    cleaned = command.strip()
    if cleaned in ALLOWLIST:
        return True, ""
    JS = "journal search "
    if cleaned.startswith(JS) and len(cleaned) > len(JS):
        return True, ""
    return False, f"Command not on allowlist: {cleaned}"


def call_runner(command: str) -> dict:
    try:
        result = subprocess.run(
            ["python3", COMMAND_RUNNER, "--command", command],
            capture_output=True, text=True, timeout=30,
            cwd=BRIDGE_DIR,
        )
        output = result.stdout or result.stderr
        try:
            parsed = json.loads(output)
            return parsed
        except json.JSONDecodeError:
            return {"status": "error", "command": command, "output": output}
    except subprocess.TimeoutExpired:
        return {"status": "error", "command": command, "output": "Command timed out"}
    except Exception as e:
        return {"status": "error", "command": command, "output": str(e)}


class BridgeHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/api/v1/health":
            self._send_json(200, {"status": "ok", "service": "trading-lab-bridge", "version": "1.0.0"})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/api/v1/command":
            self._send_json(404, {"error": "Not found"})
            return

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len) if content_len else b"{}"

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._send_json(400, {"status": "error", "command": "", "output": "Invalid JSON"})
            return

        command = data.get("command", "").strip()
        timestamp = datetime.now(timezone.utc).isoformat()

        if not command:
            self._send_json(400, {"status": "error", "command": "", "output": "Missing command"})
            return

        if is_blocked(command):
            entry = {"timestamp": timestamp, "status": "blocked", "command": command, "reason": "keyword_blocked"}
            log_entry(entry)
            self._send_json(403, {"status": "blocked", "command": command, "output": "Command contains blocked keywords"})
            return

        valid, reason = validate_command(command)
        if not valid:
            entry = {"timestamp": timestamp, "status": "blocked", "command": command, "reason": reason}
            log_entry(entry)
            self._send_json(403, {"status": "blocked", "command": command, "output": reason})
            return

        result = call_runner(command)
        entry = {"timestamp": timestamp, "status": result.get("status"), "command": command}
        log_entry(entry)

        status_code = 200 if result.get("status") == "allowed" else 500
        self._send_json(status_code, result)

    def _send_json(self, code: int, data: dict):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, fmt, *args):
        pass


def main():
    port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--port" else 18790

    server = HTTPServer(("127.0.0.1", port), BridgeHandler)
    print(f"Trading bridge listening on http://127.0.0.1:{port}")
    print(f"  POST /api/v1/command  — run a command")
    print(f"  GET  /api/v1/health   — health check")
    print(f"  Logs → {LOG_FILE}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
