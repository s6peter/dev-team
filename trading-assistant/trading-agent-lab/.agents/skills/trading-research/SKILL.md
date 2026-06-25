---
name: trading-research
description: Use this skill for market research, public-policy catalyst tracking, Robinhood portfolio analysis, trading signal review, paper trading, and risk-controlled order review. Never place real trades unless the user explicitly approves with the required phrase.
---

# Trading Research Skill

## Purpose

This skill helps Codex follow a disciplined trading research workflow instead of making random trade suggestions.

It is designed for a trading-agent project that uses:

- Codex as the builder and operator
- Onyx as the knowledge base
- Robinhood MCP as the trading connection
- Separate agents for research, public policy, risk, and trading

---

## Required Files To Read First

Before producing trading analysis, read:

1. `AGENTS.md`
2. `kb/trading_policy.md`
3. `kb/market_research_framework.md`
4. `kb/politician_tracker_policy.md`
5. `policies/risk_rules.yaml`

---

## Step 1: Classify The Request

Classify the request as one of:

- market_research
- political_catalyst_tracking
- portfolio_analysis
- watchlist_building
- paper_trade
- real_trade_review
- real_trade_execution

If the request is `real_trade_execution`, stop unless the user wrote exactly:

"I approve"

---

## Step 2: Select The Correct Agent

Use the correct agent:

- Market research goes to `market_research`
- Public policy or political catalysts go to `politician_tracker`
- Risk checks go to `risk_manager`
- Robinhood portfolio/order tasks go to `trader_bot`

Do not let the Trader Bot create its own thesis.

---

## Step 3: Gather Evidence

For market research:

- Identify ticker or sector
- Identify catalyst
- Check source quality
- Check date relevance
- Separate fact from opinion
- Create bull case and bear case

For public policy catalyst tracking:

- Identify public catalyst
- Identify policy area
- Identify affected sectors
- Identify possible tickers or ETFs
- Check if impact is direct or indirect
- Avoid private personal data

For Robinhood:

Prefer read-only tools first:

- `get_accounts`
- `get_portfolio`
- `get_equity_positions`
- `get_equity_quotes`
- `get_equity_historicals`
- `get_equity_tradability`
- `get_equity_orders`
- `get_watchlists`
- `get_watchlist_items`
- `search`

For order testing:

- Use `review_equity_order`
- Do not use `place_equity_order` unless exact user approval exists

---

## Step 4: Produce Risk-First Output

Every recommendation must include:

- Ticker
- Direction
- Asset type
- Time horizon
- Thesis
- Catalyst
- Evidence
- Bull case
- Bear case
- Entry idea
- Exit idea
- Invalidation condition
- Position size
- Risk level
- Reason not to trade
- Final recommendation
- Action allowed

---

## Step 5: Risk Manager Review

Before any order review or trade execution:

1. Send the idea to the Risk Manager Agent.
2. Risk Manager must output one of:
   - APPROVED
   - REJECTED
   - NEEDS_MORE_INFO
3. If rejected, stop.
4. If more information is needed, gather more information.
5. If approved, continue only to allowed next step.

---

## Step 6: Journal Everything

Append meaningful research and decisions to:

`journal/trade_journal.md`

Use this format:

```markdown
## YYYY-MM-DD — TICKER OR SECTOR

- Agent:
- Request type:
- Thesis:
- Catalyst:
- Evidence:
- Risk:
- Risk Manager decision:
- Decision:
- Result:
- Lessons:
```

---

## Forbidden Behavior

* Do not promise profit.
* Do not place real trades without exact user approval.
* Do not trade options.
* Do not use margin.
* Do not short sell.
* Do not treat rumors as facts.
* Do not use private, hacked, leaked, or non-public information.
* Do not bypass the Risk Manager.
* Do not ignore `policies/risk_rules.yaml`.
