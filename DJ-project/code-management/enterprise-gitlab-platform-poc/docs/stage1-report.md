# Stage 1 Report: Bank of America DevSecOps Platform POC

## Executive Summary

Stage 1 built a minimum-cost proof of concept for an enterprise DevSecOps platform on AWS. The platform demonstrates how a bank or large enterprise could self-host GitLab and connect it with common delivery, security, identity, artifact, backup, and observability tools.

The current implementation is not production-grade. It is intentionally a learning and interview demonstration environment. The goal of this stage was to prove the architecture, deploy working services, understand how the tools fit together, and document the gaps between the POC and an enterprise-ready implementation.

## Current Deployment

AWS profile:

```text
gitlab-hosted-demo
```

AWS account:

```text
730335466485
```

AWS region:

```text
us-east-1
```

Primary EC2 instance:

```text
i-05990ea1ac37342b8
```

Public DNS:

```text
ec2-98-81-54-40.compute-1.amazonaws.com
```

Public IP:

```text
98.81.54.40
```

## What We Built

We created an AWS-hosted all-in-one DevSecOps lab platform. The EC2 instance runs Docker Compose, and Docker Compose runs the platform services.

Running services:

| Tool | URL | Purpose |
| --- | --- | --- |
| GitLab CE | `http://ec2-98-81-54-40.compute-1.amazonaws.com` | Source control, CI/CD, projects, groups, runners, permissions |
| SonarQube | `http://ec2-98-81-54-40.compute-1.amazonaws.com:9000` | Static code analysis and code quality scanning |
| Artifactory OSS | `http://ec2-98-81-54-40.compute-1.amazonaws.com:8082` | Artifact repository for build outputs/packages |
| Keycloak | `http://ec2-98-81-54-40.compute-1.amazonaws.com:8080` | Identity provider lab for SSO/SAML/OIDC concepts |
| Grafana | `http://ec2-98-81-54-40.compute-1.amazonaws.com:3000` | Observability dashboard UI |
| Prometheus | internal/container port `9090` | Metrics collection |

## AWS Services Created

### EC2

The main EC2 instance hosts all DevSecOps tools using Docker Compose.

Instance:

```text
i-05990ea1ac37342b8
boa-gitlab-poc-dev-gitlab-all-in-one
t3.xlarge
```

The instance is the compute layer for the POC. It runs GitLab, SonarQube, Artifactory, Keycloak, Grafana, and Prometheus.

### VPC

The project created a dedicated VPC:

```text
vpc-07e765b0f9ea2134e
CIDR: 10.42.0.0/16
Name: boa-gitlab-poc-dev-vpc
```

This isolates the POC network from the default AWS VPC.

### Public Subnets

Two public subnets were created. The EC2 instance runs in one public subnet. A second subnet exists so the design can later support multi-AZ services such as EKS, load balancers, or managed databases.

### Internet Gateway and Route Table

An Internet Gateway and public route table were created so the EC2 instance can be reached from the internet and can pull packages/container images.

### Security Group

A security group controls access to the EC2 instance. It allows selected inbound ports for the POC tools, restricted to the configured admin CIDR where Terraform is managing access.

Important ports:

| Port | Purpose |
| --- | --- |
| `80` | GitLab HTTP |
| `443` | Reserved for future HTTPS |
| `2222` | Git over SSH into GitLab container |
| `9000` | SonarQube UI |
| `8082` | Artifactory UI |
| `8080` | Keycloak UI |
| `3000` | Grafana UI |

Port `22` for normal host SSH was not enabled because `ssh_public_key` is blank. Administrative access is done through AWS Systems Manager Session Manager.

### IAM Role and Instance Profile

An IAM role was attached to the EC2 instance through an instance profile.

Role:

```text
boa-gitlab-poc-dev-gitlab-role
```

The role allows:

- SSM Session Manager access.
- CloudWatch agent permissions.
- S3 backup bucket access.

This avoids storing AWS access keys on the EC2 instance.

### S3 Backup Bucket

GitLab backups are stored in S3:

```text
boa-gitlab-poc-dev-gitlab-backups-20260619164143756100000001
```

The EC2 host runs a backup script:

```text
/usr/local/bin/backup-gitlab-to-s3
```

That script creates a GitLab backup inside the GitLab container and syncs GitLab backup/config data to S3.

### S3 Terraform State Bucket

Terraform state is stored remotely in S3:

```text
boa-gitlab-poc-tfstate-730335466485
```

This bucket is used by Terraform, not by the application stack.

### DynamoDB Terraform Lock Table

Terraform state locking uses DynamoDB:

```text
boa-gitlab-poc-locks
```

The lock table prevents two Terraform operations from modifying the same environment at the same time.

### CloudWatch Logs

CloudWatch log group:

```text
/boa-gitlab-poc/dev/platform
```

This is prepared for platform logging and future observability integration.

## Infrastructure as Code

The project uses Terraform to define AWS infrastructure.

Important paths:

```text
terraform/backend
terraform/envs/dev
```

The backend directory creates the Terraform remote state bucket and DynamoDB lock table. The dev environment creates the VPC, EC2 instance, IAM, security group, backup bucket, and platform bootstrap.

The EC2 bootstrap is handled by:

```text
terraform/envs/dev/user_data.sh
```

That script installs Docker, writes the Docker Compose file, starts the containers, configures the backup script, and creates a cron job.

## Configuration Management

Ansible content was added for hardening, backups, and operational checks.

Path:

```text
ansible
```

In a production-grade version, Ansible would be used more actively for repeatable server configuration, drift correction, patching, and service validation.

## GitLab Platform Setup

GitLab is the core of the POC.

It demonstrates:

- Self-hosted GitLab administration.
- Group/project structure.
- GitLab CI/CD concepts.
- Git over SSH on port `2222`.
- Backup and restore process.
- Future integration with runners, SSO, SonarQube, Artifactory, and GitOps.

GitLab root login:

```text
username: root
password: stored in Terraform sensitive output
```

Retrieve the password with:

```bash
cd /home/persoba/v-projects/DJ-project/code-management/enterprise-gitlab-platform-poc/terraform/envs/dev
AWS_PROFILE=gitlab-hosted-demo terraform output -raw gitlab_root_password
```

## GitLab Omnibus Components: What Comes With GitLab and What Does Not

GitLab is not one single process. A self-managed GitLab installation is a collection of application, database, repository, web, background-job, monitoring, and support services.

In this POC, we used the GitLab CE Omnibus Docker image:

```text
gitlab/gitlab-ce:latest
```

Omnibus means GitLab packages the core services together so they can run as one integrated installation. In our Docker-based POC, those services run inside the `gitlab` container. In a Linux-package installation, the services are installed under the GitLab package layout and managed with `gitlab-ctl`.

GitLab's official architecture documentation describes the normal request path this way: NGINX or Apache proxies traffic through GitLab Workhorse, then into the Puma application server. GitLab uses Sidekiq for background jobs and Redis for job metadata, queues, and caching. Git repository access is handled by Gitaly and GitLab Shell. GitLab's reference architectures also show that production GitLab Rails and Sidekiq nodes connect to PostgreSQL, Redis, Gitaly, and object storage.

Official references:

- GitLab architecture overview: `https://docs.gitlab.com/development/architecture/`
- GitLab reference architectures: `https://docs.gitlab.com/administration/reference_architectures/`
- GitLab Prometheus monitoring: `https://docs.gitlab.com/administration/monitoring/prometheus/`

### Components That Come With A Default Omnibus Installation

These are the core components normally included with a default single-node GitLab Omnibus installation.

| Component | Comes With GitLab Omnibus? | What It Does | Production Notes |
| --- | --- | --- | --- |
| GitLab Rails application | Yes | Main GitLab application. Provides users, groups, projects, issues, merge requests, permissions, CI/CD configuration, APIs, and admin UI. | In production, Rails can run on multiple application nodes behind a load balancer. |
| Puma | Yes | Application server that runs GitLab Rails web/API requests. | Tune worker/thread counts. Scale horizontally with multiple application nodes for larger environments. |
| Sidekiq | Yes | Background job processor. Handles async work such as emails, repository housekeeping, CI job processing, webhooks, imports, cleanup, and scheduled jobs. | Often split onto separate Sidekiq nodes. Scale based on queue depth and job latency. |
| PostgreSQL | Yes, bundled by default | Primary relational database for GitLab metadata: users, projects, permissions, merge requests, issues, CI/CD records, settings. | For production, move to external PostgreSQL or a GitLab-supported HA database design. On AWS, use RDS/Aurora only if it matches GitLab support requirements and is tuned correctly. |
| Redis | Yes, bundled by default | Caching, sessions, rate limiting, Sidekiq queues, job metadata, and coordination. | For production, separate Redis from app nodes. Use HA Redis/Sentinel or managed Redis where supported. |
| Gitaly | Yes | Git repository storage service. GitLab Rails talks to Gitaly for repository operations. | In production, keep repository storage on dedicated Gitaly nodes. For larger HA environments, use Gitaly Cluster/Praefect. |
| GitLab Shell | Yes | Handles Git over SSH, authorized keys, and SSH Git commands. | In production, expose SSH through a controlled endpoint/load balancer pattern. Monitor SSH clone/fetch/push usage. |
| GitLab Workhorse | Yes | Smart reverse proxy for GitLab. Handles large uploads/downloads, Git HTTP traffic, artifacts, LFS, and request routing before Puma. | Usually runs on application nodes. Needs correct external URL, object storage, and proxy settings. |
| NGINX | Yes | Web server/reverse proxy bundled with Omnibus. Receives HTTP/HTTPS traffic and routes to Workhorse. | In production, NGINX may still run on GitLab nodes, but public traffic is usually fronted by ALB/NLB, ingress, or enterprise load balancers. |
| Registry service | Bundled, configurable | GitLab Container Registry for container images. | Bundled, but not automatically production-ready. Needs external URL, TLS, object storage, retention policies, and authentication configuration. |
| GitLab Pages | Bundled, usually separately configured | Hosts static sites from GitLab projects. | Requires DNS, wildcard domains, TLS, and isolation planning. Often treated as a separate external-facing service. |
| Prometheus | Bundled and commonly enabled in Omnibus | Collects GitLab metrics. GitLab docs state Prometheus services are on by default for Linux package installations. | For production, use a secured, external, central monitoring stack. Do not expose unauthenticated metrics publicly. |
| Node Exporter | Bundled | Exports host/system metrics. | In production, secure metrics endpoints and forward metrics to central monitoring. |
| Redis Exporter | Bundled | Exports Redis metrics. | Useful for Redis monitoring, but secure access in production. |
| PostgreSQL Exporter | Bundled | Exports PostgreSQL metrics. | Useful for DB monitoring, but production DB monitoring should be integrated with central observability. |
| GitLab Exporter | Bundled | Exports GitLab-specific metrics such as CI build and Sidekiq queue information. | Use with Prometheus/Grafana/SLO alerting. |
| Alertmanager | Bundled in many Omnibus deployments | Handles alert routing for Prometheus alerts. | Production alerting should integrate with PagerDuty, Opsgenie, ServiceNow, Slack/Teams, or the enterprise standard. |
| Logrotate | Yes | Rotates GitLab logs on disk. | Production logs should also be shipped centrally for retention, audit, and search. |
| GitLab KAS | Bundled/configurable | GitLab Agent Server for Kubernetes agent connectivity. | Useful for GitLab Kubernetes Agent and GitOps-style workflows, but must be configured. |
| Mailroom | Bundled/configurable | Processes incoming email for features such as reply-by-email and service desk. | Needs mailbox, SMTP/IMAP settings, and security controls. |
| Backup utilities | Yes | GitLab includes backup commands such as `gitlab-backup create`. | Backups must be stored off-instance, encrypted, monitored, and restore-tested. |

The important point is that bundled does not always mean enabled, configured, exposed, secure, or production-ready. Some services are included by the package but require explicit configuration before they are useful.

### Components That Do Not Come Automatically With GitLab

These are important enterprise DevSecOps components, but they are not automatically created by installing GitLab.

| Component | Comes With GitLab Install? | Why It Is Needed | How It Fits In Production |
| --- | --- | --- | --- |
| GitLab Runner | No | Runs CI/CD jobs from GitLab pipelines. Without runners, pipelines cannot execute jobs. | Deploy separate runner fleets using Kubernetes executor, autoscaling VM runners, or locked/protected runners for sensitive projects. |
| SSO provider such as Keycloak, Okta, Azure AD, Ping, ADFS | No | Provides centralized authentication, MFA, and enterprise identity lifecycle. | Configure GitLab SAML/OIDC/LDAP integration. Map IdP groups to GitLab groups/roles. |
| LDAP/Active Directory server | No | Enterprise user and group directory. | Connect GitLab to existing corporate directory if required. |
| SonarQube | No | Static code analysis, quality gates, maintainability, bugs, vulnerabilities depending on edition/plugins. | Trigger Sonar scans from GitLab CI and enforce quality gates before merge/deploy. |
| Artifactory | No | Stores build artifacts, packages, release binaries, and dependency caches. | Publish artifacts from GitLab CI. Use repository permissions, retention, promotion, and scanning. |
| JFrog Xray | No | Scans artifacts and dependencies for vulnerabilities/license risk. | Integrate with Artifactory and CI/CD release gates. |
| Kubernetes/OpenShift | No | Runs containers and cloud-native workloads. | GitLab can deploy to Kubernetes, but the cluster must be built separately. |
| Argo CD or Flux | No | GitOps deployment controller. | Watches Git repositories and reconciles Kubernetes environments. |
| AWS Load Balancer/ALB/NLB | No | Provides resilient traffic entrypoint. | Put GitLab web, registry, and SSH endpoints behind approved load balancing patterns. |
| Route 53 DNS | No | Provides stable names instead of raw EC2 DNS. | Use names like `gitlab.example.com`, `registry.example.com`, `pages.example.com`. |
| ACM/TLS certificates | No | Encrypts browser/API/Git traffic. | Use HTTPS everywhere. Enforce secure cookies and trusted hostnames. |
| S3/object storage | No, must configure | Stores artifacts, LFS objects, uploads, packages, dependency proxy objects, registry layers, Terraform state, and backups. | Recommended for production instead of keeping all data on local disks or NFS. |
| External PostgreSQL/RDS/Aurora | No | Provides managed or separated database layer. | Must follow GitLab support and tuning guidance. Use HA/backups/monitoring. |
| External Redis/ElastiCache | No | Provides separated cache/queue layer. | Must follow GitLab-supported Redis topology. |
| WAF | No | Protects public endpoints from common web attacks. | Put AWS WAF or enterprise WAF in front of public endpoints. |
| SIEM/log platform | No | Central security logging, audit retention, search, correlation. | Ship GitLab, system, access, and audit logs to Splunk, OpenSearch, Datadog, CloudWatch, or enterprise SIEM. |
| Secrets manager | No | Securely stores passwords, tokens, certificates, keys. | Use AWS Secrets Manager, HashiCorp Vault, or enterprise equivalent. |
| ITSM/change system | No | Tracks approvals, incidents, changes, evidence. | Integrate with ServiceNow/Jira/change-management workflows. |
| Enterprise backup/DR platform | No | Recovery beyond local GitLab backup command. | Add restore automation, cross-region replication, retention, and DR testing. |

### How This Applies To Our POC

In our POC, GitLab is running as one all-in-one Omnibus container:

```text
gitlab
```

Inside that container, GitLab provides the default core services such as:

```text
GitLab Rails
Puma
Sidekiq
PostgreSQL
Redis
Gitaly
GitLab Shell
GitLab Workhorse
NGINX
Prometheus/exporters
backup utilities
```

Outside the GitLab container, we added these separate services:

```text
SonarQube
Artifactory
Artifactory PostgreSQL
Keycloak
Prometheus
Grafana
```

AWS adds the supporting infrastructure:

```text
EC2
S3
IAM
VPC
Security Group
SSM Session Manager
CloudWatch
DynamoDB for Terraform locking
```

So the clean mental model is:

```text
GitLab Omnibus = the core GitLab platform bundle
External tools = CI runners, SSO, scanning, artifacts, GitOps, Kubernetes, load balancers, object storage, monitoring, secrets
AWS = compute, network, identity, backup storage, access, logging, Terraform state
```

### In Production, Which Default GitLab Components Need A Different Setup?

For a small lab, it is acceptable for bundled GitLab services to run together on one host. For production, the same default components often need to be separated, scaled, secured, or replaced with managed/external equivalents.

| Default GitLab Component | POC Setup | Production-Grade Setup |
| --- | --- | --- |
| GitLab Rails/Puma | Runs inside one Docker container on one EC2 instance. | Run multiple application nodes behind a load balancer. Tune Puma workers/threads. Use health checks and rolling upgrades. |
| Sidekiq | Runs inside the same container as the web app. | Run dedicated Sidekiq nodes. Scale by queue type and queue latency. Monitor failed jobs and backlog. |
| PostgreSQL | Bundled inside the GitLab container. | Separate database tier. Use GitLab-supported HA PostgreSQL design or carefully validated managed PostgreSQL. Enable backups, monitoring, encryption, and tested restore. |
| Redis | Bundled inside the GitLab container. | Separate Redis tier with HA/failover. Monitor memory, latency, evictions, and connection count. |
| Gitaly | Bundled with the GitLab container and stores repositories on the same EC2 disk. | Dedicated Gitaly nodes with fast storage. For HA/scale, use Gitaly Cluster/Praefect where appropriate. |
| GitLab Shell | Exposed through port `2222` in our POC. | Use a controlled SSH endpoint. Consider separate SSH load balancing patterns. Restrict access and monitor Git SSH traffic. |
| GitLab Workhorse | Runs in the same container. | Usually remains on app nodes, but must be tuned for uploads, artifacts, LFS, object storage, and reverse proxy behavior. |
| NGINX | Bundled inside GitLab and serves HTTP directly. | Put enterprise load balancer/ingress in front. Use TLS, HSTS, approved ciphers, WAF, and stable DNS. |
| Container Registry | Port `5050` is mapped in the POC, but production registry design is not complete. | Configure registry domain, TLS, object storage backend, garbage collection, auth, retention, and vulnerability scanning. |
| GitLab Pages | Not configured in this POC. | Configure separate Pages domain, wildcard DNS, TLS, isolation, access control, and routing. |
| Prometheus/exporters | GitLab bundled metrics exist, plus we added a separate Prometheus container. | Use central, secured observability. Scrape metrics privately. Add dashboards, alerts, SLOs, and retention. |
| Logrotate/logs | Local log rotation only. | Ship logs to centralized logging/SIEM. Retain audit logs according to policy. |
| Backup utilities | GitLab backup command syncs to S3 nightly. | Automate backups, monitor failures, encrypt with KMS, replicate, and regularly perform restore tests. |

### Why Production Does Not Usually Keep Everything Bundled Together

The default all-in-one GitLab installation is excellent for:

- Learning.
- POCs.
- Small teams.
- Quick validation.
- Lower-cost demos.

It is not enough for a bank-grade production system because production cares about:

- High availability.
- Disaster recovery.
- Performance under load.
- Upgrade safety.
- Security boundaries.
- Audit evidence.
- Backup and restore confidence.
- Separation of duties.
- Centralized identity.
- Centralized monitoring and logging.
- Compliance and operational support.

The bundled services are still GitLab's core architecture, but production changes where and how those services run.

### Interview Explanation

Use this version in an interview:

```text
A default self-managed GitLab Omnibus installation includes the core GitLab platform services: the Rails application, Puma, Sidekiq, PostgreSQL, Redis, Gitaly, GitLab Shell, GitLab Workhorse, NGINX, backup utilities, and bundled monitoring components such as Prometheus and exporters. Some optional features like the container registry and Pages are included in the package but require additional configuration before they are production-ready.

What GitLab does not automatically provide are the surrounding enterprise platform services: GitLab Runners, SSO providers, LDAP/Active Directory, SonarQube, Artifactory, Xray, Kubernetes/OpenShift, GitOps controllers, cloud load balancers, DNS, TLS certificates, WAF, object storage, centralized secrets, centralized logging, and SIEM integration.

For a POC, running the bundled services together on one EC2 instance is acceptable. For production, I would split and harden the architecture: application nodes behind a load balancer, dedicated Sidekiq workers, external or HA PostgreSQL, external Redis, dedicated Gitaly storage, object storage for artifacts/uploads/LFS/registry/backups, SSO integration, secured runners, centralized monitoring/logging, TLS everywhere, and tested disaster recovery.
```

## SonarQube Setup

SonarQube provides code quality scanning.

Originally, the deployment used:

```text
sonarqube:lts-community
```

The UI reported that the version was no longer active. We attempted to use:

```text
sonarqube:2026-lta-community
```

However, Docker rejected that tag because it does not currently exist for the free Community image. We changed the POC to:

```text
sonarqube:community
```

Because the newer image could not read the previous embedded H2 database format, we preserved the old SonarQube data directory and started fresh.

Old data backup on the EC2 host:

```text
/opt/boa-platform/sonarqube/data.pre-community-upgrade.20260619181916
```

Current public verification:

```text
SonarQube HTTP: 200
```

## Artifactory Setup

Artifactory OSS was added as the artifact repository layer.

Artifactory initially required additional persistence configuration. We repaired the running host by adding:

- Persistent Artifactory master/join keys.
- PostgreSQL backend for Artifactory.
- Docker Compose override file.

Important file:

```text
/opt/boa-platform/docker-compose.override.yml
```

Artifactory PostgreSQL data:

```text
/opt/boa-platform/artifactory-postgres
```

Artifactory demonstrates how build outputs, container-related artifacts, and packages can be stored outside the CI jobs.

## Keycloak Setup

Keycloak was added as an identity provider lab.

Its purpose in this project is to demonstrate SSO/SAML/OIDC concepts for GitLab enterprise hardening.

Keycloak helps explain:

- Centralized identity.
- SSO.
- SAML/OIDC federation.
- LDAP-style enterprise integration concepts.
- Role and group mapping.
- MFA/password policy concepts.

The UI initially showed:

```text
HTTPS required
```

For this POC, we configured Keycloak for HTTP/dev hostname mode:

```text
--http-enabled=true
--hostname-strict=false
--hostname=http://ec2-98-81-54-40.compute-1.amazonaws.com:8080
```

This is acceptable for a lab, but not for production.

Current public verification:

```text
Keycloak root: 302
Keycloak admin: 302
```

## Observability Setup

Prometheus and Grafana were added to demonstrate the observability layer.

Prometheus is configured to scrape basic endpoints for GitLab and SonarQube. Grafana is provisioned with Prometheus as a datasource.

This is a starting point only. Production observability would need deeper metrics, log aggregation, alerting, dashboards, and SLOs.

## Access Model

Normal SSH was not configured for the EC2 instance.

Instead, administrative access uses AWS Systems Manager Session Manager.

Browser access from the AWS Console works because AWS provides the session experience in the browser.

Local CLI access requires the Session Manager Plugin:

```bash
session-manager-plugin --version
```

Start a local SSM session:

```bash
AWS_PROFILE=gitlab-hosted-demo aws ssm start-session \
  --target i-05990ea1ac37342b8 \
  --region us-east-1
```

Once connected:

```bash
sudo -i
cd /opt/boa-platform
docker compose ps
```

## Important Commands

Check Terraform-managed resources:

```bash
cd /home/persoba/v-projects/DJ-project/code-management/enterprise-gitlab-platform-poc/terraform/envs/dev
AWS_PROFILE=gitlab-hosted-demo terraform state list
```

Check EC2:

```bash
AWS_PROFILE=gitlab-hosted-demo aws ec2 describe-instances \
  --region us-east-1 \
  --filters Name=tag:Project,Values=boa-gitlab-poc \
  --query 'Reservations[].Instances[].{InstanceId:InstanceId,State:State.Name,Type:InstanceType,PublicIp:PublicIpAddress,Name:Tags[?Key==`Name`]|[0].Value}' \
  --output table
```

Check S3 buckets:

```bash
AWS_PROFILE=gitlab-hosted-demo aws s3 ls | grep boa-gitlab-poc
```

Check services from the EC2 host:

```bash
cd /opt/boa-platform
docker compose ps
docker ps
```

Check public web endpoints:

```bash
curl -I http://ec2-98-81-54-40.compute-1.amazonaws.com
curl -I http://ec2-98-81-54-40.compute-1.amazonaws.com:9000
curl -I http://ec2-98-81-54-40.compute-1.amazonaws.com:8082
curl -I http://ec2-98-81-54-40.compute-1.amazonaws.com:8080
curl -I http://ec2-98-81-54-40.compute-1.amazonaws.com:3000
```

Run a GitLab backup:

```bash
/usr/local/bin/backup-gitlab-to-s3
```

Verify backup files:

```bash
aws s3 ls s3://boa-gitlab-poc-dev-gitlab-backups-20260619164143756100000001/gitlab/ --recursive
```

## What We Learned

This POC shows how a platform engineering team can stand up a self-hosted software delivery platform using AWS and infrastructure as code.

The main learning points are:

- Terraform can provision the AWS foundation repeatably.
- EC2 can host a cost-controlled all-in-one platform for a lab.
- Docker Compose is fast for POC environments.
- SSM Session Manager is safer than opening SSH.
- IAM roles allow AWS access without static credentials.
- S3 is a simple backup target for GitLab recovery data.
- GitLab can act as the central DevOps system.
- SonarQube adds code quality checks.
- Artifactory adds artifact management.
- Keycloak helps demonstrate enterprise identity and SSO concepts.
- Grafana and Prometheus provide the observability starting point.

## Current Production Gaps

### 1. Single EC2 Instance

Current state:

All services run on one EC2 instance.

Production gap:

If the instance fails, the entire platform goes down.

Production requirement:

Use highly available architecture. GitLab, databases, Redis, object storage, runners, and artifact services should be separated and deployed across multiple Availability Zones where possible.

### 2. Docker Compose Instead of Orchestrated Platform

Current state:

Docker Compose runs all tools.

Production gap:

Docker Compose is easy for a lab but weak for enterprise operations, scaling, self-healing, rolling upgrades, and policy enforcement.

Production requirement:

Move platform services to Kubernetes/OpenShift where appropriate, or use vendor-supported deployment patterns. Use Helm, GitOps, health probes, resource limits, pod disruption budgets, and controlled rollout strategies.

### 3. No Load Balancer

Current state:

Users connect directly to the EC2 public DNS.

Production gap:

Direct instance access is not resilient and does not support clean TLS, routing, WAF, or blue/green replacement.

Production requirement:

Place services behind an Application Load Balancer or ingress controller. Use Route 53 DNS names and ACM certificates.

### 4. HTTP Instead of HTTPS

Current state:

The POC uses HTTP for GitLab and lab tools.

Production gap:

Credentials, tokens, and session cookies should not travel over plain HTTP.

Production requirement:

Use HTTPS everywhere. Terminate TLS with ACM/ALB or configure TLS directly on services. Enforce secure cookies, HSTS, and trusted hostnames.

### 5. Weak Default Lab Credentials

Current state:

Some tools use simple lab credentials such as `admin-change-me` or default first-login credentials.

Production gap:

Default credentials are not acceptable.

Production requirement:

Use AWS Secrets Manager, HashiCorp Vault, or a similar secrets manager. Rotate credentials. Enforce strong password policies and MFA.

### 6. No Full SSO Integration Yet

Current state:

Keycloak is deployed as an identity provider lab, but GitLab has not yet been fully integrated with Keycloak for SAML/OIDC login.

Production gap:

Enterprise access should be centralized and auditable.

Production requirement:

Integrate GitLab with enterprise SAML/OIDC. Connect to corporate IdP/LDAP. Map groups to roles. Enforce MFA and conditional access. Disable unmanaged local accounts except break-glass accounts.

### 7. No Dedicated Managed Database

Current state:

GitLab uses container-managed data on the EC2 volume. SonarQube uses embedded database behavior for the POC. Artifactory was repaired with a local PostgreSQL container.

Production gap:

Local container databases are not resilient enough for enterprise systems.

Production requirement:

Use managed PostgreSQL such as Amazon RDS or Aurora where supported. Enable Multi-AZ, backups, encryption, monitoring, and tested restore procedures.

### 8. No Redis Separation for GitLab

Current state:

GitLab is running as an Omnibus container on one host.

Production gap:

Enterprise GitLab should separate critical backing services as scale and availability requirements grow.

Production requirement:

Use GitLab reference architectures. Separate PostgreSQL, Redis, Gitaly, Praefect where required, Sidekiq, web/API nodes, object storage, and runners based on load.

### 9. Limited Backup and Restore Validation

Current state:

GitLab backup script syncs backup/config data to S3 nightly.

Production gap:

Backups are only useful if restore is tested.

Production requirement:

Create automated restore drills. Define RPO/RTO. Version backups. Encrypt with KMS. Replicate critical backups across regions. Monitor backup success/failure.

### 10. No Centralized Log Pipeline

Current state:

Container logs remain mostly on the instance. CloudWatch log group exists but the full log shipping pattern is not complete.

Production gap:

Enterprise operations need searchable logs, retention, alerting, and correlation.

Production requirement:

Ship logs to CloudWatch Logs, OpenSearch, Splunk, Datadog, or another enterprise SIEM/log platform. Add audit log retention and alerting for security events.

### 11. Limited Monitoring and Alerting

Current state:

Prometheus and Grafana are present, but dashboards and alerts are minimal.

Production gap:

No mature alerting, paging, SLOs, or capacity thresholds.

Production requirement:

Define alerts for service availability, disk usage, CPU/memory, failed backups, failed pipelines, GitLab health, database health, runner availability, and certificate expiration.

### 12. No WAF or Edge Protection

Current state:

Security group rules limit inbound access, but there is no WAF or advanced edge protection.

Production gap:

Public enterprise apps need layered protection.

Production requirement:

Use AWS WAF, Shield, ALB security policies, rate limiting, bot protection where applicable, and strict inbound access rules.

### 13. No Private Networking Pattern

Current state:

The EC2 instance is public.

Production gap:

Enterprise systems should minimize public exposure.

Production requirement:

Place instances in private subnets. Use ALB, VPN, Direct Connect, Client VPN, or zero-trust access. Use VPC endpoints for AWS APIs such as S3, SSM, CloudWatch, and ECR.

### 14. No Patch Management Lifecycle

Current state:

The instance was bootstrapped with package installs and latest Docker images.

Production gap:

Using `latest` images and ad hoc patching can cause unpredictable changes.

Production requirement:

Pin versions. Use planned patch windows. Scan images. Test upgrades in lower environments. Use immutable images or controlled configuration management.

### 15. No Runner Fleet Yet

Current state:

The platform includes CI/CD templates and runner concepts, but a full autoscaling GitLab Runner fleet is not productionized.

Production gap:

Enterprise CI/CD needs isolated, scalable, auditable runners.

Production requirement:

Deploy GitLab Runners with autoscaling. Use Kubernetes executors or ephemeral VM runners. Separate privileged and unprivileged workloads. Restrict secrets. Use runner tags and protected runners.

### 16. No Complete GitOps Deployment Controller

Current state:

GitOps manifests exist as sample structure.

Production gap:

There is no active Argo CD or Flux controller managing environments.

Production requirement:

Deploy Argo CD or Flux. Enforce pull-request-based environment changes. Separate dev/stage/prod. Add policy checks, approvals, drift detection, and promotion workflows.

### 17. No Enterprise Artifact Governance

Current state:

Artifactory OSS is running as an artifact repository.

Production gap:

The POC does not include JFrog Xray scanning or full artifact promotion/governance.

Production requirement:

Use Artifactory with Xray or an equivalent artifact scanning tool. Define repositories, retention, promotion, quarantine, license policies, and vulnerability gates.

### 18. No Compliance Evidence Automation

Current state:

The POC demonstrates tooling but does not automatically collect compliance evidence.

Production gap:

Banking environments need audit trails, approvals, change records, access reviews, and evidence retention.

Production requirement:

Integrate with ITSM/change management. Export GitLab audit events. Track approvals, deployments, scans, exceptions, and access changes. Retain evidence according to policy.

### 19. No Disaster Recovery Architecture

Current state:

There is one region and one EC2 instance.

Production gap:

A regional or instance failure would require manual recovery.

Production requirement:

Define DR architecture. Replicate backups. Test restore into a new account/region. Document RTO/RPO. Automate infrastructure rebuild.

### 20. Cost Controls Are Basic

Current state:

The POC uses a minimum practical instance and avoids EKS by default.

Production gap:

Production cost governance needs budgets, alerts, tagging enforcement, and usage tracking.

Production requirement:

Add AWS Budgets, Cost Explorer tagging, rightsizing reviews, reserved capacity planning, and environment schedules for non-production.

## What Needs To Be Done For Production Grade

To make this production-grade, the next stages should include:

1. Design a production reference architecture.
2. Move from public EC2 direct access to ALB + Route 53 + ACM TLS.
3. Put compute in private subnets.
4. Use managed PostgreSQL for supported services.
5. Use S3 object storage for GitLab artifacts, LFS, uploads, registry, and backups.
6. Configure GitLab SAML/OIDC SSO with Keycloak or enterprise IdP.
7. Add MFA and RBAC mapping.
8. Replace lab credentials with Secrets Manager or Vault.
9. Add production GitLab Runner architecture.
10. Add GitOps controller such as Argo CD or Flux.
11. Add centralized logs and security audit retention.
12. Add monitoring dashboards and alerting.
13. Add backup restore testing and DR automation.
14. Add vulnerability scanning for code, containers, and artifacts.
15. Add policy-as-code checks for Terraform and Kubernetes.
16. Add WAF and stronger network controls.
17. Pin tool versions and create upgrade runbooks.
18. Add CI/CD pipeline templates with security gates.
19. Add onboarding documentation for application teams.
20. Add operational runbooks for incidents, access requests, failed pipelines, backups, and runner issues.

## Stage 1 Status

Stage 1 is successful as a proof of concept.

Completed:

- Terraform backend created.
- AWS dev infrastructure deployed.
- EC2 instance created and reachable.
- Docker Compose platform deployed.
- GitLab running.
- SonarQube running on active Community image.
- Artifactory running with PostgreSQL support.
- Keycloak running with POC HTTP hostname configuration.
- Grafana and Prometheus deployed.
- S3 backup bucket created.
- IAM role attached to EC2.
- SSM access verified through browser.
- Documentation and runbooks created.

Remaining for next stage:

- Configure GitLab projects/groups fully through provider.
- Register and validate GitLab runners.
- Connect GitLab pipelines to SonarQube.
- Publish artifacts into Artifactory.
- Configure GitLab SSO with Keycloak.
- Add GitOps controller.
- Improve monitoring and backup validation.
- Decide whether to keep the all-in-one POC or move to a production-style multi-service architecture.
