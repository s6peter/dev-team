# Daily Market Brief Prompt

Use this prompt to generate a phone-ready daily market brief.

---

Use `$trading-research`.

This is a research and paper-trading brief only.

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
7. `signals/political_catalysts.md`
8. `journal/trade_journal.md`

Tasks:

1. Summarize current mode and blocked actions.
2. Summarize active paper trades.
3. Summarize watchlist changes.
4. Summarize public political/regulatory catalysts.
5. Identify risk alerts.
6. List allowed actions for today.
7. Produce three brief variants when requested:
   - market_open
   - midday
   - market_close
8. Use Robinhood read-only market data only.
9. Write the output to `signals/daily_market_brief.md`.
10. Do not approve real trading.
