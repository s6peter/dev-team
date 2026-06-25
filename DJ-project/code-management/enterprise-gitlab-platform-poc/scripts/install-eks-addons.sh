#!/usr/bin/env bash
set -euo pipefail

: "${GITLAB_URL:?Set GITLAB_URL, for example http://ec2-host}"
: "${RUNNER_TOKEN:?Set RUNNER_TOKEN from GitLab Admin Area > CI/CD > Runners}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

helm repo add gitlab https://charts.gitlab.io
helm repo add argo https://argoproj.github.io/argo-helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace gitlab-runner --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --values "${ROOT_DIR}/kubernetes/helm-values/gitlab-runner-values.yaml" \
  --set gitlabUrl="${GITLAB_URL}" \
  --set runnerToken="${RUNNER_TOKEN}"

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd \
  --values "${ROOT_DIR}/kubernetes/helm-values/argocd-values.yaml"

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring

kubectl apply -f "${ROOT_DIR}/gitops/dev/sample-api/namespace.yaml"
kubectl apply -f "${ROOT_DIR}/gitops/stage/sample-api/namespace.yaml"
kubectl apply -f "${ROOT_DIR}/gitops/prod/sample-api/namespace.yaml"

echo "EKS add-ons installed. Check pods with: kubectl get pods -A"

