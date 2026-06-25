# Usage Report: GitLab Cloud Native Production Scaffold

## Purpose

This project demonstrates how to build a production-ready GitLab Cloud Native architecture on AWS using Terraform and Helm.

GitLab provides the official Helm charts for GitLab and GitLab Runner. GitLab also documents the reference architecture for external PostgreSQL, Redis, and object storage. AWS infrastructure such as EKS, RDS, ElastiCache, S3, IAM, ALB, ACM, Route 53, WAF, KMS, and Secrets Manager must be provisioned separately. This scaffold shows how to wire those layers together.

## What GitLab Provides vs What We Build

| Component | GitLab provides ready resource? | This project uses |
|---|---:|---|
| GitLab on Kubernetes | Yes | Official GitLab Helm chart in `charts/gitlab` |
| GitLab Runner on Kubernetes | Yes | Official GitLab Runner Helm chart in `charts/gitlab-runner` |
| PostgreSQL config | Yes, Helm values support external DB | Terraform-provisioned RDS PostgreSQL |
| Redis config | Yes, Helm values support external Redis | Terraform-provisioned ElastiCache Redis |
| S3 object storage config | Yes, Helm values support object storage | Terraform-provisioned S3 buckets |
| EKS cluster | No | Terraform AWS EKS module |
| RDS PostgreSQL | No | Terraform AWS RDS module |
| ElastiCache Redis | No | Native Terraform resources |
| ALB, WAF, Route 53, ACM | No | Terraform and EKS add-ons |
| Full AWS production platform | No | Built by combining Terraform modules and Helm charts |

## What Was Added

### Terraform Foundation

Location:

```text
terraform/envs/test
```

Resources scaffolded:

- VPC with public, private, and database subnets.
- EKS cluster with managed node groups.
- EKS managed add-ons: VPC CNI, CoreDNS, kube-proxy, EBS CSI, EKS Pod Identity Agent.
- RDS PostgreSQL for GitLab application data.
- ElastiCache Redis for GitLab cache, sessions, queues, and coordination.
- S3 buckets for artifacts, LFS, uploads, packages, registry, Terraform state, dependency proxy, external diffs, and backups.
- KMS encryption key.
- Baseline WAF Web ACL.

Terraform modules downloaded locally by `terraform init`:

```text
terraform-aws-modules/vpc/aws
terraform-aws-modules/eks/aws
terraform-aws-modules/rds/aws
```

### Helm Values

Location:

```text
helm-values/
```

Files:

| File | Purpose |
|---|---|
| `gitlab-values.yaml` | GitLab Helm chart values using external RDS, Redis, and S3 |
| `gitlab-runner-values.yaml` | GitLab Runner Helm chart values using Kubernetes executor |
| `object-storage-secret.example.yaml` | Example object storage secret using AWS IAM profile |
| `registry-storage-secret.example.yaml` | Example GitLab registry S3 storage secret |
| `postgres-password-secret.example.yaml` | Example PostgreSQL password secret |

### EKS Add-ons

Location:

```text
scripts/install-eks-addons.sh
```

Add-ons installed by the script:

- AWS Load Balancer Controller.
- metrics-server.
- cert-manager.
- cluster-autoscaler.
- external-secrets.
- optional external-dns.

The EKS module manages AWS-side EKS add-ons:

- VPC CNI.
- CoreDNS.
- kube-proxy.
- AWS EBS CSI driver.
- EKS Pod Identity Agent.

## Cost Controls

### No-Cost Validation Mode

Use:

```text
terraform.tfvars.example
```

This keeps all resource creation flags disabled:

```hcl
create_vpc        = false
create_eks        = false
create_rds        = false
create_redis      = false
create_s3_buckets = false
create_waf        = false
```

Use this mode to test Terraform formatting, initialization, validation, and module wiring without creating AWS resources.

Commands:

```bash
cd gitlab-cloud-native-prod/terraform/envs/test
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
AWS_PROFILE=gitlab-hosted-demo terraform plan
```

Expected result:

```text
No AWS infrastructure resources are created.
```

### Paid Sandbox Mode

Use:

```text
terraform.tfvars.sandbox.example
```

This creates a minimal paid sandbox. It is still billable.

Cost-reduction choices:

| Setting | Sandbox value | Why |
|---|---|---|
| `az_count` | `2` | Reduces subnet/NAT footprint |
| `gitlab_app_desired_size` | `0` | Avoids running GitLab app nodes until needed |
| `runner_desired_size` | `0` | Avoids runner node cost until needed |
| `db_instance_class` | `db.t4g.micro` | Smallest practical RDS test class |
| `db_multi_az` | `false` | Avoids Multi-AZ test cost |
| `redis_node_type` | `cache.t4g.micro` | Smallest practical Redis test class |
| `redis_replicas_per_node_group` | `0` | Avoids replica cost for sandbox |
| `create_waf` | `false` | Avoids WAF hourly/request charges in sandbox |

### Production Mode

Use:

```text
terraform.tfvars.prod.example
```

Production enables Multi-AZ and HA-oriented settings:

```hcl
az_count                       = 3
db_multi_az                    = true
redis_replicas_per_node_group  = 1
gitlab_app_min_size            = 2
gitlab_app_desired_size        = 3
runner_max_size                = 10
create_waf                     = true
```

## Deployment Workflow

### Step 1: Initialize Terraform

```bash
cd gitlab-cloud-native-prod/terraform/envs/test
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
```

### Step 2: Choose the Cost Profile

No-cost validation:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Paid sandbox:

```bash
cp terraform.tfvars.sandbox.example terraform.tfvars
```

Production example:

```bash
cp terraform.tfvars.prod.example terraform.tfvars
```

### Step 3: Plan Infrastructure

```bash
AWS_PROFILE=gitlab-hosted-demo terraform plan
```

Only apply when the plan and cost are approved:

```bash
AWS_PROFILE=gitlab-hosted-demo terraform apply
```

### Step 4: Configure kubectl

After EKS exists:

```bash
aws eks update-kubeconfig \
  --name $(terraform output -raw cluster_name) \
  --region us-east-1
```

### Step 5: Install EKS Add-ons

```bash
export CLUSTER_NAME="$(terraform output -raw cluster_name)"
export AWS_REGION="us-east-1"
../../../scripts/install-eks-addons.sh
```

Before production use, replace `CHANGE_ME_example.com` in the external-dns section if enabling external DNS.

### Step 6: Create Namespaces

```bash
kubectl create namespace gitlab
kubectl create namespace gitlab-runner
```

### Step 7: Create Required Secrets

From the project root:

PostgreSQL password:

```bash
kubectl apply -f helm-values/postgres-password-secret.example.yaml
```

Object storage:

```bash
kubectl apply -f helm-values/object-storage-secret.example.yaml
```

Registry storage:

```bash
kubectl apply -f helm-values/registry-storage-secret.example.yaml
```

For production, use External Secrets Operator and AWS Secrets Manager instead of static YAML secrets.

### Step 8: Update GitLab Helm Values

Edit:

```text
helm-values/gitlab-values.yaml
```

Replace:

- `CHANGE_ME_example.com`
- `CHANGE_ME_ACM_CERTIFICATE_ARN`
- `CHANGE_ME_RDS_ENDPOINT`
- `CHANGE_ME_REDIS_ENDPOINT`
- all `CHANGE_ME_*_BUCKET` values

Use Terraform outputs:

```bash
terraform output rds_endpoint
terraform output redis_primary_endpoint
terraform output s3_buckets
```

### Step 9: Install GitLab

From the project root:

```bash
helm upgrade --install gitlab ./charts/gitlab \
  --namespace gitlab \
  --values helm-values/gitlab-values.yaml
```

### Step 10: Install GitLab Runner

Create a GitLab runner token in GitLab after GitLab is available.

Edit:

```text
helm-values/gitlab-runner-values.yaml
```

Replace:

- `CHANGE_ME_example.com`
- `CHANGE_ME_RUNNER_AUTHENTICATION_TOKEN`
- `CHANGE_ME_RUNNER_CACHE_BUCKET`

Install:

```bash
helm upgrade --install gitlab-runner ./charts/gitlab-runner \
  --namespace gitlab-runner \
  --values helm-values/gitlab-runner-values.yaml
```

## Production Notes

This scaffold is production-oriented but not production-complete until these items are finalized:

- Accurate GitLab sizing based on user count and RPS.
- Domain ownership and Route 53 records.
- ACM certificate validation.
- WAF association with the ALB created by ingress.
- IAM roles for AWS Load Balancer Controller, external-dns, EBS CSI, and runner pods.
- External Secrets Operator integration with AWS Secrets Manager.
- Backup and restore testing.
- GitLab license and edition decision.
- Monitoring, logging, and alerting integration.
- Network policies and pod security standards.
- Runner class design for build, security, deploy, and admin jobs.

## Interview Explanation

Use this wording:

```text
GitLab provides the official Helm charts for Cloud Native GitLab and GitLab Runner. For AWS, I built the infrastructure layer separately with Terraform: EKS for GitLab and runner pods, RDS PostgreSQL for GitLab state, ElastiCache Redis for caching and queues, S3 for artifacts and registry storage, KMS for encryption, Secrets Manager for credentials, and ALB/WAF/ACM/Route 53 for secure ingress. The Helm values then point GitLab to those external managed services. This follows the GitLab cloud-native reference architecture while keeping durable state outside Kubernetes.
```
