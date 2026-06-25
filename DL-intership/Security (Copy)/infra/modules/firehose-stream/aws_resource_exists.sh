#!/usr/bin/env bash
set -euo pipefail

eval "$(
  jq -r '@sh "TYPE=\(.type) NAME=\(.name) REGION=\(.region)"'
)"

exists="false"

case "${TYPE}" in
  log_group)
    count="$(aws logs describe-log-groups --region "${REGION}" --log-group-name-prefix "${NAME}" --query "length(logGroups[?logGroupName=='${NAME}'])" --output text 2>/dev/null || echo 0)"
    if [[ "${count}" != "0" && "${count}" != "None" ]]; then
      exists="true"
    fi
    ;;
esac

jq -n --arg exists "${exists}" '{"exists":$exists}'
