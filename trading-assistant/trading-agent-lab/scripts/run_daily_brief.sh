#!/usr/bin/env bash
set -euo pipefail

# Generate and optionally send a Discord daily market brief.
# Usage:
#   scripts/run_daily_brief.sh market_open --dry-run
#   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..." scripts/run_daily_brief.sh midday --send

brief_type="${1:-market_open}"
mode="${2:---dry-run}"
brief_file="signals/daily_market_brief_${brief_type}.md"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

case "$brief_type" in
  market_open|midday|market_close) ;;
  *)
    echo "Invalid brief type: $brief_type" >&2
    echo "Use: market_open, midday, or market_close" >&2
    exit 2
    ;;
esac

scripts/generate_daily_brief.py --brief-type "$brief_type" --output "$brief_file"

if [[ "$mode" == "--send" ]]; then
  scripts/send_daily_brief.py --provider discord --brief "$brief_file" --send
else
  scripts/send_daily_brief.py --provider discord --brief "$brief_file"
fi
