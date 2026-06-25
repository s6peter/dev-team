#!/usr/bin/env bash
set -euo pipefail

: "${KEYCLOAK_CONTAINER:=keycloak}"
: "${KEYCLOAK_REALM:=boa-platform}"
: "${KEYCLOAK_ADMIN_URL:=http://localhost:8080}"
: "${KEYCLOAK_ADMIN_USER:=admin}"
: "${KEYCLOAK_ADMIN_PASSWORD:?Set KEYCLOAK_ADMIN_PASSWORD to the Keycloak admin password}"
: "${KEYCLOAK_PUBLIC_URL:?Set KEYCLOAK_PUBLIC_URL, for example http://host.example.com:8080}"
: "${GITLAB_URL:?Set GITLAB_URL, for example http://host.example.com}"
: "${GRAFANA_URL:?Set GRAFANA_URL, for example http://host.example.com:3000}"

command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "openssl is required" >&2; exit 1; }

kc() {
  docker exec "${KEYCLOAK_CONTAINER}" /opt/keycloak/bin/kcadm.sh "$@"
}

client_uuid() {
  local client_id="$1"
  kc get clients -r "${KEYCLOAK_REALM}" -q "clientId=${client_id}" 2>/dev/null | jq -r '.[0].id // empty'
}

client_secret() {
  local uuid="$1"
  kc get "clients/${uuid}/client-secret" -r "${KEYCLOAK_REALM}" 2>/dev/null | jq -r '.value // empty'
}

ensure_realm() {
  if kc get "realms/${KEYCLOAK_REALM}" >/dev/null 2>&1; then
    echo "Realm exists: ${KEYCLOAK_REALM}"
    return
  fi

  echo "Creating realm: ${KEYCLOAK_REALM}"
  kc create realms \
    -s "realm=${KEYCLOAK_REALM}" \
    -s enabled=true \
    -s displayName="BOA Platform"
}

ensure_oidc_client() {
  local client_id="$1"
  local redirect_uri="$2"
  local web_origin="$3"
  local secret_var="$4"
  local uuid secret

  uuid="$(client_uuid "${client_id}")"
  secret="${!secret_var:-}"

  if [ -n "${uuid}" ] && [ -z "${secret}" ]; then
    secret="$(client_secret "${uuid}")"
  fi

  if [ -z "${secret}" ]; then
    secret="$(openssl rand -hex 32)"
  fi

  if [ -z "${uuid}" ]; then
    echo "Creating OIDC client: ${client_id}"
    kc create clients -r "${KEYCLOAK_REALM}" \
      -s "clientId=${client_id}" \
      -s enabled=true \
      -s protocol=openid-connect \
      -s publicClient=false \
      -s standardFlowEnabled=true \
      -s directAccessGrantsEnabled=false \
      -s serviceAccountsEnabled=false \
      -s "secret=${secret}" \
      -s "redirectUris=[\"${redirect_uri}\"]" \
      -s "webOrigins=[\"${web_origin}\"]"
  else
    echo "Updating OIDC client: ${client_id}"
    kc update "clients/${uuid}" -r "${KEYCLOAK_REALM}" \
      -s enabled=true \
      -s protocol=openid-connect \
      -s publicClient=false \
      -s standardFlowEnabled=true \
      -s directAccessGrantsEnabled=false \
      -s serviceAccountsEnabled=false \
      -s "secret=${secret}" \
      -s "redirectUris=[\"${redirect_uri}\"]" \
      -s "webOrigins=[\"${web_origin}\"]"
  fi

  printf '%s=%s\n' "${secret_var}" "${secret}"
}

kc config credentials \
  --server "${KEYCLOAK_ADMIN_URL}" \
  --realm master \
  --user "${KEYCLOAK_ADMIN_USER}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}" >/dev/null

ensure_realm

GITLAB_CLIENT_SECRET="$(ensure_oidc_client \
  gitlab \
  "${GITLAB_URL}/users/auth/openid_connect/callback" \
  "${GITLAB_URL}" \
  GITLAB_OIDC_CLIENT_SECRET | tail -n 1 | cut -d= -f2-)"

GRAFANA_CLIENT_SECRET="$(ensure_oidc_client \
  grafana \
  "${GRAFANA_URL}/login/generic_oauth" \
  "${GRAFANA_URL}" \
  GRAFANA_OIDC_CLIENT_SECRET | tail -n 1 | cut -d= -f2-)"

cat <<INFO

Keycloak SSO clients are ready.

Issuer:
${KEYCLOAK_PUBLIC_URL}/realms/${KEYCLOAK_REALM}

GitLab:
client_id=gitlab
client_secret=${GITLAB_CLIENT_SECRET}
callback=${GITLAB_URL}/users/auth/openid_connect/callback

Grafana:
client_id=grafana
client_secret=${GRAFANA_CLIENT_SECRET}
callback=${GRAFANA_URL}/login/generic_oauth

Next: apply the GitLab and Grafana settings from docs/keycloak-sso-integration.md.
INFO
