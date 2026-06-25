# AWS OpenSearch Module

Creates a hardened OpenSearch domain with VPC isolation, encryption at rest/in-transit, audit logging, and least-privilege access.

## Usage

```hcl
module "opensearch" {
  source = "../../modules/opensearch"

  opensearch = {
    name_prefix = "security"
    domain_name = "siem"

    engine_version         = "OpenSearch_2.11"
    data_node_count        = 3
    instance_type          = "t3.medium.search"
    ebs_enabled            = true
    ebs_volume_size        = 100
    ebs_volume_type        = "gp3"

    vpc_subnet_ids         = module.vpc.private_subnet_ids
    security_group_ids     = [aws_security_group.opensearch.id]

    kms_key_arn            = module.kms.key_arns["opensearch"]
    enforce_https          = true
    tls_security_policy    = "Policy-Min-TLS-1-2-2019-07"

    enable_authentication  = true
    master_username        = "admin"
    # master_password provided via tfvars or secrets manager

    enable_audit_logs      = true
    audit_log_group_name   = aws_cloudwatch_log_group.opensearch_audit.name
    audit_log_role_arn     = aws_iam_role.opensearch_logs.arn

    auto_tune_desired_state = "ENABLED"

    tags = var.common_tags
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `opensearch.name_prefix` | Prefix for domain name | `string` | n/a | yes |
| `opensearch.domain_name` | OpenSearch domain name component | `string` | n/a | yes |
| `opensearch.engine_version` | OpenSearch version | `string` | `"OpenSearch_2.11"` | no |
| `opensearch.data_node_count` | Number of data nodes | `number` | `3` | no |
| `opensearch.instance_type` | Instance type | `string` | `"t3.medium.search"` | no |
| `opensearch.ebs_enabled` | Enable EBS storage | `bool` | `true` | no |
| `opensearch.ebs_volume_size` | EBS volume size (GB) | `number` | `100` | no |
| `opensearch.ebs_volume_type` | EBS volume type | `string` | `"gp3"` | no |
| `opensearch.vpc_subnet_ids` | Private subnet IDs for VPC access | `list(string)` | `[]` | yes |
| `opensearch.security_group_ids` | Security group IDs for access control | `list(string)` | `[]` | yes |
| `opensearch.kms_key_arn` | KMS key ARN for encryption at rest | `string` | n/a | yes |
| `opensearch.enforce_https` | Enforce HTTPS | `bool` | `true` | no |
| `opensearch.tls_security_policy` | TLS security policy | `string` | `"Policy-Min-TLS-1-2-2019-07"` | no |
| `opensearch.enable_authentication` | Enable authentication | `bool` | `true` | no |
| `opensearch.master_username` | Master admin username | `string` | `"admin"` | no |
| `opensearch.master_password` | Master admin password (sensitive) | `string` | n/a | yes (if auth enabled) |
| `opensearch.enable_audit_logs` | Enable audit logging | `bool` | `true` | no |
| `opensearch.audit_log_group_name` | CloudWatch log group for audit logs | `string` | `""` | no |
| `opensearch.audit_log_role_arn` | IAM role ARN for audit log delivery | `string` | `""` | no |
| `opensearch.auto_tune_desired_state` | Auto-tune state | `string` | `"ENABLED"` | no |
| `opensearch.tags` | Tags for cluster | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `domain_arn` | OpenSearch domain ARN |
| `domain_endpoint` | OpenSearch domain endpoint (HTTPS) |
| `domain_id` | OpenSearch domain ID |
| `domain_name` | OpenSearch domain name |

## Security Considerations

- **VPC Isolation:** Domain must be deployed to private subnets only.
- **Encryption at Rest:** Always use KMS with customer-managed keys.
- **Encryption in Transit:** TLS 1.2+ enforced; certificates auto-managed by AWS.
- **Audit Logs:** Enable and route to CloudWatch for compliance.
- **Authentication:** Basic auth + IAM roles recommended.
- **Security Groups:** Restrict to ingestion pipelines and Kibana clients only.
- **Fine-Grained Access Control:** Use OpenSearch IAM integration for least-privilege.

## Notes

- Master password required; store in AWS Secrets Manager, not in tfvars.
- Auto-tune recommended for production; disabled for dev/test.
- Minimum 3 data nodes recommended for production (durability).
- Snapshot repository should be configured for backup/restore.
