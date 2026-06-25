# Discord Integration Setup

Two options for Discord integration:

## Option 1: Discord Bot (for interactive commands)

Requires creating a Discord Application + Bot at https://discord.com/developers/applications

### Steps

1. Go to https://discord.com/developers/applications → New Application
2. Go to Bot → Reset Token → copy the token
3. Enable: Message Content Intent, Server Members Intent
4. Go to OAuth2 → URL Generator → scopes: `bot` → bot permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`
5. Use the generated URL to invite the bot to your server

### Register with OpenClaw

```bash
openclaw channels add --channel discord --token "YOUR_DISCORD_BOT_TOKEN"
```

Then restart the gateway:

```bash
openclaw gateway restart
```

### Verify

```bash
openclaw channels status --deep
```

---

## Option 2: Discord Webhook (for scheduled briefs only)

Already configured in `config/discord_schedule.md`.

Requires a Discord webhook URL from a Discord channel:

1. Discord channel → Edit Channel → Integrations → Webhooks → New Webhook
2. Copy the webhook URL
3. Set as environment variable:

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

Then test with:

```bash
scripts/run_daily_brief.sh market_open --send
```

---

## Security Notes

- **Discord bot cannot approve real trades.** Allowlist enforcement is in command_runner.py, not Discord.
- The bridge server only accepts localhost connections (127.0.0.1).
- Never commit Discord bot tokens or webhook URLs to the repo.
