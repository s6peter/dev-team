# Trading System Source Of Truth

This project separates narrative, state, reporting, and policy so the agents do not infer trading state from the wrong file.

## State Ownership

| Area | Source of truth | Purpose |
|---|---|---|
| Operating mode | `policies/risk_rules.yaml` | Determines whether the system is research-only, paper-only, live testing, or autonomous. |
| Active paper trades | `signals/paper_trade_ledger.md` | Canonical state for open simulated trades. |
| Paper performance | `signals/performance_summary.md` | Aggregated reporting based on the ledger. |
| Narrative audit trail | `journal/trade_journal.md` | Human-readable chronology of research, reviews, and lessons. |
| Daily market brief | `signals/daily_market_brief.md` | Snapshot intended for user review or phone notification. |
| Political catalysts | `signals/political_catalysts.md` | Public-policy signal log. |
| Emergency stop | `policies/emergency_stop.yaml` | Conditions that block escalation toward trading. |
| Automation preferences | `config/automation_preferences.yaml` | User preferences for schedule, notification delivery, data source, universe, and paper limits. |

## Read Order

1. Read `policies/risk_rules.yaml`.
2. Read `policies/emergency_stop.yaml`.
3. Read `signals/paper_trade_ledger.md` for active paper-trade state.
4. Read `signals/performance_summary.md` for aggregate performance.
5. Read `config/automation_preferences.yaml` for brief schedule and universe preferences.
6. Read `journal/trade_journal.md` only for supporting narrative and lessons.

## Rules

- Do not treat journal history as canonical if it conflicts with the ledger.
- Do not approve real trading from any signal file.
- Do not use `review_equity_order`, `place_equity_order`, or `cancel_equity_order` during paper-trade tracking.
- Do not enable live or autonomous trading unless the user explicitly updates policy and completes the required workflow.
