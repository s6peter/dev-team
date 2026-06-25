# Discord Daily Brief Schedule

This project is configured for three daily market briefs in Denton, TX time (`America/Chicago`).

## Schedule

| Brief | Local time | Command |
|---|---:|---|
| Market open | 08:35 CT | `scripts/run_daily_brief.sh market_open --send` |
| Midday | 12:00 CT | `scripts/run_daily_brief.sh midday --send` |
| Market close | 15:10 CT | `scripts/run_daily_brief.sh market_close --send` |

## Required Secret

Set this environment variable before sending:

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

Do not commit the webhook URL into the repo.

## Dry Run

Use dry-run mode until the webhook is configured:

```bash
scripts/run_daily_brief.sh market_open --dry-run
scripts/run_daily_brief.sh midday --dry-run
scripts/run_daily_brief.sh market_close --dry-run
```

Generated brief files:

- `signals/daily_market_brief_market_open.md`
- `signals/daily_market_brief_midday.md`
- `signals/daily_market_brief_market_close.md`

## Cron Example

Install only after confirming the webhook works:

```cron
35 8 * * 1-5 cd /home/persoba/v-projects/Trading-assistant/trading-agent-lab && DISCORD_WEBHOOK_URL="..." scripts/run_daily_brief.sh market_open --send
0 12 * * 1-5 cd /home/persoba/v-projects/Trading-assistant/trading-agent-lab && DISCORD_WEBHOOK_URL="..." scripts/run_daily_brief.sh midday --send
10 15 * * 1-5 cd /home/persoba/v-projects/Trading-assistant/trading-agent-lab && DISCORD_WEBHOOK_URL="..." scripts/run_daily_brief.sh market_close --send
```

The commands generate and send a research/paper-trading brief only. They do not place trades, cancel orders, create order reviews, or approve real trading.
