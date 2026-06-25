# Enterprise GitLab Software Factory on AWS

Proof-of-concept platform for a Bank of America style DevSecOps code-management environment.

This project demonstrates self-managed GitLab administration, Terraform, Ansible, Kubernetes-based runners, CI/CD templates, GitOps, SonarQube quality gates, Artifactory/Xray-style artifact governance, monitoring, backup/restore, and app-team onboarding.

## What This Builds

The default POC keeps cost low by using:

- One AWS VPC with two public subnets.
- One EC2 all-in-one platform host.
- Docker Compose services for GitLab CE, SonarQube Community, Artifactory OSS, Keycloak, Prometheus, and Grafana.
- S3 bucket for GitLab backups and configuration backup.
- IAM role for SSM Session Manager, CloudWatch, and backup writes.
- Optional EKS cluster and node group for Kubernetes executor runners and Argo CD.

## Why This Shape

For production, you would split GitLab across ALB, private EC2 or Kubernetes, RDS PostgreSQL, ElastiCache Redis, S3 object storage, HA runners, WAF, Route 53, ACM, KMS, and enterprise identity. For this POC, the all-in-one host proves the integrations without forcing production spend.

## Main Folders

| Folder | Purpose |
|---|---|
| `terraform/backend` | S3 and DynamoDB remote state bootstrap |
| `terraform/envs/dev` | AWS POC infrastructure |
| `ansible` | Hardening, backup, and health-check playbooks |
| `gitlab-admin-as-code` | GitLab groups, projects, variables, and branch protection |
| `ci-templates` | Reusable GitLab CI/CD templates |
| `sample-app` | Flask application used to prove the pipeline |
| `gitops` | Kubernetes desired state for dev, stage, and prod |
| `kubernetes` | Helm values for runners, Argo CD, and SonarQube |
| `runbooks` | Operations and onboarding procedures |
| `docs` | Study report, reproduction guide, and interview story |

## Fast Path

```bash
cd terraform/backend
cp terraform.tfvars.example terraform.tfvars
# edit unique bucket name
terraform init
terraform apply

cd ../envs/dev
cp terraform.tfvars.example terraform.tfvars
# edit admin_cidr and backend.hcl
terraform init -backend-config=backend.hcl
terraform apply
```

Then read:

- `docs/project-report.md`
- `docs/reproduce-step-by-step.md`
- `docs/keycloak-sso-integration.md`
- `docs/stage2-report.md`
- `docs/interview-story-bank-of-america.md`
