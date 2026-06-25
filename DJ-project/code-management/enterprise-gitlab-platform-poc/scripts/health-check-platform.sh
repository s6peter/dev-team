#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"

echo "GitLab readiness:"
curl -fsS "${BASE_URL}/-/readiness" || true

echo
echo "Docker services:"
docker compose -f /opt/boa-platform/docker-compose.yml ps

