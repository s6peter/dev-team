#!/usr/bin/env python3
"""Lightweight Telegram bot for trading-lab command relay.

No LLM. No thinking. Just: receive command → validate → forward to bridge → reply.
"""
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone

import requests

BRIDGE_URL = "http://127.0.0.1:18790/api/v1/command"
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ALLOWED_USERS = {"8232206365"}  # Telegram user IDs allowed to use this bot
POLL_INTERVAL = 2  # seconds between poll requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "telegram_bot.log")
        ),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("telegram_bot")


def tg_url(method: str) -> str:
    return f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"


MAX_MSG_LEN = 4000  # Telegram limit is 4096, leave room for markers

CRYPTO_TICKERS = {"BTC", "ETH", "SOL", "XRP", "ADA", "DOGE"}
STOCK_TICKERS = {"NVDA", "AMAT", "AAPL", "CSCO", "MSFT", "META", "ORCL", "SPCX"}


def send_message(chat_id: int, text: str) -> bool:
    if len(text) > MAX_MSG_LEN:
        text = text[: MAX_MSG_LEN - 80] + f"\n\n... (truncated, {len(text)} chars total)"
    resp = requests.post(tg_url("sendMessage"), json={
        "chat_id": chat_id,
        "text": text,
    }, timeout=10)
    if not resp.ok:
        log.error("sendMessage failed: %s %s", resp.status_code, resp.text)
    return resp.ok


def send_help(chat_id: int):
    send_message(chat_id, (
        "Trading Lab Commands\n\n"
        "  show active paper trades\n"
        "  show crypto trades\n"
        "  show stock trades (or: show stocks)\n"
        "  show performance summary\n"
        "  show political catalysts\n"
        "  show daily brief\n"
        "  show risk status\n"
        "  run paper trade review\n"
        "  generate market open brief\n"
        "  generate midday brief\n"
        "  generate market close brief\n"
        "  help\n\n"
        "This bot relays commands to the trading-lab bridge. No trades execute."
    ))


def _normalize_cmd(text: str) -> str | None:
    """Match flexible user input to a canonical bridge command."""
    text = text.strip().lower()

    canonical = {
        "generate market open brief": "generate market open brief",
        "generate midday brief": "generate midday brief",
        "generate market close brief": "generate market close brief",
        "run paper trade review": "run paper trade review",
        "show active paper trades": "show active paper trades",
        "show performance summary": "show performance summary",
        "show political catalysts": "show political catalysts",
        "show daily brief": "show daily brief",
        "show risk status": "show risk status",
    }

    # Filter variants — maps to bridge command with a filter hint
    filter_map = {
        "show crypto trades": "show active paper trades:crypto",
        "show crypto": "show active paper trades:crypto",
        "show stock trades": "show active paper trades:stocks",
        "show stocks": "show active paper trades:stocks",
    }

    if text in filter_map:
        return filter_map[text]

    if text in canonical:
        return canonical[text]

    # Fuzzy: strip trailing/leading noise
    cleaned = text.strip(".,!?;:'\"").strip()
    if cleaned in canonical:
        return canonical[cleaned]
    if cleaned in filter_map:
        return filter_map[cleaned]

    # Singular/plural normalization
    no_s = cleaned.rstrip("s")
    for cmd in canonical:
        if cmd.rstrip("s") == no_s:
            return canonical[cmd]
    for cmd in filter_map:
        if cmd.rstrip("s") == no_s:
            return filter_map[cmd]

    # prefix match
    for cmd, mapped in canonical.items():
        if cleaned.startswith(cmd):
            return mapped
    for cmd, mapped in filter_map.items():
        if cleaned.startswith(cmd):
            return mapped

    if text.startswith("help"):
        return "help"

    return None


def process_command(text: str, chat_id: int):
    raw_cmd = _normalize_cmd(text)

    if raw_cmd is None:
        send_message(chat_id, f"Unknown command.\n\nSend `help` to see allowed commands.")
        return

    if raw_cmd == "help":
        send_help(chat_id)
        return

    # Parse optional filter suffix: "base_command:filter_type"
    cmd = raw_cmd
    filter_type = None
    if ":" in raw_cmd:
        cmd, _, filter_type = raw_cmd.partition(":")
        if filter_type not in ("crypto", "stocks"):
            filter_type = None

    # Forward to trading bridge
    try:
        resp = requests.post(BRIDGE_URL, json={"command": cmd}, timeout=30)
        if resp.ok:
            data = resp.json()
            log.info("bridge ok: command=%s status=%s", text, data.get("status"))
            output = data.get("output", "(no output)")
            if filter_type == "crypto":
                output = "\n".join(
                    line for line in output.split("\n")
                    if any(t in line for t in CRYPTO_TICKERS)
                ) or "No crypto positions found."
                output = f"Crypto Paper Trades\n\n{output}"
            elif filter_type == "stocks":
                output = "\n".join(
                    line for line in output.split("\n")
                    if any(t in line for t in STOCK_TICKERS)
                ) or "No stock positions found."
                output = f"Stock Paper Trades\n\n{output}"
            send_message(chat_id, output)
        else:
            log.error("bridge error: %s %s", resp.status_code, resp.text)
            send_message(chat_id, f"Bridge error: HTTP {resp.status_code}")
    except requests.exceptions.ConnectionError:
        log.error("bridge unreachable")
        send_message(chat_id, "Trading bridge is not running. Start it with:\n`python3 scripts/trading_bridge.py`")
    except Exception as e:
        log.exception("unexpected error processing command")
        send_message(chat_id, f"Error: {e}")


def main():
    if not BOT_TOKEN:
        log.error("TELEGRAM_BOT_TOKEN not set")
        sys.exit(1)

    log.info("Starting telegram bot polling...")
    offset = 0

    while True:
        try:
            resp = requests.get(tg_url("getUpdates"), json={
                "offset": offset,
                "timeout": 30,
                "allowed_updates": ["message"],
            }, timeout=35)
            if not resp.ok:
                log.warning("getUpdates failed: %s %s", resp.status_code, resp.text)
                time.sleep(5)
                continue

            updates = resp.json().get("result", [])
            for update in updates:
                offset = update["update_id"] + 1
                msg = update.get("message")
                if not msg:
                    continue

                chat_id = msg["chat"]["id"]
                user_id = str(msg["from"]["id"])
                text = msg.get("text", "")

                if user_id not in ALLOWED_USERS:
                    log.warning("blocked user %s (%s)", user_id, msg["from"].get("username", "?"))
                    send_message(chat_id, "You are not authorized to use this bot.")
                    continue

                log.info("command from %s: %s", user_id, text)
                process_command(text, chat_id)

        except requests.exceptions.Timeout:
            pass  # long poll timeout is normal
        except Exception as e:
            log.exception("poll loop error")
            time.sleep(5)


if __name__ == "__main__":
    main()
