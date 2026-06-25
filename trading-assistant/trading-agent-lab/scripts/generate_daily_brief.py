#!/usr/bin/env python3
"""Generate signals/daily_market_brief.md from local project state.

This script does not call Robinhood, place trades, create order reviews, or send
notifications. It composes a local brief from checked-in project files.
"""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path


CONFIG = Path("config/automation_preferences.yaml")
LEDGER = Path("signals/paper_trade_ledger.md")
PERFORMANCE = Path("signals/performance_summary.md")
CATALYSTS = Path("signals/political_catalysts.md")
OUTPUT = Path("signals/daily_market_brief.md")


def extract_table_row(text: str, prefix: str) -> str:
    for line in text.splitlines():
        if line.startswith(prefix):
            return line
    return "| None | - | - | - | - | - | - |"


def extract_nvda_summary(ledger_text: str) -> dict[str, str]:
    row = extract_table_row(ledger_text, "| PAPER-NVDA")
    cells = [cell.strip() for cell in row.strip().strip("|").split("|")]
    if len(cells) < 19:
        return {
            "trade_id": "None",
            "ticker": "-",
            "direction": "-",
            "entry": "-",
            "current": "-",
            "pnl": "-",
            "decision": "-",
        }
    return {
        "trade_id": cells[0],
        "ticker": cells[1],
        "direction": cells[2],
        "entry": cells[5],
        "current": cells[6],
        "pnl": f"{cells[10]} ({cells[11]})",
        "decision": cells[17],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the local daily market brief.")
    parser.add_argument(
        "--brief-type",
        choices=["market_open", "midday", "market_close"],
        default="market_open",
    )
    parser.add_argument("--output", default=str(OUTPUT))
    args = parser.parse_args()

    ledger_text = LEDGER.read_text()
    nvda = extract_nvda_summary(ledger_text)

    brief = f"""# Daily Market Brief

Brief date: {date.today().isoformat()}
Brief type: {args.brief_type}

## Status

- Mode: PAPER TRADING ONLY / research-only policy active
- Real trading approved: No
- Live testing enabled: No
- Autonomous trading enabled: No
- Order review created: No
- Robinhood order tools used: No
- Timezone: America/Chicago, Denton TX
- Delivery enabled: No, Discord webhook URL pending

## Delivery Schedule

| Brief | Local time | Purpose | Delivery status |
|---|---:|---|---|
| Market open | 08:35 CT | Pre-market/opening risk and watchlist brief | Discord pending webhook |
| Midday | 12:00 CT | Paper-trade and volatility check | Discord pending webhook |
| Market close | 15:10 CT | Closing review and next-day prep | Discord pending webhook |

Quiet hours: 20:00-07:00 CT by default.

## Market Regime

- Summary: Requires Robinhood read-only quote refresh or Market Research Agent update.
- Risk level: To be assigned by Risk Manager after fresh data.
- Data freshness: Use Robinhood read-only only.
- Data source preference: Robinhood read-only only.

## Watchlist

| Ticker | Reason watched | Catalyst | Status | Next action |
|---|---|---|---|---|
| NVDA | AI/data-center demand and semiconductor policy relevance | AI infrastructure demand; export-control policy | Active paper trade | Continue paper-only tracking |
| QQQ | Broad large-cap technology exposure | Tech/AI momentum | Watchlist only | Research only |
| XLK | Technology sector exposure | Sector momentum | Watchlist only | Research only |
| ORCL | AI cloud infrastructure read-through | Cloud capex and AI infrastructure demand | Watchlist only | Research only |
| XLE | Energy/geopolitical risk exposure | Oil and energy inflation sensitivity | Watchlist only | Research only |

Universe preference: liquid large-cap stocks, liquid ETFs, AI/technology focus, S&P 500 names. Crypto may be researched only; crypto trading is not allowed under current policy.

## Active Paper Trades

| Trade ID | Ticker | Direction | Entry | Current | P/L | Decision |
|---|---|---|---:|---:|---:|---|
| {nvda["trade_id"]} | {nvda["ticker"]} | {nvda["direction"]} | {nvda["entry"]} | {nvda["current"]} | {nvda["pnl"]} | {nvda["decision"]} |

## Risk Alerts

- No real trading approval exists.
- No order review should be created from this brief.
- Emergency-stop policy must be checked before any escalation.
- If ledger and journal conflict, use `signals/paper_trade_ledger.md`.

## Political / Regulatory Catalysts

- Semiconductor export-control policy remains relevant to NVDA.
- Only public sources may be used.
- No private personal data, leaks, gossip, or harassment content is allowed.

## Actions Allowed Today

- Market research
- Public-policy catalyst tracking
- Robinhood read-only quote checks
- Paper-trade ledger updates
- Performance summary updates
- Phone notification of this brief after user provides delivery settings

## Actions Not Allowed Today

- Real trading
- Order review
- `review_equity_order`
- `place_equity_order`
- `cancel_equity_order`
- Short selling
- Margin
- Options
- Crypto trading
- Autonomous trading
"""

    Path(args.output).write_text(brief)
    print(f"wrote: {args.output}")
    print("scope: PAPER/RESEARCH ONLY")
    print("real_trading_status: NOT APPROVED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
