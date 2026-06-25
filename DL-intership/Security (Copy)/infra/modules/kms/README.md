# AWS KMS Module

Creates AWS KMS encryption keys with automatic key rotation and service principal access.

## Usage

```hcl
module "kms" {
  source = "../../modules/kms"

  kms = {
    aws_region              = "us-east-1"
    deletion_window_in_days = 30
    enable_key_rotation     = true

    keys = {
      "logging" = {
        description        = "KMS key for CloudTrail and log archive"
        alias              = "logging"
        service_principals = ["logs.amazonaws.com", "s3.amazonaws.com"]
      }
      "opensearch" = {
        description        = "KMS key for OpenSearch encryption"
        alias              = "opensearch"
        service_principals = ["es.amazonaws.com"]
      }
    }

    name_prefix = "development"
    tags = {
      Environment = "development"
      ManagedBy   = "terraform"
    }
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `kms.aws_region` | AWS region for KMS keys | `string` | n/a | yes |
| `kms.deletion_window_in_days` | Days before deletion (7-30) | `number` | `30` | no |
| `kms.enable_key_rotation` | Enable automatic key rotation | `bool` | `true` | no |
| `kms.keys` | Map of key configurations | `map(object)` | `{}` | no |
| `kms.name_prefix` | Prefix for key names | `string` | n/a | yes |
| `kms.tags` | Tags for all resources | `map(string)` | `{}` | no |

### Key Object

| Name | Description | Type | Required |
|------|-------------|------|----------|
| `description` | Key description | `string` | yes |
| `alias` | Key alias (no `alias/` prefix) | `string` | yes |
| `service_principals` | AWS services with key access | `list(string)` | no |

## Outputs

| Name | Description |
|------|-------------|
| `key_ids` | Map of key names to KMS Key IDs |
| `key_arns` | Map of key names to KMS Key ARNs |
| `key_aliases` | Map of key names to key aliases |

## Notes

- Key rotation is enabled by default for compliance.
- Deletion window is typically 30 days; use 7 for non-critical keys.
- Service principals are optional but recommended for service-managed keys.
