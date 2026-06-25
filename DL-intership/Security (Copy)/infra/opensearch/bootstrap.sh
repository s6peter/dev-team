#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${OPENSEARCH_URL:-}" || -z "${OPENSEARCH_USERNAME:-}" || -z "${OPENSEARCH_PASSWORD:-}" ]]; then
  echo "Set OPENSEARCH_URL, OPENSEARCH_USERNAME, and OPENSEARCH_PASSWORD before running." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTH="${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD}"

curl_json() {
  local method="$1"
  local path="$2"
  local file="$3"

  curl --fail-with-body --silent --show-error \
    --user "${AUTH}" \
    --request "${method}" \
    "${OPENSEARCH_URL}${path}" \
    --header "Content-Type: application/json" \
    --data-binary "@${file}"
}

curl_json PUT "/_plugins/_ism/policies/siem-hot-warm-delete" "${ROOT_DIR}/ism-policies/siem-hot-warm-delete.json"
curl_json PUT "/_ingest/pipeline/cloudtrail-enrichment" "${ROOT_DIR}/ingest-pipelines/cloudtrail-enrichment.json"
curl_json PUT "/_index_template/cloudtrail-logs" "${ROOT_DIR}/index-templates/cloudtrail-logs.json"

curl --fail-with-body --silent --show-error \
  --user "${AUTH}" \
  --request PUT \
  "${OPENSEARCH_URL}/cloudtrail-logs-000001" \
  --header "Content-Type: application/json" \
  --data-binary '{"aliases":{"cloudtrail-logs":{"is_write_index":true}}}' || true

echo "OpenSearch SIEM bootstrap complete."
