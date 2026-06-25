# Codex Startup Prompt

Use this prompt when starting Codex inside the trading project.

---

Use `$trading-research`.

Read these files first:

1. `AGENTS.md`
2. `kb/trading_policy.md`
3. `kb/market_research_framework.md`
4. `kb/politician_tracker_policy.md`
5. `policies/risk_rules.yaml`
6. `journal/trade_journal.md`

Then summarize:

1. The current operating mode
2. The allowed Robinhood tools
3. The blocked Robinhood tools
4. The four agent roles
5. The required workflow before any trade
6. The exact approval phrase required for a real trade

Do not place trades.

Do not cancel orders.

Do not use `place_equity_order`.

Do not use `cancel_equity_order`.

After summarizing, ask me what I want to research.
