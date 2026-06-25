# Daily Market Brief

Brief date: 2026-06-12
Brief type: market_open

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
| PAPER-NVDA-2026-06-12-001 | NVDA | Long | $203.73 | $205.10 | +$0.67 (+0.67%) | KEEP |

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
