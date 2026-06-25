# Project Report: Enterprise GitLab Software Factory on AWS

## Executive Summary

This proof of concept implements a Bank of America style DevSecOps software factory on AWS. The goal is to show practical experience with GitLab administration, Terraform, Ansible, Kubernetes/OpenShift concepts, Artifactory, Xray-style artifact governance, SonarQube, CI/CD templates, GitOps, backups, monitoring, and cross-team onboarding.

The POC intentionally uses minimum infrastructure: one EC2 host for the core platform and optional EKS for Kubernetes runners and GitOps. This keeps cost low while preserving the architecture story you would use in a production banking environment.

## Business Problem

A large bank typically has many application teams, strict audit requirements, controlled access, security scanning requirements, and a need for repeatable delivery. The platform must solve:

- Fragmented source control and CI/CD patterns.
- Manual project onboarding.
- Inconsistent branch protection and RBAC.
- Inconsistent artifact storage and vulnerability scanning.
- Slow infrastructure provisioning.
- Poor visibility into failed pipelines and runner capacity.
- Manual recovery from outages.

This project solves those problems with a GitLab-centered platform backed by infrastructure as code and operational runbooks.

## Architecture Overview

The base POC uses:

- AWS VPC and public subnets.
- EC2 all-in-one Docker Compose host.
- GitLab CE for source control, projects, groups, merge requests, and CI/CD.
- SonarQube Community for code quality.
- Artifactory OSS for artifact repository concepts.
- Trivy and GitLab security scanning as an Xray fallback.
- Keycloak for SAML/SSO lab integration.
- Prometheus and Grafana for monitoring.
- S3 for GitLab backups.
- Ansible for host hardening, service checks, and backup execution.
- Optional EKS for Kubernetes executor runners, Argo CD, and app workloads.

## Why This Is a POC and Not Production

This is designed to demonstrate skill, not to run a bank production workload.

POC simplifications:

- GitLab runs in Docker Compose on one EC2 instance.
- PostgreSQL and Redis are bundled inside the GitLab container.
- SonarQube and Artifactory run on the same host.
- HTTP is allowed for fast lab setup.
- EKS is optional to avoid unnecessary control-plane cost.

Production improvements:

- Put GitLab behind an ALB with ACM TLS and WAF.
- Run GitLab in private subnets.
- Use RDS PostgreSQL and ElastiCache Redis.
- Use S3 object storage for artifacts, LFS, registry, packages, and backups.
- Use KMS encryption everywhere.
- Use Route 53, enterprise DNS, and enterprise SAML/OIDC.
- Use HA runners, private EKS nodes, network policies, and centralized secrets.
- Use JFrog Xray licensed policies for artifact promotion gates.

## Installation Options Considered

### Option 1: GitLab Omnibus on EC2

This is the common self-managed approach. GitLab packages all required services and is simple to operate for small to medium installations.

Pros:

- Easy to install and explain.
- Strong match for enterprise Linux administration.
- Good bridge to RDS, Redis, S3, and external services.

Cons:

- HA requires more design work.
- Scaling GitLab components independently is more complex.

### Option 2: GitLab Docker Compose on EC2

This is the option used for the POC.

Pros:

- Fastest reproducible lab.
- Easy cleanup.
- Lets multiple tools run on one instance.
- Good for portfolio proof without production cost.

Cons:

- Not the preferred production model for a regulated bank.
- Single-host failure domain.

### Option 3: GitLab Helm Chart on EKS

Pros:

- Kubernetes-native deployment.
- Scales components as pods.
- Good for teams already standardized on Kubernetes.

Cons:

- Higher learning curve.
- Requires mature Kubernetes operations.
- Persistent storage, backups, and upgrades need careful planning.

### Option 4: GitLab SaaS

Pros:

- Lowest operations burden.
- GitLab handles platform uptime and upgrades.

Cons:

- Less control over data location, custom networking, and enterprise integrations.
- May not satisfy all regulatory or internal banking controls.

## Why This POC Chooses Docker Compose on EC2

The requirement is to prove capability with minimum available resources. Docker Compose on EC2 gives the best demo value per dollar. You can still show the production design and explain how the POC evolves into the enterprise architecture.

The optional EKS add-on is included because the job description mentions Kubernetes/OpenShift and GitLab runners at scale. In the demo, EKS proves the Kubernetes executor pattern without forcing EKS cost on every run.

## Resource Inventory and Function

| Resource | Function |
|---|---|
| VPC | Isolated AWS network for the POC |
| Public subnets | Host EC2 and optional public EKS nodes for low-cost demo |
| Internet gateway | Provides inbound/outbound internet access |
| Security group | Restricts GitLab and admin services to `admin_cidr` |
| EC2 instance | Runs the all-in-one platform services |
| IAM role | Allows SSM access, CloudWatch integration, and S3 backup writes |
| S3 bucket | Stores GitLab backups and config copies |
| CloudWatch log group | Placeholder for platform logs and AWS-side observability |
| EKS cluster | Optional Kubernetes runner and GitOps target |
| EKS node group | Optional worker nodes for CI job pods and sample app |
| GitLab CE | Source control, CI/CD, users/groups/projects |
| SonarQube | Code quality, maintainability, and quality gate |
| Artifactory OSS | Artifact and container repository concept |
| Trivy | Open-source vulnerability scan fallback for Xray |
| Keycloak | SAML/SSO lab identity provider |
| Prometheus | Metrics collection |
| Grafana | Dashboard visualization |
| Argo CD | GitOps reconciliation for Kubernetes manifests |

## How the Tools Tie Together

1. A developer opens a merge request in GitLab.
2. GitLab CI starts the standard pipeline from `ci-templates`.
3. The runner executes the job. In the optional EKS path, each job runs as a Kubernetes pod.
4. The test stage runs Python unit tests.
5. SonarQube scans code and enforces quality.
6. GitLab security templates scan source, dependencies, secrets, and containers.
7. Docker builds the sample API image.
8. The image is published to Artifactory.
9. Xray would enforce artifact policy in production; the POC uses Trivy as an open-source fallback.
10. The deploy job updates the GitOps manifest with the new image tag.
11. Argo CD watches the GitOps repository and syncs EKS to the desired state.
12. Prometheus and Grafana monitor services and runners.
13. Ansible and scripts support hardening, backups, health checks, and remediation.

## GitLab Administration Demonstrated

- Groups: `platform-engineering`, `application-teams`, `security-engineering`.
- Projects: `ci-templates`, `platform-infra`, `gitops-config`, `sample-api`.
- Branch protection on `main`.
- Project variables for SonarQube, Artifactory, and environment selection.
- CI templates to standardize onboarding.
- Runner tags for controlled workload placement.
- Backup and restore process.
- SAML/SSO design through Keycloak.

## Terraform Demonstrated

- Remote backend bootstrap using S3 and DynamoDB.
- AWS network resources.
- IAM roles and least-privilege backup policy.
- EC2 bootstrap with user data.
- S3 encryption, versioning, lifecycle, and public access block.
- Optional EKS cluster and node group.
- GitLab provider for administration as code.

## Ansible Demonstrated

- Hardening SSH.
- Installing operational packages.
- Enabling audit and fail2ban.
- Running health checks.
- Triggering GitLab backups and syncing them to S3.

## Kubernetes/OpenShift Concepts Demonstrated

The optional EKS path maps directly to Kubernetes/OpenShift skills:

- Runner pods are short-lived CI workloads.
- Namespaces separate dev, stage, prod, and runner concerns.
- Argo CD reconciles desired state.
- Resource requests and limits prevent noisy-neighbor issues.
- The same pattern can translate to OpenShift with Routes, SCCs, and `oc` commands.

## Security and Compliance View

For a banking interview, emphasize:

- RBAC and least privilege.
- Protected branches and merge requests.
- Security scanning before artifact publication.
- Artifact governance through Artifactory and Xray design.
- Backups to encrypted S3.
- SAML/SSO integration design.
- Admin access restricted by `admin_cidr`.
- SSM Session Manager instead of broad SSH.
- Repeatable infrastructure and admin state through Terraform.

## Limitations

- The POC is not highly available.
- GitLab data uses local Docker volumes, not external RDS/Redis/S3 object storage.
- Xray is represented as design plus Trivy fallback because Xray usually requires licensing.
- TLS is optional and should be added for a public demo.
- EKS is public-subnet based for cost and simplicity.

## Recommended Demo Flow

1. Show Terraform files and explain the POC vs production tradeoff.
2. Open GitLab and show groups/projects.
3. Show branch protection and CI/CD variables.
4. Show the sample app pipeline.
5. Show SonarQube quality scan.
6. Show Artifactory repository target.
7. Show GitOps manifest update.
8. Show optional EKS runner pods.
9. Show backup runbook and S3 bucket.
10. Show incident runbooks.

