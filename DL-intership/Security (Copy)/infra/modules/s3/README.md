# AWS S3 Module

Creates an S3 bucket with versioning, encryption, public access blocking, and optional lifecycle rules.

## Usage

```hcl
module "s3_log_archive" {
  source = "../../modules/s3"

  s3 = {
    name_prefix             = "development"
    bucket_name             = "log-archive"
    aws_region              = "us-east-1"
    enable_private          = true
    enable_versioning       = true
    enable_encryption       = true
    enable_public_access_block = true
    kms_key_arn             = module.kms.key_arns["logging"]

    lifecycle_rules = [
      {
        id           = "archive-old-logs"
        enabled      = true
        days         = 90
        storage_class = "GLACIER"
      }
    ]

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
| `s3.name_prefix` | Prefix for bucket name | `string` | n/a | yes |
| `s3.bucket_name` | Bucket name component | `string` | n/a | yes |
| `s3.aws_region` | AWS region | `string` | n/a | yes |
| `s3.enable_private` | Block all public access | `bool` | `true` | no |
| `s3.enable_versioning` | Enable bucket versioning | `bool` | `true` | no |
| `s3.enable_encryption` | Enable server-side encryption | `bool` | `true` | no |
| `s3.enable_public_access_block` | Enable public access blocklist | `bool` | `true` | no |
| `s3.kms_key_arn` | KMS key ARN for encryption (optional) | `string` | `null` | no |
| `s3.lifecycle_rules` | Lifecycle rules (transition and/or expiration) | `list(object)` | `[]` | no |
| `s3.tags` | Tags for bucket | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `bucket_arn` | S3 bucket ARN |
| `bucket_id` | S3 bucket ID |
| `bucket_name` | S3 bucket name |
| `bucket_region` | S3 bucket region |

## Notes

- Bucket names are globally unique; name_prefix + bucket_name must be unique across AWS.
- Versioning is enabled by default for immutability.
- Public access blocking is enforced by default.
- Lifecycle rules are optional; use for archive/delete transitions.
- KMS encryption recommended for compliance; uses AWS-managed S3 key if not provided.
