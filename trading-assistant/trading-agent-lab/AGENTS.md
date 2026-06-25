# Trading Agent Lab — Codex Project Instructions

## Purpose

This project is for building a cautious autonomous trading research and execution system.

The long-term goal is to build an agent that can eventually trade autonomously, but the system must be built in controlled phases:

1. Knowledge base and research workflows
2. Market and public-policy signal generation
3. Paper trading
4. Human-approved small live trades
5. Limited autonomous trading only after proven performance

This project must never rush directly into autonomous live trading.

---

## Main Architecture

The system has four major agents:

1. Market Research Agent
2. Public Policy / Political Catalyst Tracker
3. Risk Manager Agent
4. Trader Bot

The agents must stay separated.

The Market Research Agent and Public Policy Tracker can create trade ideas, but they cannot place trades.

The Risk Manager Agent can approve, reject, or request more information, but it cannot place trades.

The Trader Bot can use Robinhood tools, but it must not create trade ideas by itself.

---

## Core Rule

AI can suggest.

Risk rules decide.

The user approves.

Robinhood executes only after approval.

---

## Operational Source Of Truth

Use `signals/source_of_truth.md` to decide which file owns each kind of trading state.

Current active paper-trade state lives in `signals/paper_trade_ledger.md`.

Paper-trading performance lives in `signals/performance_summary.md`.

Narrative history and lessons live in `journal/trade_journal.md`.

Emergency-stop conditions live in `policies/emergency_stop.yaml`.

If journal history conflicts with the paper-trade ledger, treat the ledger as the current paper-trade state and journal the inconsistency before continuing.

---

## Hard Safety Rules

- Never place a real trade unless the user explicitly writes: "I approve".
- Never call `place_equity_order` unless a risk report has been completed first.
- Always call `review_equity_order` before any real equity order.
- Always complete an approved crypto order review before any real crypto order;
  if no approved crypto order tool exists, provide a manual reviewed order ticket
  only and do not claim execution. As of 2026-06-13, `robinhood_place_crypto_order`
  is available via the `robinhood-for-agents` MCP server and may be used after
  risk review, crypto order review, and exact "I approve" phrase.
- Always check `policies/emergency_stop.yaml` before any order review or live-trading path.
- Never trade options unless the user creates a separate options policy.
- Never use margin.
- Never use margin buying power, unsettled funds, or any amount above settled
  available cash for live trades.
- Never use live short selling. Paper-only short simulations are allowed only
  under `policies/short_selling_policy.md` and Strategy D in
  `kb/trading_strategy.md`.
- Never use private, hacked, leaked, or non-public information.
- Never treat political information as a trade signal unless it is based on public sources.
- If market data is missing, stale, unclear, or contradictory, do not trade.
- If the risk rules reject a trade, do not continue toward execution.
- If the user asks for profit guarantees, explain that no trading system can guarantee profit.

---

## Approved Robinhood MCP Tools By Phase

### Phase 1 — Research Only

Allowed:

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

Not allowed:

- `place_equity_order`
- `cancel_equity_order`

### Phase 2 — Paper Trading

Allowed:

- All Phase 1 tools
- Local paper-trading journal updates
- Trade simulations
- Paper-only short simulations under Strategy D

Not allowed:

- `place_equity_order`
- `cancel_equity_order`

### Phase 3 — Human-Approved Live Testing

Allowed:

- All Phase 1 tools
- `review_equity_order`
- `place_equity_order` only if the user writes exactly: "I approve"
- `robinhood_browser_login` (one-time auth for the robinhood-for-agents MCP tools)
- `robinhood_check_session` (verify session is valid)
- `robinhood_get_crypto` (crypto quotes, history, positions)
- `robinhood_place_crypto_order` only if crypto live-testing rules pass and
  the user writes exactly: "I approve"
- `robinhood_get_orders` (view order history, requires auth via robinhood_browser_login first)
- `robinhood_get_account` (account details and profile)

Not allowed:

- Options
- Margin
- Any order that exceeds settled cash or requires margin/borrow
- Live short selling
- Crypto leverage, futures, perpetuals, and DeFi/yield products
- Large trades
- Unreviewed orders

### Phase 4 — Limited Autonomy

Only allowed after the user explicitly changes `policies/risk_rules.yaml`.

---

## Agent Roles

### Market Research Agent

Responsible for:

- Market trend research
- Company research
- Sector research
- Earnings and news catalysts
- Macro events
- Read-only Robinhood research (quotes, historicals, tradability, watchlists)
- Strategy-aligned trade idea generation (must match A1/A2/B/C from `kb/trading_strategy.md`)
- Regime filter check (SPY/200SMA, VIX) before every session
- Politician stock tracking via public disclosure aggregators (screening filter only)

Not allowed to:

- Place trades
- Review orders
- Execute Robinhood actions other than read-only research
- Recommend a trade that does not match a defined strategy
- Use rumors as facts
- Use private, hacked, leaked, or non-public information

---

### Public Policy / Political Catalyst Tracker

Responsible for:

- Public legislation tracking
- Regulatory changes
- Government contract news
- Public agency actions
- Public hearings
- Official statements
- Public financial disclosures
- Sector impact analysis

Not allowed to:

- Use private personal data
- Doxx anyone
- Use hacked or leaked information
- Harass or profile people personally
- Trade based on gossip
- Place trades

This agent tracks public market catalysts, not private personal lives.

---

### Risk Manager Agent

Responsible for:

- Reading `policies/risk_rules.yaml`
- Reviewing every trade idea
- Approving, rejecting, or requesting more information
- Checking trade size, thesis quality, invalidation, and risk

Not allowed to:

- Place trades
- Ignore risk rules
- Approve trades without a clear thesis
- Approve trades without a reason not to trade

---

### Trader Bot

Responsible for:

- Reading Robinhood account data
- Checking positions
- Checking quotes
- Checking tradability
- Reviewing orders with `review_equity_order`
- Executing only explicitly approved trades

Not allowed to:

- Create its own trade thesis
- Trade without Market Research + Risk Manager approval
- Trade without user approval
- Trade options
- Use margin
- Override risk limits

---

## Required Workflow For Any Trade Idea

1. Read this file: `AGENTS.md`
2. Read `kb/trading_policy.md`
3. Read `kb/market_research_framework.md`
4. Read `kb/trading_strategy.md` — entry/exit setups; trade ideas must match a defined strategy (A1/A2/B/C) or be rejected
5. Read `kb/politician_tracker_policy.md`
6. Read `policies/risk_rules.yaml`
7. Read `policies/emergency_stop.yaml`
8. Read `signals/source_of_truth.md`
9. Classify the request:
   - market research
   - political/public-policy catalyst
   - portfolio review
   - paper trade
   - real trade review
   - real trade execution
9. Use the correct agent.
10. Create a thesis.
11. Match the idea to a strategy in `kb/trading_strategy.md` (A1/A2/B/C); if it matches none, reject it.
12. Create a bear case.
13. Create an invalidation condition.
14. Send the idea to Risk Manager.
15. If rejected, stop.
16. If approved, only then use [ADDRESS] read-only tools or `review_equity_order`.
17. Do not place a real order without exact approval phrase.

---

## Required Trade Idea Format

Every trade idea must include:

- Ticker:
- Direction:
- Asset type:
- Strategy:
- Time horizon:
- Thesis:
- Catalyst:
- Evidence:
- Bull case:
- Bear case:
- Entry idea:
- Exit idea:
- Invalidation condition:
- Position size:
- Risk level:
- Reason not to trade:
- Risk Manager decision:
- Action allowed:

---

## Required Journal Rule

Every meaningful trade idea, paper trade, risk review, or real trade review must be added to:

`journal/trade_journal.md`

Use the format already defined in that file.

---

## Default Operating Mode

The default mode is:

`research_only`

Do not place trades in this mode.

---

## Operations Layer (OpenClaw + Hermes Agent)

### Architecture

```
Discord / Webhook / Chat
        │
        ▼
  OpenClaw Gateway              ← config/openclaw_gateway.yaml
  (webhook → command dispatch)
        │
        ▼
  Hermes Agent CLI              ← .agents/skills/trading-ops/SKILL.md
  (AI operations layer)
        │
        ▼
  scripts/command_runner.py     ← strict allowlist + audit log
        │
        ├── scripts/run_daily_brief.sh   (dry-run only)
        ├── scripts/score_trade.py
        ├── scripts/generate_daily_brief.py
        ├── signals/paper_trade_ledger.md
        ├── signals/performance_summary.md
        └── signals/political_catalysts.md
```

The operations layer wraps existing research and paper-trade scripts in an
allowlisted command runner. No agent in this layer has live trading permission.

### Security Boundaries

- **No agent** in this layer can call `place_equity_order`, `cancel_equity_order`,
  or `review_equity_order`.
- The command runner maintains an **allowlist** — any command not explicitly
  listed is blocked.
- **Keyword filtering** blocks commands containing `place`, `cancel`, `order`,
  `trade` (verb), `approve`, `live`, `auto`, `margin`, `short`, or `option`.
- Every attempt (allowed or blocked) is logged to `logs/command_runner.log`
  with a UTC timestamp.
- The runner returns structured JSON: `{"status", "command", "output"}` and
  exit codes: 0 = allowed, 1 = blocked, 2 = error.

### Allowed Commands

| Command | Action |
|---|---|
| `generate market open brief` | Generate market-open brief (dry-run) |
| `generate midday brief` | Generate midday brief (dry-run) |
| `generate market close brief` | Generate market-close brief (dry-run) |
| `run paper trade review` | Score all active paper trades via `score_trade.py` |
| `show active paper trades` | Print `signals/paper_trade_ledger.md` |
| `show performance summary` | Print `signals/performance_summary.md` |
| `show political catalysts` | Print `signals/political_catalysts.md` |
| `show daily brief` | Print latest `signals/daily_market_brief.md` |
| `show risk status` | Print risk mode and emergency-stop state |
| `journal search <query>` | Search `journal/trade_journal.md` for a keyword |
| `help` | List all allowed commands |

### Blocked Commands (Never Pass Through)

Any command containing: **place**, **cancel**, **order**, **trade** (verb),
**approve**, **live**, **auto**, **margin**, **short**, **option**.

Any command not on the allowlist above is blocked.

### Files Created

| File | Purpose |
|---|---|
| `scripts/command_runner.py` | Allowlisted CLI command runner with audit logging |
| `scripts/trading_bridge.py` | HTTP bridge server (port 18790) for programmatic command access |
| `.agents/skills/trading-ops/SKILL.md` | Hermes Agent skill definition for trading-lab operations |
| `config/openclaw_gateway.yaml` | OpenClaw-style gateway configuration |
| `config/discord_setup.md` | Discord bot/webhook setup guide |

### Connection Map

```
Telegram / CLI
     │
     ├── OpenClaw Gateway (port 18789, Telegram live)
     │       └── OpenClaw Agent reads workspace AGENTS.md → uses exec tool
     │
     ├── Hermes CLI (hermes chat -s trading-ops -q "...")
     │       └── Reads trading-ops skill → runs command_runner.py via terminal tool
     │
     └── Trading Bridge (port 18790, HTTP API)
             └── POST /api/v1/command → command_runner.py → signals/journal
```

### Current Status

| Layer | Status |
|---|---|
| `scripts/command_runner.py` | ✅ Working — 11 commands, keyword blocking, audit logging |
| `scripts/trading_bridge.py` | ✅ Running on port 18790 — HTTP API for programmatic access |
| Hermes CLI + trading-ops skill | ✅ Configured — external skill dir + terminal cwd set |
| OpenClaw Gateway | ✅ Running — Telegram bot live (@so4_jobs_bot) |
| OpenClaw workspace AGENTS.md | ✅ Updated — trading-lab instructions injected |
| OpenClaw model config | ✅ Fixed — qwen3:4b now at 32K context |
| Discord interactive bot | ⏳ Needs Discord bot token — see `config/discord_setup.md` |
| Discord webhook briefs | ⏳ Needs webhook URL — see `config/discord_schedule.md` |

### Quick Test Commands

```bash
# Direct CLI
python3 scripts/command_runner.py --command "show active paper trades"
python3 scripts/command_runner.py --command "show risk status"

# Via bridge (HTTP API)
curl -X POST http://127.0.0.1:18790/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command": "help"}'

# Via Hermes
hermes chat -s trading-ops -q "show active paper trades"
```
