# Paper Trade Review Prompt

Use this prompt when reviewing a paper trade idea.

---

Use `$trading-research`.

This is a paper trade review only.

Do not place real trades.

Do not cancel orders.

Do not use `place_equity_order`.

Task:

1. Review the proposed paper trade.
2. Confirm the ticker, direction, time horizon, thesis, catalyst, and invalidation condition.
3. Ask the Risk Manager to approve, reject, or request more information.
4. If approved, create a paper trade entry in `journal/trade_journal.md`.
5. Include:
   - fake entry price
   - fake position size
   - thesis
   - invalidation condition
   - target or exit plan
   - review date
6. Mark the action as PAPER TRADE ONLY.
7. Do not use Robinhood order tools.
