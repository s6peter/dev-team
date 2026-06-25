#!/usr/bin/env python3
"""Update one active paper trade row in signals/paper_trade_ledger.md.

This script is paper-trading only. It does not call Robinhood, create orders, or
approve real trading. Pass a current price that was obtained separately.
"""

from __future__ import annotations

import argparse
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


LEDGER = Path("signals/paper_trade_ledger.md")


def money(value: Decimal) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}${value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


def pct(value: Decimal) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}%"


def parse_money(value: str) -> Decimal:
    return Decimal(value.replace("$", "").replace("+", "").replace(",", "").strip())


def update_row(line: str, trade_id: str, current_price: Decimal) -> str:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    if not cells or cells[0] != trade_id:
        return line

    entry = parse_money(cells[5])
    fake_size = parse_money(cells[7])
    shares = Decimal(cells[8])
    current_value = current_price * shares
    pnl = (current_price - entry) * shares
    pnl_pct = (pnl / fake_size) * Decimal("100")

    cells[6] = f"${current_price.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"
    cells[9] = f"${current_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"
    cells[10] = money(pnl)
    cells[11] = pct(pnl_pct)
    cells[17] = "KEEP"
    cells[18] = "NOT APPROVED"

    return "| " + " | ".join(cells) + " |\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Update a paper-trade ledger row.")
    parser.add_argument("--trade-id", required=True)
    parser.add_argument("--current-price", required=True, type=Decimal)
    parser.add_argument("--ledger", default=str(LEDGER))
    args = parser.parse_args()

    ledger_path = Path(args.ledger)
    text = ledger_path.read_text()
    lines = text.splitlines(keepends=True)
    updated = [update_row(line, args.trade_id, args.current_price) for line in lines]

    if lines == updated:
        raise SystemExit(f"Trade ID not found or unchanged: {args.trade_id}")

    ledger_path.write_text("".join(updated))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
