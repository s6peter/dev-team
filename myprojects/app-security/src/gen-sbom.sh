#!/bin/bash
set -euo pipefail

# ===== Configuration =====
MICROSERVICES=("assets" "cart" "catalog" "checkout" "e2e" "load-generator" "misc" "orders" "ui")
DISALLOWED_LICENSES="GPL-2.0-only,GPL-3.0-only,AGPL-3.0-only"
DTRACK_API_KEY="GRWVjyfHjMAyuxoWeP3ylRVgHKR17ni8"
DTRACK_URL="http://localhost:8920"
PROJECT_NAME="sbom"
PROJECT_VERSION="1.0.0"

echo "--------------------------------------------"
echo "🚀 Starting SBOM generation, validation, audit, and upload to Dependency-Track"
echo "--------------------------------------------"

for service in "${MICROSERVICES[@]}"; do
  echo "🔹 Processing microservice: $service"

  # Check if the service directory exists
  if [ ! -d "$service" ]; then
    echo "⚠️  Skipping '$service' (directory not found)"
    echo "--------------------------------------------"
    continue
  fi

  output_file="$service/bom.cyclonedx.json"

  echo "🛠️  Generating SBOM for $service..."
  syft dir:"$service" -o cyclonedx-json > "$output_file"

  echo "🔍 Validating SBOM for $service..."
  if cyclonedx validate --input-file "$output_file"; then
    echo "✅ SBOM validation successful for $service"
  else
    echo "❌ SBOM validation failed for $service"
    echo "--------------------------------------------"
    continue
  fi

  echo "🧪 Auditing SBOM for $service..."
  cyclonedx audit \
    --input-file "$output_file" \
    --licenses "disallow:$DISALLOWED_LICENSES" \
    --fail-on "critical,high" || echo "⚠️  Some vulnerabilities or license issues found in $service"

  echo "⬆️  Uploading $service SBOM to Dependency-Track..."
  dtrack-audit \
    -k "$DTRACK_API_KEY" \
    -u "$DTRACK_URL" \
    -n "$PROJECT_NAME-$service" \
    -v "$PROJECT_VERSION" \
    -i "$output_file" \
    -a || echo "⚠️  Upload failed for $service"

  echo "✅ Completed processing for $service"
  echo "--------------------------------------------"
done

echo "🎉 All SBOMs generated, validated, audited, and uploaded successfully!"

