#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${1:-gitlab-runner}"
kubectl delete pod -n "${NAMESPACE}" --field-selector=status.phase=Failed || true
kubectl get pods -n "${NAMESPACE}"

