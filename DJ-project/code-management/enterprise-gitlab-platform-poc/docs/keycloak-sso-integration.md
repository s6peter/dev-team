# Keycloak SSO Integration

This POC runs GitLab CE, SonarQube Community, Artifactory OSS, Keycloak, and Grafana OSS on one EC2 host through Docker Compose.

## Support Matrix

| Tool | Current image | Native Keycloak web SSO path |
|---|---|---|
| GitLab | `gitlab/gitlab-ce` | Supported with OmniAuth OpenID Connect. |
| Grafana | `grafana/grafana-oss` | Supported with Generic OAuth/OIDC. |
| SonarQube | `sonarqube:community` | Not supported natively. Use SonarQube Enterprise SAML, a third-party OIDC plugin, or front it with an auth proxy for a lab-only workaround. |
| JFrog Artifactory | `jfrog/artifactory-oss` | Not supported natively in OSS. Use a licensed JFrog Platform SAML/OIDC capability or an auth proxy for a lab-only workaround. |

## Create Keycloak OIDC Clients

Run this on the EC2 host after the containers are healthy:

```bash
export KEYCLOAK_ADMIN_PASSWORD='<keycloak-admin-password>'
export KEYCLOAK_PUBLIC_URL='http://<public-dns>:8080'
export GITLAB_URL='http://<public-dns>'
export GRAFANA_URL='http://<public-dns>:3000'

enterprise-gitlab-platform-poc/scripts/configure-keycloak-sso.sh
```

The script creates or updates the `boa-platform` realm plus confidential OIDC clients for `gitlab` and `grafana`. It prints the generated client secrets. Store those in your password manager or AWS Secrets Manager.

## GitLab OIDC

Recommended Keycloak client settings:

| Setting | Value |
|---|---|
| Client ID | `gitlab` |
| Client authentication | On |
| Authentication flow | Standard flow |
| Valid redirect URI | `http://<public-dns>/users/auth/openid_connect/callback` |
| Web origin | `http://<public-dns>` |

Add this to GitLab Omnibus config, replacing the host and secret values:

```ruby
gitlab_rails['omniauth_enabled'] = true
gitlab_rails['omniauth_allow_single_sign_on'] = ['openid_connect']
gitlab_rails['omniauth_block_auto_created_users'] = false
gitlab_rails['omniauth_auto_link_user'] = ['openid_connect']
gitlab_rails['omniauth_providers'] = [
  {
    name: 'openid_connect',
    label: 'Keycloak SSO',
    args: {
      name: 'openid_connect',
      scope: ['openid', 'profile', 'email'],
      response_type: 'code',
      issuer: 'http://<public-dns>:8080/realms/boa-platform',
      discovery: true,
      client_auth_method: 'basic',
      uid_field: 'preferred_username',
      client_options: {
        identifier: 'gitlab',
        secret: '<gitlab-client-secret>',
        redirect_uri: 'http://<public-dns>/users/auth/openid_connect/callback'
      }
    }
  }
]
```

For the Docker Compose deployment, edit `/opt/boa-platform/gitlab/config/gitlab.rb` inside the EC2 host and run:

```bash
docker exec gitlab gitlab-ctl reconfigure
docker restart gitlab
```

If discovery fails in the lab network, use explicit endpoints instead of `discovery: true`:

```ruby
discovery: false,
client_options: {
  identifier: 'gitlab',
  secret: '<gitlab-client-secret>',
  redirect_uri: 'http://<public-dns>/users/auth/openid_connect/callback',
  authorization_endpoint: 'http://<public-dns>:8080/realms/boa-platform/protocol/openid-connect/auth',
  token_endpoint: 'http://<public-dns>:8080/realms/boa-platform/protocol/openid-connect/token',
  userinfo_endpoint: 'http://<public-dns>:8080/realms/boa-platform/protocol/openid-connect/userinfo',
  jwks_uri: 'http://<public-dns>:8080/realms/boa-platform/protocol/openid-connect/certs'
}
```

Avoid disabling state or nonce outside short debugging sessions.

## Grafana OIDC

Recommended Keycloak client settings:

| Setting | Value |
|---|---|
| Client ID | `grafana` |
| Client authentication | On |
| Authentication flow | Standard flow |
| Valid redirect URI | `http://<public-dns>:3000/login/generic_oauth` |
| Web origin | `http://<public-dns>:3000` |

Add these environment variables to the `grafana` service and restart Grafana:

```yaml
environment:
  GF_SECURITY_ADMIN_USER: admin
  GF_SECURITY_ADMIN_PASSWORD: admin-change-me
  GF_SERVER_ROOT_URL: http://<public-dns>:3000
  GF_AUTH_GENERIC_OAUTH_ENABLED: "true"
  GF_AUTH_GENERIC_OAUTH_NAME: Keycloak
  GF_AUTH_GENERIC_OAUTH_CLIENT_ID: grafana
  GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET: <grafana-client-secret>
  GF_AUTH_GENERIC_OAUTH_SCOPES: openid email profile
  GF_AUTH_GENERIC_OAUTH_AUTH_URL: http://<public-dns>:8080/realms/boa-platform/protocol/openid-connect/auth
  GF_AUTH_GENERIC_OAUTH_TOKEN_URL: http://keycloak:8080/realms/boa-platform/protocol/openid-connect/token
  GF_AUTH_GENERIC_OAUTH_API_URL: http://keycloak:8080/realms/boa-platform/protocol/openid-connect/userinfo
  GF_AUTH_GENERIC_OAUTH_LOGIN_ATTRIBUTE_PATH: preferred_username
  GF_AUTH_GENERIC_OAUTH_EMAIL_ATTRIBUTE_PATH: email
  GF_AUTH_GENERIC_OAUTH_NAME_ATTRIBUTE_PATH: name
  GF_AUTH_GENERIC_OAUTH_ALLOW_SIGN_UP: "true"
  GF_AUTH_OAUTH_AUTO_LOGIN: "false"
```

`GF_AUTH_GENERIC_OAUTH_AUTH_URL` must stay on the public Keycloak URL because the browser follows it. `GF_AUTH_GENERIC_OAUTH_TOKEN_URL` and `GF_AUTH_GENERIC_OAUTH_API_URL` are called from inside the Grafana container, so use the Docker Compose service name `keycloak`.

Then run:

```bash
cd /opt/boa-platform
docker compose up -d grafana
```

## SonarQube Options

The current `sonarqube:community` deployment cannot be configured for native Keycloak SSO through supported SonarQube settings.

Use one of these paths:

1. Upgrade to an edition that supports SAML and configure Keycloak as a SAML IdP.
2. Install and maintain a third-party OIDC plugin for the lab only.
3. Put SonarQube behind an OIDC-aware reverse proxy for coarse access control, while keeping SonarQube local users for authorization.

For the SAML path, create a Keycloak SAML client with:

| Setting | Value |
|---|---|
| Client ID / SP entity ID | `sonarqube` |
| ACS URL | `http://<public-dns>:9000/oauth2/callback/saml` |
| NameID format | `username` or `email` |
| Attribute mappers | `login`, `name`, `email`, and optionally `groups` |

Use Keycloak IdP metadata:

```text
http://<public-dns>:8080/realms/boa-platform/protocol/saml/descriptor
```

## JFrog Artifactory Options

The current `artifactory-oss` deployment cannot be configured for native Keycloak web SSO through supported JFrog settings.

Use one of these paths:

1. Use licensed JFrog Platform SAML/OIDC SSO and configure Keycloak as the IdP.
2. Put Artifactory behind an OIDC-aware reverse proxy for lab-only coarse access control, while keeping Artifactory local users/tokens for repository permissions.

For the licensed SAML path, create a Keycloak SAML client after checking the exact SP metadata from the JFrog UI. Typical JFrog Platform 7.x values are:

| Setting | Typical value |
|---|---|
| SP entity ID | `jfrog-platform` or the entity ID shown by JFrog metadata |
| ACS URL | `http://<public-dns>:8082/ui/api/v1/auth/saml/loginResponse` |
| IdP metadata | `http://<public-dns>:8080/realms/boa-platform/protocol/saml/descriptor` |

Prefer JFrog-generated SP metadata over hand-written URLs when available.

## Validation

Check Keycloak discovery:

```bash
curl -s http://<public-dns>:8080/realms/boa-platform/.well-known/openid-configuration | jq .issuer
```

Check GitLab SSO:

```bash
curl -I http://<public-dns>/users/auth/openid_connect
docker exec gitlab grep -i "openid_connect" /var/log/gitlab/gitlab-rails/application_json.log | tail
```

Check Grafana SSO:

```bash
curl -I http://<public-dns>:3000/login/generic_oauth
docker logs grafana --tail 100
```
