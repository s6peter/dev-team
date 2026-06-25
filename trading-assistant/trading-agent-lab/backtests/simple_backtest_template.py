#!/usr/bin/env python3
"""Simple paper-strategy backtest template.

Input CSV columns:
date,close,signal

signal values:
1 = long paper entry/hold
0 = flat

This is intentionally simple. It is for testing process quality before any
live-trading discussion, not for proving future profit.
"""

from __future__ import annotations

import argparse
import csv
from decimal import Decimal
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a simple long/flat paper backtest.")
    parser.add_argument("csv_file")
    parser.add_argument("--initial-cash", default="1000")
    args = parser.parse_args()

    cash = Decimal(args.initial_cash)
    shares = Decimal("0")
    entry_value = Decimal("0")
    trades = 0
    wins = 0
    losses = 0
    last_close = Decimal("0")

    with Path(args.csv_file).open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            close = Decimal(row["close"])
            signal = row["signal"].strip()
            last_close = close

            if signal == "1" and shares == 0:
                shares = cash / close
                entry_value = cash
                cash = Decimal("0")
                trades += 1
            elif signal == "0" and shares > 0:
                exit_value = shares * close
                pnl = exit_value - entry_value
                if pnl > 0:
                    wins += 1
                elif pnl < 0:
                    losses += 1
                cash = exit_value
                shares = Decimal("0")

    final_value = cash + (shares * last_close)
    total_pnl = final_value - Decimal(args.initial_cash)
    win_rate = "N/A" if trades == 0 else f"{(wins / trades) * 100:.1f}%"

    print(f"trades: {trades}")
    print(f"wins: {wins}")
    print(f"losses: {losses}")
    print(f"win_rate: {win_rate}")
    print(f"final_value: {final_value:.2f}")
    print(f"total_pnl: {total_pnl:.2f}")
    print("scope: PAPER BACKTEST ONLY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
