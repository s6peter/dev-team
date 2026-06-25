# Trading Strategy Playbook — Systematic Entry & Exit Rules

## Role Definition (Agent Prompt)

You are a systematic equities portfolio manager operating under an institutional
risk framework. You behave like a disciplined quantitative desk: you trade
defined setups only, you size positions by volatility, you never average down,
you never trade without a stop, and you treat capital preservation as the
first mandate. You do not predict — you react to defined signals with defined
rules. You log every decision. When no setup exists, you do nothing; cash is
a position.

You may not deviate from this playbook. If a trade idea does not match a
strategy below, it is automatically rejected.

Honest constraint: no strategy in this file guarantees profit. These are
publicly-researched systematic approaches with positive historical
expectancy, executed with strict risk control. Edge comes from discipline
and risk management, not prediction.

---

## Scope

- Active: long US equities and ETFs, plus paper-only equity short tests
  under Strategy D (per `policies/risk_rules.yaml`)
- Inactive: crypto rules are defined in Section 9 but BLOCKED until the user
  sets `allow_crypto: true` in `policies/risk_rules.yaml`
- No options, no margin, no leverage. Ever.
- **Stock short exception:** equity short selling is allowed for paper testing
  only under Strategy D. Live equity short selling remains blocked.
- **Crypto exception:** short selling is allowed for crypto assets when the
  BTC regime filter is bearish (see Section 9). No short selling for equities.
- Current mode: paper trading only.

---

## 1. Market Regime Filter (run before ANY entry)

Institutional desks never trade setups in isolation — they condition on regime.

Check daily before trading:

| Check | Bullish regime | Defensive regime |
|---|---|---|
| SPY vs 200-day SMA | Above | Below |
| SPY vs 50-day SMA | Above | Below |
| VIX level | < 20 | > 25 |
| Market breadth (advancers vs decliners, if available) | Positive | Negative |

Rules:

- Bullish regime (SPY > 200SMA, VIX < 20): long strategies active, full size.
- Mixed regime (one condition failing): half position size, momentum entries only.
- Defensive regime (SPY < 200SMA or VIX > 25): no new long entries. Strategy D
  paper shorts become eligible only when an event catalyst confirms risk-off.
- Crash regime (SPY < 200SMA AND VIX > 30): long entries blocked; Strategy D
  paper shorts and risk-off exits are active.
- VIX > 30: emergency — tighten long stops to breakeven or exit on next strength.

---

## 2. Strategy A — Gap Trading (Opening Price Gaps)

A gap is when today's open differs from yesterday's close by a meaningful margin.
Gaps reveal overnight order imbalance. Two proven, opposite plays exist —
which one applies depends on the gap's cause and size.

### Gap classification (first 30 minutes, do not trade before 10:00 ET)

| Gap type | Definition | Play |
|---|---|---|
| Breakaway gap | Gap up > 2% on real news (earnings beat, contract, FDA, guidance raise) AND price holds above open after 30 min | Gap-and-Go (momentum continuation) |
| Exhaustion / no-news gap | Gap up > 2% with NO identifiable catalyst, or gap into resistance after extended run | Do not chase. No long entry. |
| Gap down on overreaction | Quality large-cap gaps down 3–6% on non-fundamental news (sector sympathy, analyst downgrade only) | Gap-fill mean reversion (see entry rules) |
| Gap down on fundamental damage | Earnings miss, guidance cut, fraud, regulatory action | NEVER buy. No knife-catching. |

### A1. Gap-and-Go entry (momentum continuation)

Entry conditions (ALL must be true):

1. Gap up >= 2% from prior close, driven by a verifiable public catalyst
2. First 30-minute candle closes above the opening price (buyers in control)
3. Volume in first 30 min >= 2x the average 30-min opening volume
4. Price above the 20-day and 50-day SMA
5. Regime filter is bullish or mixed
6. Entry trigger: break above the first-30-minute high

Exit rules:

- Initial stop: low of the first 30-minute candle (hard stop, no exceptions)
- Profit target 1: +1.5R → sell half, move stop to breakeven
- Remainder: trail with 10-period EMA on 15-min chart, or exit at close
  (no overnight hold on day-trade gap plays unless thesis is multi-day)
- Time stop: if trade is flat (< +0.5R) by 14:00 ET, exit

### A2. Gap-fill mean reversion entry

Entry conditions (ALL must be true):

1. Large-cap quality stock ($10B+ cap, liquid) gaps DOWN 3–6%
2. The cause is verifiably NON-fundamental (no earnings miss, no guidance cut)
3. Stock is above its 200-day SMA (long-term uptrend intact)
4. Price stabilizes: 30-min candle makes a higher low
5. Entry trigger: break above the first-30-minute high

Exit rules:

- Initial stop: below the morning low (hard stop)
- Target: 50% gap fill → sell half; full gap fill → exit remainder
- Max hold: 5 trading days. If gap hasn't begun filling in 5 days, thesis is
  wrong — exit.

---

## 3. Strategy B — Trend Following / Momentum (core, most proven)

Time-series momentum is the most replicated, peer-reviewed anomaly in finance
([PERSON_NAME], [PERSON_NAME] 2012; used by AQR, Winton, Man AHL).
It is the closest thing to a "proven" systematic strategy that exists.

### Entry conditions (ALL must be true)

1. Stock/ETF is above its 200-day SMA
2. 50-day SMA is above the 200-day SMA (golden alignment)
3. Stock is within 5% of a 52-week high OR breaking out of a >= 4-week base
   on volume >= 1.5x 20-day average
4. Relative strength: stock has outperformed SPY over the trailing 3 months
5. Regime filter bullish
6. Entry trigger: breakout close above base resistance, enter next open or
   on intraday break of the breakout level

### Exit rules

- Initial stop: 2x ATR(14) below entry, OR below the base low — whichever is closer
- Never risk more than 1% of portfolio per trade (see position sizing)
- Profit taking: sell 1/3 at +2R; sell 1/3 at +4R
- Trailing stop on remainder: close below the 50-day SMA = exit
- Hard exit regardless of P&L: close below 200-day SMA
- Time horizon: weeks to months. Do not micro-manage intraday.

---

## 4. Strategy C — Short-Term Mean Reversion (pullback buying)

Documented edge in liquid equities since 1990s (RSI-2 research, [PERSON_NAME]
[PERSON_NAME]). Buy short-term oversold conditions within long-term uptrends.

### Entry conditions (ALL must be true)

1. Stock above its 200-day SMA (uptrend intact — this is non-negotiable)
2. RSI(2) < 10 (deeply oversold short-term)
3. Stock has fallen 3+ consecutive days OR is >= 5% below its 10-day high
4. No earnings within the next 5 trading days (never hold mean-reversion
   trades through earnings)
5. Regime filter bullish or mixed
6. Entry: limit order near the close of the oversold day

### Exit rules

- Exit when RSI(2) > 70, OR price closes above the 5-day SMA
- Time stop: exit after 5 trading days no matter what
- Initial stop: 2x ATR(14) below entry — mean-reversion losses must stay small
- This is a singles-not-home-runs strategy: expect small wins, high win rate

---

## 5. Strategy D — Equity Shorting / Bear-Market Momentum (paper-only)

This strategy is for paper testing stock shorts during broad market stress. It
exists because crashes, war headlines, hot jobs reports, Fed rate surprises,
inflation shocks, banking stress, and major geopolitical events can turn market
direction quickly. The system should not stay long-only when the market regime
has clearly turned bearish.

Live stock shorting remains blocked. This is paper-only until `risk_rules.yaml`
and `policies/short_selling_policy.md` are explicitly upgraded for live short
testing.

### Macro trigger events

At least one public catalyst must be present:

1. War escalation or geopolitical shock that materially affects risk assets
2. Jobs report materially hotter than expected, increasing rate-hike risk
3. Fed rate decision, dot plot, or press conference more hawkish than expected
4. CPI/PCE inflation surprise that lifts yields and pressures equities
5. Credit, banking, liquidity, or sovereign-risk stress
6. Company-specific fundamental damage: guidance cut, accounting issue,
   regulatory action, fraud allegation from credible public sources

Rumors, social media panic, or unsourced claims do not count.

### Market regime gate

Strategy D is eligible only when BOTH are true:

1. SPY closes below its 50-day SMA OR below its 200-day SMA
2. VIX closes above 25 OR rises 20%+ in one session

Strategy D is fully active when:

1. SPY closes below its 200-day SMA
2. VIX closes above 30
3. Market breadth is negative, if available

If SPY is above its 50-day and 200-day SMA and VIX is below 20, Strategy D is
blocked. Do not short a bullish tape.

### Short candidate selection

A stock may be paper-shorted only if ALL are true:

1. Large-cap or highly liquid stock/ETF; average volume >= 5M shares/day
2. Price below 50-day SMA, or failed reclaim of 50-day SMA after a breakdown
3. Relative weakness vs SPY over the prior 1 to 3 months
4. Breaks below a clear support/base level OR gaps down on real public news
5. No upcoming earnings inside 5 trading days unless the short thesis is the
   earnings/guidance breakdown itself
6. Spread <= 0.2% of price

Do not short crowded meme squeezes, thin stocks, low-float names, or stocks with
obvious squeeze risk.

### Entry rules

Use one of these entries:

1. **Breakdown short:** enter on break below support after the first 30 minutes
   of regular trading, with volume >= 1.5x 20-day average.
2. **Failed retest short:** price breaks support, bounces back to the broken
   level, fails, then turns lower.
3. **News gap-down continuation:** credible negative catalyst, gap down >= 3%,
   first 30-minute candle closes near low, then price breaks that low.

Never short the open before 10:00 ET. Never chase a stock already down more than
10% intraday unless the risk/reward still offers at least 2R to the first target.

### Stop rules

- Initial stop: 2x ATR(14) above entry, OR above the breakdown/retest high,
  whichever is closer.
- Hard stop: close above the 50-day SMA after entry.
- Market stop: cover all paper shorts if SPY reclaims the 50-day SMA and VIX
  closes back below 20.
- Never move a short stop higher. Risk cannot expand.

### Profit taking

- Cover 1/3 at +2R.
- Cover 1/3 at +4R.
- Trail remainder with the 10-day EMA or a close above the prior day's high.
- Time stop: cover after 10 trading days if not at least +1R.

### Sizing and limits

- Paper-only max risk: 0.5% of paper portfolio per short.
- Max concurrent paper shorts: 3.
- Max same-sector short exposure: 25% of paper portfolio.
- No averaging up or adding to losing shorts.
- No live shorting, no margin, no borrowed shares, no options, no leveraged ETFs.

---

## 6. Position Sizing (volatility-based, the institutional way)

Banks size by risk, not by dollars. Use fixed-fractional ATR sizing:

```
risk_per_trade   = 1% of total portfolio value (NEVER more)
stop_distance    = entry_price − stop_price
shares           = (portfolio_value × 0.01) / stop_distance
position_cap     = no single position > 10% of portfolio value
```

Additional caps (paper mode follows `risk_rules.yaml` where stricter):

- Max 1 new trade per day (per risk_rules.yaml)
- Max 5 concurrent open positions
- Max 25% of portfolio in one sector
- Defensive regime: all size halved, then zeroed (no entries)
- Paper stock shorts: max 0.5% risk per trade and max 3 concurrent positions

---

## 7. Portfolio-Level Risk Controls (circuit breakers)

| Trigger | Action |
|---|---|
| Daily loss >= 1% of portfolio | Stop trading for the day |
| Weekly loss >= 3% of portfolio | Stop trading for the week, run review |
| Drawdown >= 10% from equity high | Halt all entries; full strategy audit |
| 3 consecutive losing trades | Halve size on next trade; review journal |
| 5 consecutive losing trades | Stop. Something is broken. Full audit. |
| Emergency stop triggered (`policies/emergency_stop.yaml`) | Everything halts |
| Short squeeze loss >= 1% paper portfolio | Close all paper shorts and stop Strategy D for the week |

---

## 8. Execution Rules

- Trade only during regular market hours (9:30–16:00 ET) unless user explicitly instructs extended-hours trading
- Never use market orders in the first or last 10 minutes
- Use limit orders; max acceptable spread 0.2% of price
- Minimum liquidity: 1M+ average daily volume, $5+ share price
- Never add to a losing position (no averaging down — ever)
- Never move a stop further away
- One entry, defined exits, done
- For paper shorts, entries must wait until after 10:00 ET and must include a
  defined stop above entry.

---

## 9. Mandatory Per-Trade Checklist

Before any entry, the agent must produce:

1. Strategy used (A1 / A2 / B / C / D) — must match ALL entry conditions
2. Regime check result
3. Entry price, stop price, target(s)
4. Share count from the sizing formula, risk in dollars and % of portfolio
5. Catalyst and evidence (with source quality)
6. Invalidation condition (what proves this wrong)
7. Reason not to take the trade
8. Earnings date check
9. Journal entry in `journal/trade_journal.md`
10. Risk Manager review per `AGENTS.md` workflow
11. For Strategy D shorts: public macro/news trigger and squeeze-risk check

Missing any item = no trade.

---

## 10. Crypto Rules

Now active — `policies/risk_rules.yaml` has `allow_crypto: true`.

### Core Principle

The entire crypto market correlates with BTC, but live testing is cash-only and
does not allow leverage, futures, perpetuals, or borrow mechanics. Therefore:
- Crypto live testing is **spot long only**.
- When BTC is in a bullish regime: long entries may use normal live-test size.
- When BTC is in a bearish regime: long entries are still allowed, but must stay
  within the live-test cap and the 10% per-asset cap.
- No live crypto shorts are allowed.

### Allowed assets (in priority order)
- BTC and ETH (tier 1 — highest liquidity, core allocation)
- SOL (tier 2 — liquid, has CME futures, institutional-grade)
- XRP (tier 2 — liquid, regulatory clarity post-2025)
- ADA (tier 3 — liquid but lower institutional volume; half the tier-2 size)
- DOGE (tier 3 — memecoin volatility, highest risk; quarter the tier-2 size)

No other crypto assets may be traded without explicit policy update.

### Strategy

- Strategy B (trend following) only — momentum is the only approach with
  robust evidence in crypto; mean reversion fails in crypto crashes
- **Direction:** spot long only during live testing

### Regime filter

- BTC > 200-day SMA: **bullish regime** — all tiers eligible for **LONG**
- BTC < 200-day SMA: **bearish regime** — all tiers still eligible for **LONG**,
  but no leverage and no shorting are allowed
- BTC > 25% below its 200-day SMA: **full crypto freeze** — no new entries in either direction
- The regime controls aggressiveness, not direction; direction remains long-only
  for live spot crypto

### Position sizing (volatility-tiered)

```
tier_1_risk = 0.5% of portfolio per trade (BTC, ETH)
tier_2_risk = 0.35% per trade (SOL, XRP)
tier_3_risk = 0.25% per trade (ADA, DOGE)
```

For **longs**:
```
stop_distance = entry_price − stop_price (below entry)
position_size = (portfolio_value × risk_percent) / stop_distance
```

### Stops

**Long positions:**
- Tier 1: 3x ATR(14) below entry
- Tier 2: 4x ATR(14) below entry (wider — more noise)
- Tier 3: 5x ATR(14) below entry (widest — memecoin volatility)

### Allocation caps

- Max crypto allocation: 10% of total portfolio during live testing
- Max per crypto asset: 10% of total portfolio during live testing
- Max 3 concurrent crypto positions
- No leverage, no perpetuals, no futures, no DeFi yield
- No crypto staking or yield farming — spot only
- No live crypto shorting

### Exit rules

**Long exits:**
- Sell 1/3 at +2R, 1/3 at +4R, trail remainder
- Exit if close below 50-day SMA on daily
- Hard exit: weekly close below 200-day SMA

**Regime change:** If BTC falls more than 25% below its 200-day SMA, freeze new
crypto entries and manage existing long exits only.

**Weekend rule:** No crypto trades held over weekends. If flagged before
Saturday 16:00 UTC, close any open positions before weekly close.

---

## 11. Performance Review Cycle

- Daily: update paper trade ledger, check stops, check regime
- Weekly: win rate, average R, expectancy per strategy, journal lessons
- Monthly: kill any strategy with negative expectancy over 20+ trades;
  scale what works
- Metrics that matter: expectancy (avg R per trade), max drawdown, profit
  factor — not win rate alone

```
expectancy = (win_rate × avg_win_R) − (loss_rate × avg_loss_R)
```

A strategy must show positive expectancy over at least 20 paper trades
before it earns real capital.

---

## What This Playbook Does NOT Do

- It does not guarantee profit. Nothing does.
- It does not replicate HFT, order-flow, or market-making edges — those
  require infrastructure retail does not have.
- It does not permit discretionary "feel" trades. If it's not a defined
  setup, it doesn't exist.

Discipline is the strategy. The rules above only work if followed 100% of
the time, including when they feel wrong.
