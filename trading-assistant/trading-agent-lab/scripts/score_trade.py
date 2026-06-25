#!/usr/bin/env python3
"""Score a paper-trade idea using the project risk-first criteria."""

from __future__ import annotations

import argparse


WEIGHTS = {
    "catalyst": 20,
    "evidence": 20,
    "liquidity": 15,
    "risk_reward": 20,
    "invalidation": 15,
    "policy_risk": 10,
}


def bounded(value: int) -> int:
    return max(0, min(5, value))


def main() -> int:
    parser = argparse.ArgumentParser(description="Score a paper-trade idea from 0-100.")
    for name in WEIGHTS:
        parser.add_argument(f"--{name.replace('_', '-')}", type=int, required=True, help="0-5 score")
    args = parser.parse_args()

    total = 0.0
    for name, weight in WEIGHTS.items():
        score = bounded(getattr(args, name))
        total += (score / 5) * weight

    if total >= 80:
        decision = "eligible_for_risk_review"
    elif total >= 60:
        decision = "watchlist_or_needs_more_info"
    else:
        decision = "reject"

    print(f"score: {total:.1f}")
    print(f"decision: {decision}")
    print("scope: PAPER TRADE ONLY")
    print("real_trading_status: NOT APPROVED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
