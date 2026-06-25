#!/usr/bin/env python3
"""Allowlisted command runner for trading-agent-lab.

This script enforces a strict allowlist. Commands not on the allowlist are
blocked. Certain keywords are blocked even if they somehow bypass the list.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LOG_FILE = BASE_DIR / "logs" / "command_runner.log"
SCRIPTS_DIR = BASE_DIR / "scripts"
SIGNALS_DIR = BASE_DIR / "signals"
POLICIES_DIR = BASE_DIR / "policies"
JOURNAL_DIR = BASE_DIR / "journal"

ALLOWED_COMMANDS = frozenset({
    "generate market open brief",
    "generate midday brief",
    "generate market close brief",
    "run paper trade review",
    "show active paper trades",
    "show performance summary",
    "show political catalysts",
    "show daily brief",
    "show risk status",
    "help",
})

BLOCKED_PATTERNS = [
    "place", "cancel", "order", "trade", "approve",
    "live", "auto", "margin", "short", "option",
]


def log_entry(entry: dict) -> None:
    entry.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


def contains_blocked_keyword(command: str) -> str | None:
    lower = command.lower()
    for kw in BLOCKED_PATTERNS:
        if re.search(rf"\b{kw}\b", lower):
            return f"Command contains blocked keyword: '{kw}' — must never pass through."
    return None


def dispatch(command: str) -> dict:
    # ── exact-match allowlist ──────────────────────────────────────────
    if command in ALLOWED_COMMANDS:
        return _run_allowed(command)

    # ── journal search <query> ─────────────────────────────────────────
    JS = "journal search "
    if command.startswith(JS) and len(command) > len(JS):
        return _journal_search(command[len(JS):])

    # ── not on allowlist → blocked keyword check ───────────────────────
    reason = contains_blocked_keyword(command)
    if reason:
        return _result("blocked", command, f"BLOCKED: {reason}")

    return _result(
        "blocked", command,
        f"Unknown command: '{command}'. Use 'help' to list allowed commands.",
    )


# ── command implementations ─────────────────────────────────────────────


def _result(status: str, command: str, output: str) -> dict:
    return {"status": status, "command": command, "output": output.strip()}


def _run_brief(brief_type: str) -> dict:
    cmd = ["bash", str(SCRIPTS_DIR / "run_daily_brief.sh"), brief_type, "--dry-run"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR, timeout=60)
        out = (r.stdout or "") + (r.stderr or "")
        status = "allowed" if r.returncode == 0 else "error"
        return _result(status, f"generate {brief_type} brief", out)
    except subprocess.TimeoutExpired:
        return _result("error", f"generate {brief_type} brief", "Command timed out after 60 s")
    except FileNotFoundError:
        return _result("error", f"generate {brief_type} brief", "run_daily_brief.sh not found")


def _paper_trade_review() -> dict:
    ledger = SIGNALS_DIR / "paper_trade_ledger.md"
    if not ledger.exists():
        return _result("error", "run paper trade review", "paper_trade_ledger.md not found")

    text = ledger.read_text()
    trades = []
    in_table = False
    for line in text.splitlines():
        if line.startswith("| Trade ID |"):
            in_table = True
            continue
        if in_table and line.startswith("|---"):
            continue
        if in_table and line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) >= 3 and cells[0].startswith("PAPER-"):
                trades.append({
                    "trade_id": cells[0],
                    "ticker": cells[1],
                    "direction": cells[2],
                })

    if not trades:
        return _result("allowed", "run paper trade review", "No active paper trades found.")

    parts: list[str] = []
    score_script = SCRIPTS_DIR / "score_trade.py"
    for t in trades:
        parts.append(f"--- {t['trade_id']} ({t['ticker']} {t['direction']}) ---")
        if not score_script.exists():
            parts.append("ERROR: score_trade.py not found")
            continue
        try:
            r = subprocess.run(
                [sys.executable, str(score_script),
                 "--catalyst", "3", "--evidence", "3",
                 "--liquidity", "4", "--risk-reward", "3",
                 "--invalidation", "4", "--policy-risk", "3"],
                capture_output=True, text=True, timeout=30,
            )
            parts.append((r.stdout or "").strip() + (r.stderr or "").strip())
        except subprocess.TimeoutExpired:
            parts.append("ERROR: score_trade.py timed out")

    return _result("allowed", "run paper trade review", "\n\n".join(parts))


def _show_file(rel: str, label: str) -> dict:
    path = SIGNALS_DIR / rel
    if not path.exists():
        return _result("error", f"show {label}", f"{rel} not found")
    return _result("allowed", f"show {label}", path.read_text())


def _risk_status() -> dict:
    lines: list[str] = ["=== Risk Status ==="]

    rf = POLICIES_DIR / "risk_rules.yaml"
    if rf.exists():
        for line in rf.read_text().splitlines():
            if line.startswith("mode:"):
                lines.append(f"Risk mode: {line.split(':', 1)[1].strip()}")
                break
    else:
        lines.append("Risk mode: UNKNOWN (risk_rules.yaml missing)")

    es = POLICIES_DIR / "emergency_stop.yaml"
    if es.exists():
        for line in es.read_text().splitlines():
            if line.startswith("enabled:"):
                v = line.split(":", 1)[1].strip()
                lines.append(f"Emergency stop enabled: {v}")
                if v.lower() == "true":
                    lines.append("  ⚠  Emergency stop IS active — live operations blocked.")
                break
    else:
        lines.append("Emergency stop: UNKNOWN (emergency_stop.yaml missing)")

    return _result("allowed", "show risk status", "\n".join(lines))


def _journal_search(query: str) -> dict:
    jf = JOURNAL_DIR / "trade_journal.md"
    if not jf.exists():
        return _result("error", f"journal search {query}", "trade_journal.md not found")
    try:
        r = subprocess.run(
            ["grep", "-n", "-i", query, str(jf)],
            capture_output=True, text=True, timeout=30,
        )
        out = r.stdout if r.stdout else f"No matches found for '{query}'"
        return _result("allowed", f"journal search {query}", out)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return _result("error", f"journal search {query}", "Search failed (grep unavailable or timeout)")


def _run_allowed(command: str) -> dict:
    """Dispatch an exactly-matched allowlist command."""
    dispatch_map = {
        "help": lambda: _result("allowed", "help", _help_text()),
        "show active paper trades": lambda: _show_file("paper_trade_ledger.md", "active paper trades"),
        "show performance summary": lambda: _show_file("performance_summary.md", "performance summary"),
        "show political catalysts": lambda: _show_file("political_catalysts.md", "political catalysts"),
        "show daily brief": lambda: _show_file("daily_market_brief.md", "daily brief"),
        "show risk status": _risk_status,
        "generate market open brief": lambda: _run_brief("market_open"),
        "generate midday brief": lambda: _run_brief("midday"),
        "generate market close brief": lambda: _run_brief("market_close"),
        "run paper trade review": _paper_trade_review,
    }
    return dispatch_map[command]()


def _help_text() -> str:
    return """Trading Lab — Allowed Commands

  generate market open brief   Generate market-open brief (dry-run)
  generate midday brief        Generate midday brief (dry-run)
  generate market close brief  Generate market-close brief (dry-run)
  run paper trade review       Score all active paper trades via score_trade.py
  show active paper trades     Print paper-trade ledger contents
  show performance summary     Print performance summary
  show political catalysts     Print political catalyst tracker
  show daily brief             Print latest daily market brief
  show risk status             Print risk mode and emergency-stop state
  journal search <query>       Search the trade journal for <query>
  help                         Show this help

This runner enforces a strict allowlist. Commands not listed above are
blocked.  NO trading execution, NO order placement, NO policy modification.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Allowlisted command runner for trading-agent-lab")
    parser.add_argument("--command", required=True, help="Command string to execute")
    args = parser.parse_args()

    command = args.command.strip()
    result = dispatch(command)
    log_entry(result)

    print(json.dumps(result, indent=2))

    return {"allowed": 0, "blocked": 1, "error": 2}.get(result["status"], 2)


if __name__ == "__main__":
    raise SystemExit(main())
