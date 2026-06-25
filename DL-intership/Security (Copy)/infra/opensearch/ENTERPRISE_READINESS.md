# Enterprise SIEM Deployment Readiness

## Current AWS Account Check

Validated on the active AWS credentials:

- Active account: `152617279670`
- Active principal: `arn:aws:iam::152617279670:user/prgramatic-access`
- Region: `us-east-1`

## Fresh Account Mode

`envs/development/terraform.tfvars` now uses:

```hcl
create_vpc = true
```

With this mode enabled, Terraform creates the missing foundations instead of requiring existing IDs:

- Dedicated VPC: `10.60.0.0/16`
- Two public subnets for NAT gateways
- Two private subnets for OpenSearch and Firehose ENIs
- OpenSearch security group
- KMS keys for logging and OpenSearch
- Log archive and Firehose backup buckets
- CloudTrail, CloudWatch Logs, Firehose, Lambda transformer, and OpenSearch

## Verified Locally

```bash
terraform -chdir=envs/development init -backend=false
terraform -chdir=envs/development validate
terraform -chdir=envs/development plan -input=false -out=/tmp/security-dev.tfplan
```

The latest plan succeeds and shows:

```text
Plan: 58 to add, 0 to change, 0 to destroy.
```

## Apply

Review cost before applying. This creates billable resources, including NAT gateways and an OpenSearch domain.

```bash
terraform -chdir=envs/development apply /tmp/security-dev.tfplan
```

## Bootstrap OpenSearch

Run from a host that can reach the private OpenSearch endpoint:

```bash
cd opensearch
export OPENSEARCH_URL="https://$(terraform -chdir=../envs/development output -raw opensearch_vpc_endpoint)"
export OPENSEARCH_USERNAME="admin"
export OPENSEARCH_PASSWORD="<master-password>"
./bootstrap.sh
```

## Reuse Existing Infrastructure Later

To reuse an existing VPC, set:

```hcl
create_vpc = false

existing_vpc_id                       = "<vpc-id>"
existing_private_subnet_ids           = ["<private-subnet-a>", "<private-subnet-b>"]
existing_opensearch_security_group_id = "<opensearch-sg-id>"
```

To reuse existing KMS keys, add:

```hcl
existing_kms_key_arns = {
  logging    = "<logging-kms-key-arn>"
  opensearch = "<opensearch-kms-key-arn>"
}
```

## Production Sizing Baseline

For production, change the OpenSearch module inputs in `envs/development/main.tf` or promote them into environment variables:

```hcl
data_node_count         = 3
instance_type           = "r6g.large.search"
ebs_volume_size         = 300
auto_tune_desired_state = "ENABLED"
```

Use three private subnets for Multi-AZ resilience before enabling standby mode.
