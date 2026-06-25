# Refresh Quote And Send Brief Prompt

Use this prompt from Codex, Hermes, or OpenClaw when a scheduled brief should refresh paper-trade prices before sending.

---

Use `$trading-research`.

This is PAPER TRADE ONLY and research-only.

Do not place trades.
Do not cancel orders.
Do not create order reviews.
Do not use `review_equity_order`.
Do not use `place_equity_order`.
Do not use `cancel_equity_order`.

Read:

1. `policies/risk_rules.yaml`
2. `policies/emergency_stop.yaml`
3. `signals/source_of_truth.md`
4. `config/automation_preferences.yaml`
5. `signals/paper_trade_ledger.md`
6. `signals/performance_summary.md`
7. `journal/trade_journal.md`

Tasks:

1. Identify all active paper trades from `signals/paper_trade_ledger.md`.
2. Use Robinhood read-only `get_equity_quotes` only for active paper-trade tickers.
3. Update `signals/paper_trade_ledger.md`.
4. Update `signals/performance_summary.md`.
5. Add a short paper-only update to `journal/trade_journal.md`.
6. Generate the requested brief type:
   - `market_open`
   - `midday`
   - `market_close`
7. Send the generated brief with `scripts/run_daily_brief.sh <brief_type> --send`.

Rules:

- Real trading remains NOT APPROVED.
- If quote data is missing, stale, or contradictory, do not update the ledger; mark the paper trade NEEDS_REVIEW.
- If invalidation is hit, mark the paper trade NEEDS_REVIEW unless the user explicitly requested a paper close.
- If review target is hit, mark the paper trade NEEDS_REVIEW for possible paper profit-taking.
- Never use Robinhood order tools.
