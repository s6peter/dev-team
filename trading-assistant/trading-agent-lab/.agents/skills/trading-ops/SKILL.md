---
name: trading-ops
description: Trading Lab Operations skill — run research and paper-trade commands through the allowlisted command runner. Never places real trades or modifies policies.
---

# Trading Lab Operations Skill

## Execution Rule (CRITICAL)

You MUST run ALL trading-lab commands through the command runner:

```
python3 scripts/command_runner.py --command "<command>"
```

Do NOT read signal files, ledger files, or journal files directly. Always use the command runner to access them. The command runner enforces the allowlist, logs all access, and blocks unsafe operations.

## Required Pre-read Files

Before any operation, read:

1. `AGENTS.md`
2. `policies/risk_rules.yaml`
3. `policies/emergency_stop.yaml`
4. `signals/source_of_truth.md`
5. `signals/paper_trade_ledger.md`

## Allowed Commands

Run with: `python3 scripts/command_runner.py --command "<command>"`

| Command | Action |
|---|---|
| `generate market open brief` | Generate market-open brief (dry-run) |
| `generate midday brief` | Generate midday brief (dry-run) |
| `generate market close brief` | Generate market-close brief (dry-run) |
| `run paper trade review` | Score all active paper trades |
| `show active paper trades` | Print paper-trade ledger |
| `show performance summary` | Print performance summary |
| `show political catalysts` | Print political catalyst tracker |
| `show daily brief` | Print latest daily market brief |
| `show risk status` | Print risk mode and emergency-stop state |
| `journal search <query>` | Search the trade journal |
| `help` | List all allowed commands |

## Hard Boundaries

- **NO trading execution.**
- **NO policy modification.**
- **NO margin, short selling, or options.**
- **NO live or autonomous trading.**
- **ALWAYS use the command runner — never read trading files directly.**

## Workflow Examples

### Show paper trades
```
python3 scripts/command_runner.py --command "show active paper trades"
```
Read the output and present it to the user.

### Search journal
```
python3 scripts/command_runner.py --command "journal search NVDA"
```
Read the output and present relevant entries.

### Check risk status
```
python3 scripts/command_runner.py --command "show risk status"
```
Read the output and explain the current risk mode.

## Architecture

```
Discord / Hermes / OpenClaw
        │
        ▼
  scripts/command_runner.py     ← allowlist enforcement + audit log
        │
        ├── scripts/run_daily_brief.sh   (dry-run only)
        ├── scripts/score_trade.py
        ├── signals/paper_trade_ledger.md
        ├── signals/performance_summary.md
        └── signals/political_catalysts.md
```

## Security Notes

- Every command attempt is logged to `logs/command_runner.log` with UTC timestamp.
- The runner returns structured JSON: `{"status", "command", "output"}`.
- Exit codes: 0 = allowed, 1 = blocked, 2 = error.
- This skill is designed for **Phase 1/2** (research and paper trading only).
