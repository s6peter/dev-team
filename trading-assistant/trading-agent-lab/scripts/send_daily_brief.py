#!/usr/bin/env python3
"""Send or preview the daily market brief.

Default mode is dry-run. To actually send to Discord, provide --webhook-url
or set DISCORD_WEBHOOK_URL and pass --send. This script never trades.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse


DEFAULT_BRIEF = Path("signals/daily_market_brief.md")
DISCORD_LIMIT = 1900


def chunks(text: str, limit: int = DISCORD_LIMIT) -> list[str]:
    parts: list[str] = []
    current = ""
    for line in text.splitlines():
        addition = line + "\n"
        if len(current) + len(addition) > limit and current:
            parts.append(current.rstrip())
            current = addition
        else:
            current += addition
    if current.strip():
        parts.append(current.rstrip())
    return parts


def send_discord(webhook_url: str, brief: str) -> None:
    parsed = urlparse(webhook_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Discord webhook must be the full https://discord.com/api/webhooks/... URL.")

    parts = chunks(brief)
    for index, part in enumerate(parts, start=1):
        suffix = "" if len(parts) == 1 else f"\n\n_part {index}/{len(parts)}_"
        payload = json.dumps({"content": part + suffix}).encode("utf-8")
        request = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "trading-agent-lab/0.1",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                print(f"sent discord part {index}: HTTP {response.status}")
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Discord webhook returned HTTP {error.code}: {body}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"Discord webhook request failed: {error.reason}") from error


def main() -> int:
    parser = argparse.ArgumentParser(description="Preview or send the daily market brief.")
    parser.add_argument("--brief", default=str(DEFAULT_BRIEF))
    parser.add_argument("--provider", choices=["discord", "generic"], default="discord")
    parser.add_argument("--webhook-url", default=os.environ.get("DISCORD_WEBHOOK_URL") or os.environ.get("DAILY_BRIEF_WEBHOOK_URL"))
    parser.add_argument("--send", action="store_true")
    args = parser.parse_args()

    brief = Path(args.brief).read_text()

    if not args.send:
        print(brief)
        print("\nDRY RUN: no notification sent.")
        return 0

    if not args.webhook_url:
        print("Missing webhook URL. Set DISCORD_WEBHOOK_URL or pass --webhook-url.", file=sys.stderr)
        return 2

    if args.provider == "discord":
        try:
            send_discord(args.webhook_url, brief)
            return 0
        except (RuntimeError, ValueError) as error:
            print(f"Send failed: {error}", file=sys.stderr)
            return 1

    payload = json.dumps({"text": brief}).encode("utf-8")
    request = urllib.request.Request(
        args.webhook_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "trading-agent-lab/0.1",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        print(f"sent: HTTP {response.status}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
