# Short Selling Policy

Status: ENABLED_FOR_PAPER_TESTING

Short selling is unblocked for simulated paper-trading only under Strategy D in
`kb/trading_strategy.md`. Live short selling remains blocked.

## Current Permission

- Paper equity short tests are allowed.
- Real/live equity short trades are not allowed.
- Do not use margin.
- Do not borrow shares.
- Reject any live short request that claims to be cash-only; live stock shorting
  requires borrow mechanics and conflicts with the no-margin/no-borrow rule.
- Do not use options.
- Do not use futures.
- Do not use leveraged ETFs.
- Do not use inverse ETFs as a short-selling workaround unless a separate ETF
  policy explicitly allows them.

## Required Setup For A Paper Short

Every paper short must have:

1. Strategy D classification.
2. Public macro or company-specific catalyst.
3. Market regime gate: SPY below 50D/200D SMA or VIX above 25.
4. Squeeze-risk check.
5. Defined entry, stop, and profit targets.
6. Maximum fake risk of 0.5% of paper portfolio.
7. Journal entry before or immediately after the simulated entry.
8. Risk Manager decision.

## Allowed Paper Short Catalysts

- War escalation or geopolitical shock affecting risk assets.
- Hot jobs report that increases rate-hike risk.
- Hawkish Fed rate decision, dot plot, or press conference.
- CPI/PCE inflation surprise that lifts yields.
- Credit, banking, liquidity, or sovereign-risk stress.
- Company-specific fundamental damage from credible public sources.

## Rejected Paper Short Setups

Reject paper short setups when:

- SPY is above both 50D and 200D SMA and VIX is below 20.
- The only catalyst is rumor, gossip, or social media panic.
- The stock is low float, illiquid, hard-to-borrow, or meme-squeeze prone.
- Earnings are within 5 trading days, unless earnings/guidance damage is the
  short thesis.
- No stop is defined.
- Risk/reward is below 2R to first target.

## Live Trading Boundary

There is no cash-only live stock shorting path in this project. Before any live
short testing, the user must explicitly update `policies/risk_rules.yaml`,
create a live short-selling policy, enable margin/borrow mechanics, and accept
that real short selling can lose more than the initial position size. Until
then:

REJECT all real short-selling requests.
