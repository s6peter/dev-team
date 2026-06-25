#!/usr/bin/env bash
set -euo pipefail

eval "$(
  jq -r '@sh "TYPE=\(.type) NAME=\(.name) REGION=\(.region)"'
)"

exists="false"

case "${TYPE}" in
  s3_bucket)
    if aws s3api head-bucket --bucket "${NAME}" --region "${REGION}" >/dev/null 2>&1; then
      exists="true"
    fi
    ;;
  log_group)
    count="$(aws logs describe-log-groups --region "${REGION}" --log-group-name-prefix "${NAME}" --query "length(logGroups[?logGroupName=='${NAME}'])" --output text 2>/dev/null || echo 0)"
    if [[ "${count}" != "0" && "${count}" != "None" ]]; then
      exists="true"
    fi
    ;;
  lambda_function)
    if aws lambda get-function --region "${REGION}" --function-name "${NAME}" >/dev/null 2>&1; then
      exists="true"
    fi
    ;;
  opensearch_domain)
    if output="$(aws resourcegroupstaggingapi get-resources --region "${REGION}" --resource-type-filters es:domain --query 'ResourceTagMappingList[].ResourceARN' --output text 2>&1)"; then
      if grep -qE "(^|[[:space:]])arn:aws:es:${REGION}:[0-9]{12}:domain/${NAME}([[:space:]]|$)" <<<"${output}"; then
        exists="true"
      fi
    elif output="$(aws opensearch describe-domain --region "${REGION}" --domain-name "${NAME}" 2>&1)"; then
      exists="true"
    elif grep -qE "ResourceNotFoundException|ValidationException" <<<"${output}"; then
      exists="false"
    else
      echo "Failed to determine whether OpenSearch domain '${NAME}' exists in region '${REGION}': ${output}" >&2
      exit 1
    fi
    ;;
  logs_resource_policy)
    count="$(aws logs describe-resource-policies --region "${REGION}" --query "length(resourcePolicies[?policyName=='${NAME}'])" --output text 2>/dev/null || echo 0)"
    if [[ "${count}" != "0" && "${count}" != "None" ]]; then
      exists="true"
    fi
    ;;
esac

jq -n --arg exists "${exists}" '{"exists":$exists}'
