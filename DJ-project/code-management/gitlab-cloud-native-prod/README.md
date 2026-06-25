# GitLab Cloud Native Production Architecture on AWS

This project scaffolds a production-ready GitLab Cloud Native architecture for AWS.

It uses:

- Terraform for AWS infrastructure.
- Official GitLab Helm chart for GitLab on EKS.
- Official GitLab Runner Helm chart for Kubernetes executor runners.
- External RDS PostgreSQL.
- External ElastiCache Redis.
- External S3 object storage.
- EKS managed add-ons and platform add-ons.

## Architecture

```text
Users
  |
  v
Route 53
  |
  v
AWS ALB + ACM TLS + WAF
  |
  v
EKS Cluster
  |
  |-- gitlab namespace
  |     |-- webservice pods
  |     |-- sidekiq pods
  |     |-- gitlab-shell pods
  |     |-- toolbox pods
  |     |-- registry pods
  |
  |-- gitlab-runner namespace
  |     |-- runner manager pods
  |     |-- temporary CI job pods
  |
  v
Managed AWS Services
  |
  |-- RDS PostgreSQL
  |-- ElastiCache Redis
  |-- S3 object storage
  |-- KMS
  |-- Secrets Manager
```

## Directory Layout

```text
gitlab-cloud-native-prod/
  terraform/envs/test/        AWS foundation scaffold
  helm-values/                GitLab and runner Helm values
  charts/gitlab/              Vendored official GitLab Helm chart
  charts/gitlab-runner/       Vendored official GitLab Runner Helm chart
  scripts/install-eks-addons.sh
  docs/usage-report.md
```

## Cost-Safe First Test

The default example is no-cost validation mode.

```bash
cd gitlab-cloud-native-prod/terraform/envs/test
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
AWS_PROFILE=gitlab-hosted-demo terraform plan
```

Expected result:

```text
No AWS resources created.
```

The no-cost file keeps these values false:

```hcl
create_vpc        = false
create_eks        = false
create_rds        = false
create_redis      = false
create_s3_buckets = false
create_waf        = false
```

## Paid Sandbox Test

This creates real AWS resources and costs money.

```bash
cp terraform.tfvars.sandbox.example terraform.tfvars
AWS_PROFILE=gitlab-hosted-demo terraform plan
```

Sandbox cost-control values:

```hcl
gitlab_app_min_size     = 0
gitlab_app_desired_size = 0
runner_min_size         = 0
runner_desired_size     = 0
db_instance_class       = "db.t4g.micro"
redis_node_type         = "cache.t4g.micro"
db_multi_az             = false
create_waf              = false
```

Do not apply unless you accept AWS cost.

## Production Example

Use this only after reviewing sizing, domains, TLS, secrets, and cost.

```bash
cp terraform.tfvars.prod.example terraform.tfvars
AWS_PROFILE=gitlab-hosted-demo terraform plan
```

Production values enable:

```hcl
create_vpc        = true
create_eks        = true
create_rds        = true
create_redis      = true
create_s3_buckets = true
create_waf        = true
db_multi_az       = true
```

## Helm Charts

The official GitLab charts are vendored locally:

```text
charts/gitlab
charts/gitlab-runner
```

Refresh them with:

```bash
helm repo add gitlab https://charts.gitlab.io
helm repo update gitlab
rm -rf charts/gitlab charts/gitlab-runner
helm pull gitlab/gitlab --untar --untardir charts
helm pull gitlab/gitlab-runner --untar --untardir charts
```

## Next Steps Before Real Deployment

1. Replace every `CHANGE_ME` value in `helm-values/gitlab-values.yaml`.
2. Replace every `CHANGE_ME` value in `helm-values/gitlab-runner-values.yaml`.
3. Create Kubernetes secrets for PostgreSQL password and object storage config.
4. Confirm AWS Load Balancer Controller IAM permissions before installing add-ons.
5. Confirm RDS, Redis, and S3 outputs from Terraform.
6. Install EKS add-ons.
7. Install GitLab with Helm.
8. Install GitLab Runner with Helm.

See `docs/usage-report.md` for the full walkthrough.
