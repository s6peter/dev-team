# Enterprise GitLab on AWS — Terraform Reference Architecture

## Architecture Overview

```
                        ┌──────────────────────────┐
                        │     Route53 (DNS)         │
                        │  gitlab.example.com       │
                        └────────┬─────────────────┘
                                 │
                        ┌────────▼─────────────────┐
                        │    WAF (prod only)        │
                        └────────┬─────────────────┘
                                 │
                        ┌────────▼─────────────────┐
                        │   ALB (HTTPS/443, SSH/2222)│
                        └────────┬─────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼─────────┐  ┌────▼──────────┐  ┌─────▼──────────┐
    │  GitLab EC2 (AZ1) │  │ GitLab EC2(AZ2)│  │ GitLab EC2(AZ3)│
    │  via Auto Scaling │  │ via ASG        │  │ via ASG        │
    └─────────┬─────────┘  └────┬──────────┘  └─────┬──────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │              ┌─────────────▼──────────────┐             │
    │              │    Private Subnets          │             │
    │              │                             │             │
    │  ┌───────────▼────────┐   ┌────────────────▼──────────┐ │
    │  │   RDS PostgreSQL   │   │   ElastiCache Redis        │ │
    │  │   Multi-AZ, gp3    │   │   Multi-AZ, Encryption    │ │
    │  └────────────────────┘   └───────────────────────────┘ │
    │                                                         │
    │  ┌────────────────────────────────────────────────────┐ │
    │  │   S3 (artifacts, LFS, uploads, registry, backups)  │ │
    │  └────────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌────────────────────────────────────────────────────┐ │
    │  │   Runner ASG (auto-scaling CI/CD workers)          │ │
    │  └────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Component | Choice | Rationale |
|---|---|---|
| **Compute** | EC2 Auto Scaling Group | GitLab Rails + Sidekiq + Gitaly co-located; ASG for AZ failover |
| **Database** | RDS PostgreSQL (Multi-AZ) | Managed — no Patroni overhead; automated failover, backups, PITR |
| **Cache** | ElastiCache Redis (Multi-AZ) | GitLab requires Redis for Sidekiq, session cache, repository cache |
| **Storage** | S3 with KMS encryption | All GitLab object storage types (artifacts, LFS, uploads, packages, registry) |
| **Load Balancer** | ALB with WAF | TLS termination, SSH passthrough, rate limiting, OWASP rules |
| **Secrets** | AWS Secrets Manager | RDS credentials stored securely, rotated automatically |
| **Monitoring** | CloudWatch + Enhanced Monitoring | Dashboard for ALB/RDS/Redis metrics; Performance Insights for RDS |

## Prerequisites

- Terraform >= 1.6
- AWS credentials configured (env vars, ~/.aws/credentials, or IAM role)
- Route53 hosted zone (for DNS records)
- ACM certificate in `us-east-1` (for the ALB HTTPS listener)

## Usage

```bash
# 1. Copy and edit the example variables
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars

# 2. Initialize with remote state backend
cat > backend.hcl <<EOF
bucket         = "gitlab-enterprise-prod-tf-state"
key            = "gitlab/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "gitlab-enterprise-prod-tf-state-lock"
encrypt        = true
EOF

terraform init -backend-config=backend.hcl

# 3. Plan and apply
terraform plan -out=tfplan
terraform apply tfplan
```

## Post-Deployment Steps

1. **Configure GitLab runners** — Use Ansible to register EC2 runners or deploy Kubernetes-based runners
2. **Set up LDAP/SAML** — Integrate with corporate IdP (Azure AD, Okta)
3. **Enable Geo replication** — For DR across AWS regions (requires a secondary site)
4. **Integrate Artifactory/SonarQube** — Configure as CI/CD pipeline services
5. **Backup verification** — Test restore from S3 backups monthly

## Reference Architecture Sizing

| User Count | GitLab Instance Type | RDS Class | Redis Node | Runner Count |
|---|---|---|---|---|
| 0–500 | m6i.2xlarge | db.r6g.large | cache.r6g.large | 2–5 |
| 500–2,000 | m6i.4xlarge | db.r6g.xlarge | cache.r6g.large | 5–10 |
| 2,000–5,000 | m6i.8xlarge | db.r6g.2xlarge | cache.r6g.xlarge | 10–20 |
| 5,000+ | c/m6i.12xlarge cluster | db.r6g.4xlarge | cache.r6g.2xlarge cluster | 20–50+ |

## Files

| File | Purpose |
|---|---|
| `providers.tf` | AWS provider, Terraform backend config |
| `variables.tf` | All configurable variables with sane defaults |
| `main.tf` | VPC, subnets, route tables, NAT gateways |
| `security.tf` | KMS key, security groups, WAF |
| `database.tf` | RDS PostgreSQL, parameter group, Secrets Manager |
| `cache.tf` | ElastiCache Redis, parameter group |
| `storage.tf` | S3 buckets, DynamoDB for TF state lock |
| `compute.tf` | EC2 launch templates, Auto Scaling Groups, CloudWatch, backup automation |
| `loadbalancer.tf` | ALB, listeners, target groups, WAF association |
| `dns.tf` | Route53 A records |
| `outputs.tf` | Connection strings, bucket names, ASG names |
| `user_data.sh` | GitLab EE installation and configuration |
| `terraform.tfvars.example` | Sample variable values |
