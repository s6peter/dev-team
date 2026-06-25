# Stage 2 Report: GitLab Runner and Keycloak SSO Integration

## Executive Summary

Stage 2 completed the identity and runner planning layer for the DevSecOps platform POC. We integrated GitLab and Grafana with Keycloak using OpenID Connect, validated end-to-end SSO logins with a Keycloak realm user, documented the limits of SonarQube Community and Artifactory OSS SSO, and defined the runner model needed for GitLab CI/CD.

This stage is still a proof of concept, not a production build. The current environment runs on one EC2 instance using Docker Compose. A production-grade GitLab setup should separate GitLab services, use private networking, external PostgreSQL/Redis/object storage, TLS, backups, autoscaling runners, monitoring, and enterprise identity controls.

## Current Stage 2 Environment

AWS profile:

```text
gitlab-hosted-demo
```

Region:

```text
us-east-1
```

Primary EC2 instance:

```text
i-05990ea1ac37342b8
```

Public endpoint:

```text
ec2-98-81-54-40.compute-1.amazonaws.com
```

Public IP:

```text
98.81.54.40
```

Running services:

| Service | URL | Stage 2 status |
|---|---|---|
| GitLab CE | `http://ec2-98-81-54-40.compute-1.amazonaws.com` | Keycloak OIDC configured and validated |
| Grafana OSS | `http://ec2-98-81-54-40.compute-1.amazonaws.com:3000` | Keycloak OIDC configured and validated |
| Keycloak | `http://ec2-98-81-54-40.compute-1.amazonaws.com:8080` | Realm and OIDC clients configured |
| SonarQube Community | `http://ec2-98-81-54-40.compute-1.amazonaws.com:9000` | Native SSO not available in Community edition |
| Artifactory OSS | `http://ec2-98-81-54-40.compute-1.amazonaws.com:8082` | Native SSO not available in OSS edition |

## What Was Completed

### Keycloak

The existing `boa-platform` realm was used as the identity realm.

Configured OIDC clients:

| Client | Purpose | Redirect URI |
|---|---|---|
| `gitlab` | GitLab OmniAuth OpenID Connect | `http://ec2-98-81-54-40.compute-1.amazonaws.com/users/auth/openid_connect/callback` |
| `grafana` | Grafana Generic OAuth/OIDC | `http://ec2-98-81-54-40.compute-1.amazonaws.com:3000/login/generic_oauth` |

The clients are confidential OIDC clients using the standard authorization code flow.

### GitLab SSO

GitLab was configured through Omnibus `/etc/gitlab/gitlab.rb` inside the GitLab container.

Important settings:

```ruby
gitlab_rails['omniauth_enabled'] = true
gitlab_rails['omniauth_allow_single_sign_on'] = ['openid_connect']
gitlab_rails['omniauth_block_auto_created_users'] = false
gitlab_rails['omniauth_auto_link_user'] = ['openid_connect']
```

The final GitLab OIDC configuration uses explicit Keycloak endpoints instead of discovery. Discovery initially tried to use TLS against Keycloak's HTTP port, which produced an `SSL_connect` error. Explicit HTTP endpoints fixed that issue.

Validated GitLab behavior:

```text
GitLab SSO redirect: Keycloak authorization endpoint
GitLab redirect parameters: client_id, redirect_uri, response_type, scope, state, nonce
GitLab callback result: /dashboard/projects
```

A Keycloak realm user was used to validate that GitLab could create and sign in a GitLab user through OIDC.

### Grafana SSO

Grafana was configured through Docker Compose environment variables.

Important settings:

```yaml
GF_AUTH_GENERIC_OAUTH_ENABLED: "true"
GF_AUTH_GENERIC_OAUTH_NAME: Keycloak
GF_AUTH_GENERIC_OAUTH_CLIENT_ID: grafana
GF_AUTH_GENERIC_OAUTH_SCOPES: openid email profile
GF_AUTH_GENERIC_OAUTH_LOGIN_ATTRIBUTE_PATH: preferred_username
GF_AUTH_GENERIC_OAUTH_EMAIL_ATTRIBUTE_PATH: email
GF_AUTH_GENERIC_OAUTH_NAME_ATTRIBUTE_PATH: name
GF_AUTH_GENERIC_OAUTH_ALLOW_SIGN_UP: "true"
```

Grafana required split URLs:

| Grafana setting | Value type | Why |
|---|---|---|
| `GF_AUTH_GENERIC_OAUTH_AUTH_URL` | Public Keycloak URL | The user's browser follows this URL. |
| `GF_AUTH_GENERIC_OAUTH_TOKEN_URL` | Internal Docker URL `http://keycloak:8080/...` | Grafana server calls this from inside Docker. |
| `GF_AUTH_GENERIC_OAUTH_API_URL` | Internal Docker URL `http://keycloak:8080/...` | Grafana server calls this from inside Docker. |

The first Grafana attempt failed during token exchange because Grafana tried to call Keycloak through the EC2 public DNS from inside Docker. Docker resolved that path back to the host/container address and connection was refused. Switching token and userinfo calls to `http://keycloak:8080` fixed Grafana login.

Validated Grafana behavior:

```text
Grafana SSO redirect: Keycloak authorization endpoint
Keycloak credentials accepted
Grafana user lookup: platform-admin
```

### SonarQube and JFrog SSO Status

The current images are:

```text
sonarqube:community
releases-docker.jfrog.io/jfrog/artifactory-oss:latest
```

These editions do not provide first-class native Keycloak web SSO in a supported way.

Realistic options:

| Tool | Current blocker | Production option |
|---|---|---|
| SonarQube Community | No supported native SAML/OIDC login | Upgrade to an edition with SAML, use a maintained plugin for lab only, or put it behind an OIDC-aware reverse proxy. |
| Artifactory OSS | No supported native SAML/OIDC login | Use licensed JFrog Platform SSO or put it behind an OIDC-aware reverse proxy for lab-only coarse access control. |

## Why Keycloak Login Did Not Work With `root`

The `root` account is a local GitLab administrator account. It is not automatically a Keycloak user.

Keycloak has its own realm users. A user must exist in the `boa-platform` realm before that username can be used on the Keycloak login screen. During Stage 2, only `devuser1` existed at first. A dedicated SSO user was then created for validation.

Important distinction:

| Account | Where it exists | Used for |
|---|---|---|
| GitLab `root` | GitLab local database | Local GitLab administration |
| Keycloak `admin` | Keycloak master realm | Keycloak administration |
| Keycloak realm user | Keycloak `boa-platform` realm | SSO into GitLab/Grafana |

For SSO, use a user from the `boa-platform` realm, not the GitLab `root` user.

## Why Logging Into Keycloak Did Not Automatically Show Both Apps

Keycloak is the identity provider, not automatically an application launcher for every configured client.

Expected SSO behavior:

1. The user opens GitLab and clicks the Keycloak SSO link.
2. GitLab redirects the browser to Keycloak.
3. The user logs into Keycloak.
4. Keycloak redirects the browser back to GitLab with an authorization code.
5. GitLab exchanges that code for tokens and creates its own GitLab session.
6. If the same browser later opens Grafana and clicks the Keycloak SSO link, Grafana redirects to Keycloak.
7. Because the browser already has a Keycloak session cookie, Keycloak can usually skip the password prompt and redirect back to Grafana.
8. Grafana creates its own Grafana session.

What SSO does not mean by default:

- Logging into Keycloak admin console does not automatically log the user into GitLab and Grafana.
- Keycloak does not automatically create a polished user portal with launch buttons for all apps.
- Each application still creates and manages its own local session after Keycloak authenticates the user.
- The app must redirect to Keycloak first. Keycloak then authenticates and returns the user to that app.

If an app launcher experience is required, use one of these options:

| Option | Description |
|---|---|
| Keycloak account console links | Limited and not the same as a full enterprise app portal. |
| Grafana/GitLab bookmarks | Simple POC approach: users bookmark each app and click SSO. |
| Enterprise portal | Use Backstage, an internal developer portal, Okta, Azure AD, or another identity portal as the launchpad. |
| Custom landing page | Build a small internal portal with links to GitLab, Grafana, SonarQube, and Artifactory. |

The important result is that once a user has a valid Keycloak browser session, the second OIDC app should not require the password again unless the session expired, cookies are blocked, a different browser/incognito session is used, or the app requests forced re-authentication.

## GitLab Runner Concepts

GitLab Runner is the agent that executes GitLab CI/CD jobs. GitLab stores pipeline definitions and schedules jobs. Runners pick up those jobs and execute them on a chosen compute backend.

### Runner Scopes

Runner scope controls which projects are allowed to use a runner.

| Scope | Description | Typical use |
|---|---|---|
| Instance runner | Available to many or all projects on the GitLab instance. | Shared enterprise runner fleet. |
| Group runner | Available to projects inside one group/subgroup. | Department, platform, or application-team runner pool. |
| Project runner | Dedicated to one project. | Sensitive workloads, special tools, or isolated pipelines. |

Study version:

| Scope | Meaning | When to use |
|---|---|---|
| Instance runner | Shared across many projects. | Good for platform-wide shared runners. |
| Group runner | Shared within one group. | Good for one department, product line, or application team. |
| Project runner | Only for one project. | Good for sensitive workloads, special tools, or isolated pipelines. |

### Runner Access Modes

| Mode | Description | Recommendation |
|---|---|---|
| Tagged runner | Jobs must specify matching tags. | Recommended for production. |
| Untagged runner | Can pick up jobs without tags. | Avoid broadly in production. Useful for small labs. |
| Protected runner | Runs only protected branches/tags. | Use for deployment and release jobs. |
| Locked runner | Restricted to assigned project. | Use for dedicated project runners. |
| Paused runner | Registered but not accepting jobs. | Useful for maintenance. |

### Runner Executors

The executor is the backend that actually runs the job.

Study version:

| Executor | Meaning | Good for |
|---|---|---|
| Shell | Runs directly on the host. | Simple but unsafe for shared runners. |
| Docker | Runs jobs in containers. | Best first choice for this POC. |
| Kubernetes | Runs jobs as Kubernetes pods. | Best production-style choice. |
| SSH | Runs jobs on remote hosts. | Legacy or special cases. |
| Docker Autoscaler | Creates temporary cloud workers. | More advanced autoscaling. |

Detailed version:

| Executor | How it runs jobs | Pros | Cons | Production fit |
|---|---|---|---|---|
| Shell | Runs directly on the runner host shell. | Simple, fast, easy to debug. | Weak isolation; jobs can affect host. | Only for trusted admin jobs. |
| Docker | Runs each job in a Docker container. | Good isolation, reproducible images, common setup. | Docker socket can be risky; host still matters. | Good for small/medium self-managed setups. |
| Docker Machine / autoscaler | Creates ephemeral cloud VMs for jobs. | Stronger isolation; scale on demand. | More moving parts; Docker Machine path is legacy in many designs. | Use modern autoscaling patterns instead where possible. |
| Kubernetes | Runs each job as a Kubernetes pod. | Ephemeral, scalable, resource controls, good isolation. | Requires Kubernetes expertise and cluster operations. | Best general-purpose production option. |
| SSH | Runs jobs over SSH on remote machines. | Useful for legacy hosts. | Harder to isolate and audit. | Limited legacy use only. |
| Custom | User-defined executor integration. | Flexible for special platforms. | You own complexity and support. | Specialized cases. |
| VirtualBox/Parallels | Runs jobs in local VMs. | VM isolation on a single host. | Operationally heavy and less cloud-native. | Rare in modern AWS production. |

## Recommended Runner Strategy for This POC

For the current EC2 POC, use a Docker executor runner first.

Why:

- It matches the current Docker Compose host.
- It is simpler than EKS for the first working pipeline.
- It supports containerized builds and scanning tools.
- It can run the existing sample app CI templates.

Recommended POC runner:

```text
Runner type: instance or group runner
Executor: Docker
Tags: docker, linux, dev
Run untagged jobs: false
Protected: false for dev/test, true for release/deploy runner
Default image: ubuntu:22.04 or docker:stable depending on pipeline needs
```

## Step-by-Step Guide: Docker Runner on the EC2 Host

This path is best for the current Stage 2 lab.

The current GitLab version uses the newer runner creation workflow. That means the GitLab UI creates the runner first and gives you a runner authentication token that starts with:

```text
glrt-
```

With this new workflow, runner settings such as tags, locked/unlocked status, protected/unprotected status, and whether the runner can run untagged jobs are configured in GitLab, not passed as command-line flags during registration.

### Step 1: Open GitLab Runner Admin Page

Log into GitLab as an administrator.

Go to:

```text
Admin Area > CI/CD > Runners
```

Create a new instance runner.

Recommended settings:

| Setting | Value |
|---|---|
| Platform | Linux |
| Tags | `docker,linux,dev` |
| Run untagged jobs | Disabled |
| Protected | Disabled for lab; enabled for release runners |
| Description | `boa-docker-runner` |

Select **Create runner**.

Copy the runner authentication token shown by GitLab. It is displayed for a short time only. Treat this token like a secret.

### Step 2: Prepare Runner Config Directory

Connect to the EC2 host with SSM Session Manager:

```bash
AWS_PROFILE=gitlab-hosted-demo aws ssm start-session \
  --target i-05990ea1ac37342b8 \
  --region us-east-1
```

Become root and prepare a persistent runner configuration directory:

```bash
sudo -i
mkdir -p /opt/boa-platform/gitlab-runner/config
```

### Step 3: Start GitLab Runner Container

Check whether a runner container already exists:

```bash
docker ps -a --filter "name=gitlab-runner" --format "table {{.Names}}\t{{.Status}}"
```

If a `gitlab-runner` container already exists and is running, skip to registration. If it exists but is stopped, start it:

```bash
docker start gitlab-runner
```

If it does not exist, create it:

```bash
docker run -d \
  --name gitlab-runner \
  --restart always \
  -v /opt/boa-platform/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gitlab/gitlab-runner:latest
```

If Docker reports that the container name is already in use, do not create a second runner unless you intentionally want multiple runner managers. Either reuse the existing container or inspect it:

```bash
docker ps -a | grep gitlab-runner
docker logs gitlab-runner --tail 50
```

If a second container was accidentally created, for example `so4-runner`, you can still register that container, but for a clean lab it is better to use one runner container and one config directory.

### Step 4: Register the Runner

Replace `<runner-authentication-token>` with the token from GitLab.

```bash
docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url "http://ec2-98-81-54-40.compute-1.amazonaws.com" \
  --token "<runner-authentication-token>" \
  --executor "docker" \
  --name "boa-docker-runner" \
  --docker-image "ubuntu:22.04"
```

Do not add these flags when using a `glrt-` runner authentication token:

```text
--tag-list
--run-untagged
--locked
--access-level
--paused
--maximum-timeout
```

Those values are controlled in the GitLab UI for the runner you created.

If you accidentally pasted a real runner token into a chat, terminal recording, screenshot, or shared document, delete that runner in GitLab and create a new one. Runner tokens should be treated like credentials.

### Step 5: Configure Docker-in-Docker if Needed

If pipelines build container images, use a safer dedicated build runner. For a lab, Docker socket mounting is acceptable but not ideal.

Lab Docker build runner config can use:

```toml
[[runners]]
  executor = "docker"
  [runners.docker]
    image = "docker:27"
    privileged = true
    volumes = ["/certs/client", "/cache"]
```

Production should avoid broad privileged Docker-in-Docker where possible. Prefer Kubernetes executor with restricted build pods, Kaniko, BuildKit rootless, or a dedicated isolated builder.

### Step 6: Verify the Runner

On the EC2 host:

```bash
docker exec gitlab-runner gitlab-runner verify
docker exec gitlab-runner gitlab-runner list
cat /opt/boa-platform/gitlab-runner/config/config.toml
```

In GitLab, confirm the runner appears as online:

```text
Admin Area > CI/CD > Runners
```

### Step 7: Run a Test Pipeline

Add or update `.gitlab-ci.yml` in a test project:

```yaml
stages:
  - test

runner-smoke-test:
  stage: test
  tags:
    - docker
    - linux
    - dev
  image: ubuntu:22.04
  script:
    - echo "GitLab runner is working"
    - uname -a
```

Commit and push. The pipeline should be picked up by `boa-docker-runner`.

If the job stays pending, check these common causes:

| Symptom | Likely cause | Fix |
|---|---|---|
| Job says no runners are available | Tags do not match | Make sure the job tags exactly match `docker`, `linux`, and `dev`. |
| Runner is offline | Runner container is stopped or cannot reach GitLab | Run `docker ps`, `docker logs gitlab-runner`, and `gitlab-runner verify`. |
| Registration fails with reserved configuration error | Old CLI flags were used with a `glrt-` token | Register again without `--tag-list`, `--run-untagged`, or `--locked`. |
| Docker jobs fail to start | Docker socket or permissions issue | Confirm `/var/run/docker.sock` is mounted into the runner container. |

## Step-by-Step Guide: Kubernetes Executor Runner With Local Kind

This path was validated during Stage 2. GitLab runs on the AWS EC2 host, while the GitLab Runner manager and CI job pods run in a local `kind` Kubernetes cluster.

This proves an important production pattern:

```text
GitLab server separate from runners
Runner manager on Kubernetes
CI jobs created as short-lived Kubernetes pods
Tagged runners only
No broad Docker socket access
Separate runner pools by trust level
```

The local `kind` cluster is not production infrastructure, but it is a very good way to learn the Kubernetes executor before moving the same model to EKS or OpenShift.

### Step 1: Confirm Local Kubernetes Access

Check that `kubectl`, `helm`, and `kind` are installed:

```bash
kind get clusters
kubectl config current-context
kubectl get nodes -o wide
helm version
```

In this lab, the active local context was:

```text
kind-secure-ai
```

The cluster had one control-plane node and two worker nodes.

### Step 2: Create A GitLab Kubernetes Runner In The UI

In GitLab, create a new runner:

```text
Admin Area > CI/CD > Runners > New instance runner
```

Recommended settings:

| Setting | Value |
|---|---|
| Platform | Linux |
| Tags | `kind,kubernetes,linux,dev` |
| Run untagged jobs | Disabled |
| Protected | Disabled for lab; enabled for production deploy runners |
| Description | `boa-kind-kubernetes-runner` |

Select **Create runner**.

Copy the runner authentication token. It starts with:

```text
glrt-
```

Treat the token like a password. It is displayed only briefly in the UI.

### Step 3: Prepare The Helm Values File

A dedicated local-kind values file was created:

```text
kubernetes/helm-values/gitlab-runner-kind-values.yaml
```

Current contents:

```yaml
gitlabUrl: "http://ec2-98-81-54-40.compute-1.amazonaws.com"
runnerToken: "CHANGE-ME"

rbac:
  create: true

serviceAccount:
  create: true
  name: gitlab-runner-kind

metrics:
  enabled: true

runners:
  name: boa-kind-kubernetes-runner
  tags: "kind,kubernetes,linux,dev"
  executor: kubernetes
  runUntagged: false
  locked: false
  config: |
    [[runners]]
      name = "boa-kind-kubernetes-runner"
      request_concurrency = 2
      [runners.kubernetes]
        namespace = "gitlab-runner"
        image = "ubuntu:22.04"
        poll_timeout = 180
        cpu_request = "100m"
        memory_request = "128Mi"
        cpu_limit = "1"
        memory_limit = "1Gi"
        helper_cpu_request = "50m"
        helper_memory_request = "128Mi"
        service_cpu_request = "50m"
        service_memory_request = "128Mi"
```

Why these settings matter:

| Setting | Meaning |
|---|---|
| `gitlabUrl` | The GitLab server the runner connects to. |
| `runnerToken` | Placeholder. The real token is supplied at install time. |
| `rbac.create` | Creates Kubernetes permissions so the runner can create job pods. |
| `serviceAccount.name` | Service account used by the runner manager. |
| `runners.tags` | Jobs must use matching tags to run on this runner. |
| `executor: kubernetes` | Runner creates Kubernetes pods for CI jobs. |
| `namespace` | Job pods run in the `gitlab-runner` namespace. |
| `cpu_*` and `memory_*` | Basic resource requests and limits for job/helper pods. |

### Step 4: Install The GitLab Runner Helm Chart

From the project root:

```bash
cd /home/persoba/v-projects/DJ-project/code-management/enterprise-gitlab-platform-poc
```

Add/update the GitLab Helm repo:

```bash
helm repo add gitlab https://charts.gitlab.io
helm repo update gitlab
```

Create the namespace:

```bash
kubectl create namespace gitlab-runner
```

If the namespace already exists, that is fine:

```bash
kubectl get namespace gitlab-runner
```

Validate that the Helm values render correctly:

```bash
helm template gitlab-runner-kind gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --values kubernetes/helm-values/gitlab-runner-kind-values.yaml \
  >/tmp/gitlab-runner-kind-rendered.yaml
```

Install the runner, replacing `<runner-authentication-token>` with the `glrt-...` token from GitLab:

```bash
helm upgrade --install gitlab-runner-kind gitlab/gitlab-runner \
  --namespace gitlab-runner \
  --values kubernetes/helm-values/gitlab-runner-kind-values.yaml \
  --set runnerToken="<runner-authentication-token>"
```

Expected install result:

```text
Release "gitlab-runner-kind" does not exist. Installing it now.
STATUS: deployed
Your GitLab Runner should now be registered against the GitLab instance reachable at:
"http://ec2-98-81-54-40.compute-1.amazonaws.com"
```

Security note: passing the token with `--set runnerToken=...` stores it in Helm release metadata. For a real environment, use a Kubernetes Secret or an external secret manager, and rotate the token if it was pasted into chat, screenshots, terminal recordings, or shared notes.

### Step 5: Verify The Runner Deployment

Check the deployment and pod:

```bash
kubectl get deploy,rs,pods -n gitlab-runner -o wide
```

The deployment name in this lab is:

```text
gitlab-runner-kind
```

Use this log command:

```bash
kubectl logs -n gitlab-runner deploy/gitlab-runner-kind
```

Do not use this incorrect deployment name:

```bash
kubectl logs -n gitlab-runner deploy/gitlab-runner-kind-gitlab-runner
```

That name does not exist for this Helm release.

Successful logs include:

```text
Verifying runner... is valid
Runner registered successfully
Starting multi-runner
Executor: kubernetes
```

The pod may briefly show `0/1 Running` while the readiness probe waits for its initial delay. After a couple minutes it should become:

```bash
kubectl get pods -n gitlab-runner
```

Expected:

```text
gitlab-runner-kind-...   1/1   Running
```

In this lab, the final status was:

```text
gitlab-runner-kind-59669c9f67-klrg5   1/1   Running
```

### Step 6: Validate From The GitLab UI

Go back to:

```text
Admin Area > CI/CD > Runners
```

The runner should appear online with tags:

```text
kind
kubernetes
linux
dev
```

### Step 7: Run A Kubernetes Executor Smoke Test

Create or update `.gitlab-ci.yml` in a test project:

```yaml
kubernetes-runner-smoke-test:
  stage: test
  image: ubuntu:22.04
  tags:
    - kind
    - kubernetes
    - linux
    - dev
  script:
    - echo "Kubernetes runner is working"
    - hostname
    - uname -a
```

Watch the local `kind` cluster while the job runs:

```bash
kubectl get pods -n gitlab-runner -w
```

Expected behavior:

1. GitLab creates the pipeline.
2. The Kubernetes runner polls GitLab.
3. The runner creates a short-lived CI job pod in the local `kind` cluster.
4. The pod runs the `ubuntu:22.04` job image.
5. The job logs appear in GitLab.
6. The job pod is removed after the job finishes.

### Step 8: Common Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `deploy/gitlab-runner-kind-gitlab-runner` not found | Wrong deployment name | Use `deploy/gitlab-runner-kind`. |
| Pod shows `0/1 Running` at first | Readiness probe initial delay | Wait 1-2 minutes and run `kubectl get pods -n gitlab-runner` again. |
| Runner does not appear online | Token, network, or GitLab URL issue | Check `kubectl logs -n gitlab-runner deploy/gitlab-runner-kind`. |
| Job stays pending | Job tags do not match runner tags | Use `kind,kubernetes,linux,dev` in `.gitlab-ci.yml`. |
| Job pod cannot pull image | Local cluster cannot reach registry | Test with `ubuntu:22.04`; verify Docker Hub access. |
| Runner token exposed | Token pasted or stored insecurely | Delete/recreate the runner in GitLab and reinstall with a fresh token. |

### How This Maps To EKS Or OpenShift

The same pattern works in production-like Kubernetes platforms, but with stronger controls:

| Local kind lab | Production EKS/OpenShift |
|---|---|
| Local cluster on a laptop | Private worker nodes in AWS or OpenShift |
| One runner namespace | Separate namespaces per runner trust level |
| Basic resource limits | Enforced requests/limits/quotas |
| Simple token install | External Secrets/Secrets Manager/Vault |
| Lab runner tags | Formal tags such as `build`, `security`, `deploy`, `protected` |
| No Docker socket | Continue avoiding broad Docker socket access |
| Manual validation | Monitoring, alerts, and runner autoscaling |

For production, create separate runner classes:

```text
build,kubernetes,linux
security,kubernetes
image-build,kubernetes
deploy,protected,kubernetes
admin,protected,kubernetes
```

## Best Runner Setup for Production

For a production-grade GitLab platform, the best general setup is a Kubernetes executor runner fleet on EKS with separate runner classes.

Recommended runner classes:

| Runner class | Tags | Purpose | Isolation |
|---|---|---|---|
| Build runner | `build,kubernetes,linux` | Compile, unit test, package | Standard ephemeral pods |
| Docker/image runner | `image-build,kubernetes` | Build container images | Dedicated namespace/node pool; rootless BuildKit/Kaniko preferred |
| Security runner | `security,kubernetes` | SAST, dependency scan, container scan | Standard pods with scanner cache |
| Deploy runner | `deploy,protected,kubernetes` | Deploy to dev/stage/prod | Protected runner, locked to protected branches/tags |
| Admin runner | `admin,protected` | Terraform/admin automation | Highly restricted, protected, least privilege IAM |

Production runner principles:

- Use group or instance runners for shared workloads.
- Use project runners for sensitive applications.
- Require tags; do not allow broad untagged execution.
- Use protected runners for production deploy jobs.
- Use ephemeral pods or ephemeral VMs; avoid long-lived mutable build hosts.
- Separate runner node groups by trust level and workload type.
- Apply Kubernetes resource requests and limits.
- Use network policies to restrict runner pod egress.
- Use IAM roles for service accounts where AWS access is needed.
- Store secrets in GitLab protected/masked variables or an external secrets manager.
- Avoid mounting the Docker socket into generic runners in production.
- Monitor runner queue time, job failure rate, and node utilization.

## Best Setup for a Production-Grade GitLab Platform

The production target should not be the current all-in-one Docker Compose host. The POC is good for learning and demonstrations, but production needs high availability, separation of concerns, security boundaries, and operational controls.

Recommended AWS production architecture:

| Layer | Recommended setup |
|---|---|
| DNS | Route 53 hosted zone with stable names such as `gitlab.company.com`, `grafana.company.com`, `keycloak.company.com` |
| TLS | ACM certificates on ALB; HTTPS-only; HSTS where appropriate |
| Edge security | AWS WAF on ALB, restricted admin paths, security group allowlists/VPN/private access |
| Network | Multi-AZ VPC, public ALB subnets, private app subnets, private database/cache subnets |
| GitLab application | GitLab Omnibus reference architecture on EC2 or GitLab Helm chart on EKS, depending on team skillset |
| PostgreSQL | Amazon RDS PostgreSQL or Aurora PostgreSQL Multi-AZ |
| Redis | Amazon ElastiCache Redis/Memcached according to GitLab reference architecture requirements |
| Object storage | S3 for artifacts, LFS, uploads, packages, registry layers, Terraform state, backups |
| Container registry | GitLab registry backed by S3, or ECR for selected workloads |
| Runners | EKS Kubernetes executor runners across private node groups |
| Secrets | AWS Secrets Manager or SSM Parameter Store plus GitLab masked/protected variables |
| Identity | Enterprise IdP such as Keycloak, Okta, Azure AD, or Ping; SAML/OIDC with group claims |
| Observability | CloudWatch, Prometheus, Grafana, GitLab exporter, runner metrics, log aggregation |
| Backup | GitLab backup to S3, RDS snapshots, Redis snapshots if needed, tested restore runbook |
| DR | Cross-region backup replication and documented RTO/RPO |

Recommended production GitLab deployment choice:

- If the team is strong in Linux operations: use GitLab Omnibus on EC2 following GitLab's reference architecture, with external RDS, ElastiCache, and S3.
- If the team is strong in Kubernetes operations: use the GitLab Helm chart on EKS, but expect more operational complexity.

For a bank-style environment, the safest recommendation is usually GitLab Omnibus or GitLab's documented cloud-native reference architecture, deployed in private subnets, fronted by ALB/WAF, backed by managed AWS data services, and integrated with enterprise identity.

## Production SSO Recommendations

Current POC SSO works over HTTP for speed. Production must use HTTPS.

Production SSO improvements:

- Put Keycloak behind HTTPS with a stable DNS name.
- Use `https://keycloak.company.com/realms/<realm>` as the issuer.
- Use dedicated OIDC clients per app.
- Rotate client secrets and store them in AWS Secrets Manager.
- Enforce MFA in Keycloak or the enterprise IdP.
- Map Keycloak groups to GitLab groups/roles where possible.
- Use protected admin groups for GitLab administrators.
- Avoid local admin logins except for break-glass accounts.
- Configure session lifetimes and idle timeouts consistently.
- Export and version Keycloak realm configuration carefully, excluding secrets.

## Stage 2 Validation Summary

Validated results:

| Check | Result |
|---|---|
| GitLab SSO link appears | Passed |
| GitLab redirects to Keycloak | Passed |
| GitLab sends state and nonce | Passed |
| Keycloak accepts realm SSO user | Passed |
| GitLab callback completes | Passed |
| GitLab creates SSO user | Passed |
| Grafana SSO link appears | Passed |
| Grafana redirects to Keycloak | Passed |
| Grafana token exchange works from container | Passed after internal URL fix |
| Grafana creates/finds SSO user | Passed |

Known limitations:

- GitLab and Grafana SSO are configured over HTTP, not HTTPS.
- SonarQube Community does not have supported native SSO.
- Artifactory OSS does not have supported native SSO.
- The current setup is single-host and not highly available.
- The SSO validation user is a normal application user, not automatically a GitLab/Grafana administrator.
- Secrets should not be committed to the repository; client secrets and user passwords belong in a secrets manager.

## Recommended Stage 3 Work

1. Register a Docker executor runner on the current EC2 host and run a full sample pipeline.
2. Add a production-like EKS Kubernetes runner option using the existing Helm values.
3. Add HTTPS with Route 53 and ACM or a reverse proxy certificate flow.
4. Move secrets out of plain files into AWS Secrets Manager or SSM Parameter Store.
5. Create Keycloak groups such as `gitlab-admins`, `developers`, and `grafana-admins`.
6. Map Keycloak groups to GitLab/Grafana roles.
7. Decide whether SonarQube and JFrog should be upgraded for native enterprise SSO or protected behind an auth proxy for the lab.
8. Add backup/restore validation as a formal test, not just backup creation.
