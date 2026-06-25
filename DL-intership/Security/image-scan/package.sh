#!/bin/bash

# Forgejo credentials and metadata
GIT_CLONE_USER="$GIT_CLONE_USER"
GIT_CLONE_TOKEN="$GIT_CLONE_TOKEN"
OWNER="WEBFORX"
PACKAGE_NAME="connect-deployment-images-scan"
URL="https://git.edusuc.net"

# Find the .doc file (e.g., august-01-2025-vulnerabilities_table.doc)
DOC_FILE=$(find . -maxdepth 1 -type f -name "*-vulnerabilities_table.doc" | head -n 1)

if [[ ! -f "$DOC_FILE" ]]; then
  echo "❌ No .doc file matching *-vulnerabilities_table.doc found."
  exit 1
fi

# Remove ./ if present
DOC_FILE=${DOC_FILE#./}

# Extract the date portion before -vulnerabilities_table.doc (e.g., august-01-2025)
DATE_STRING=${DOC_FILE%%-vulnerabilities_table.doc}

# Convert to mmyydd format
# Parse: month-name-day-year → MMDDYY
MONTH=$(date -d "$DATE_STRING" '+%m')
DAY=$(date -d "$DATE_STRING" '+%d')
YEAR=$(date -d "$DATE_STRING" '+%y')

VERSION="${MONTH}-${DAY}-${YEAR}"  

# Upload to Forgejo Generic Package Registry
curl --user "${GIT_CLONE_USER}:${GIT_CLONE_TOKEN}" \
     --upload-file "${DOC_FILE}" \
     "${URL}/api/packages/${OWNER}/generic/${PACKAGE_NAME}/${VERSION}/${DOC_FILE}"
