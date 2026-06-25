#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:=us-east-1}"
: "${CLUSTER_NAME:?Set CLUSTER_NAME to the EKS cluster name}"
: "${AWS_ACCOUNT_ID:=$(aws sts get-caller-identity --query Account --output text)}"
: "${ENABLE_EXTERNAL_DNS:=false}"
: "${HOSTED_ZONE_ID:=}"

aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"

helm repo add eks https://aws.github.io/eks-charts >/dev/null
helm repo add jetstack https://charts.jetstack.io >/dev/null
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null
helm repo add autoscaler https://kubernetes.github.io/autoscaler >/dev/null
helm repo add external-secrets https://charts.external-secrets.io >/dev/null
helm repo update >/dev/null

kubectl create namespace kube-system --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set region="${AWS_REGION}" \
  --set vpcId="$(aws eks describe-cluster --name "${CLUSTER_NAME}" --region "${AWS_REGION}" --query 'cluster.resourcesVpcConfig.vpcId' --output text)"

helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName="${CLUSTER_NAME}" \
  --set awsRegion="${AWS_REGION}"

helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace

if [ "${ENABLE_EXTERNAL_DNS}" = "true" ]; then
  if [ -z "${HOSTED_ZONE_ID}" ]; then
    echo "HOSTED_ZONE_ID is required when ENABLE_EXTERNAL_DNS=true" >&2
    exit 1
  fi
  helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/ >/dev/null
  helm repo update >/dev/null
  helm upgrade --install external-dns external-dns/external-dns \
    --namespace external-dns \
    --create-namespace \
    --set provider=aws \
    --set txtOwnerId="${CLUSTER_NAME}" \
    --set policy=sync \
    --set "domainFilters[0]=CHANGE_ME_example.com" \
    --set "extraArgs[0]=--aws-zone-type=public" \
    --set "extraArgs[1]=--zone-id-filter=${HOSTED_ZONE_ID}"
fi

echo "EKS add-ons installed or upgraded for ${CLUSTER_NAME}."
