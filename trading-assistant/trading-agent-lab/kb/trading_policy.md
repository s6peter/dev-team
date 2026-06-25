# Trading Policy

## Mission

This project exists to build a careful trading research and execution system.

The goal is to eventually create an autonomous trading agent, but the system must earn autonomy through testing, journaling, and risk control.

Profit is the goal, but profit is never guaranteed.

The system must prioritize survival, risk control, and repeatable process over excitement.

---

## Trading Philosophy

The system should only trade when there is:

1. A clear thesis
2. A clear catalyst
3. A clear invalidation point
4. A reasonable position size
5. A reason not to trade
6. Risk Manager approval

No thesis means no trade.

No risk plan means no trade.

No journal entry means no trade.

---

## Build Phases

### Phase 1 — Research Only

In this phase, the system can:

- Research stocks and ETFs
- Study sectors
- Track market catalysts
- Read Robinhood portfolio data
- Read watchlists
- Read positions
- Read quotes
- Suggest paper trades

The system cannot:

- Place real trades
- Cancel real orders
- Trade options
- Use margin
- Trade crypto
- Trade based on rumors

---

### Phase 2 — Paper Trading

In this phase, the system can:

- Create simulated trades
- Create simulated equity short tests under Strategy D
- Track fake entries and exits
- Measure performance
- Record lessons
- Build confidence score for strategies

The system cannot:

- Place real trades
- Cancel real orders

Minimum requirement before moving to live testing:

- At least 30 trading days of paper-trading journal entries
- Positive or improving process quality
- Clear record of wins, losses, and mistakes

---

### Phase 3 — Human-Approved Live Testing

In this phase, the system can suggest tiny real trades.

Rules:

- Long equities, ETFs, and spot crypto only
- No options
- No margin
- Cash-only: order notional must be less than or equal to settled cash
- Do not use margin buying power or unsettled funds
- No short selling
- Maximum test trade size: $10 unless changed by the user
- Must use `review_equity_order` first
- For crypto, must use `robinhood_get_crypto` for order review first, then
  `robinhood_place_crypto_order` for execution. Both require the user to have
  authenticated via `robinhood_browser_login` first.
- Must reject any order requiring margin, borrowing, or notional greater than
  settled cash
- Must receive exact user approval phrase before execution

Required approval phrase:

"I approve"

Without that phrase, no real trade may be placed.

#### Spot Crypto Live Testing Workflow

Spot crypto live testing is allowed only for BTC, ETH, SOL, XRP, ADA, and DOGE.

Rules:

- Spot buys only.
- Cash-only and settled-cash-only.
- No crypto shorts.
- No leverage, futures, perpetuals, DeFi, staking, or yield products.
- Maximum test size: $10 unless changed by the user.
- Maximum position size: 10% of portfolio unless changed by the user.
- Risk Manager approval is required.
- A crypto order review is required before execution (use `robinhood_get_crypto`).
- Use `robinhood_place_crypto_order` for execution after review and approval.
- The exact approval phrase is still required before any real order path:
  "I approve"

---

### Phase 4 — Limited Autonomous Trading

This phase is not active by default.

The user must explicitly update `policies/risk_rules.yaml` before this phase can begin.

Autonomy may only be considered after:

- At least 60 calendar days of paper-trading or live-test data
- Acceptable drawdown
- Documented risk controls
- Emergency stop tested
- Clear strategy rules
- No major unresolved bugs
- User approval

---

## Forbidden Strategies At This Stage

The system must not live trade:

- Options
- Margin
- Short selling
- Futures
- Leveraged ETFs
- Penny stocks
- Illiquid stocks
- Meme stocks based only on hype
- Trades based on rumors
- Trades based on private information

Exception: paper-only equity short tests are allowed under Strategy D and
`policies/short_selling_policy.md`. This does not permit real short selling.

---

## Preferred Assets

The system should prefer:

- Large-cap stocks
- Liquid ETFs
- Broad market ETFs
- Sector ETFs
- Companies with reliable public information
- Assets with enough volume and clear pricing

---

## Required Reasoning Standard

Every trade idea must answer:

1. Why this asset?
2. Why now?
3. What is the catalyst?
4. What confirms the thesis?
5. What invalidates the thesis?
6. What is the downside?
7. What is the maximum loss?
8. Why should we not take this trade?
9. Is this better than doing nothing?

If these questions cannot be answered, the trade must be rejected.
