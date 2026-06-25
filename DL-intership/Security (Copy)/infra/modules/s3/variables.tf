variable "s3" {
  type = object({
    name_prefix                = string
    bucket_name                = string
    aws_region                 = string
    enable_private             = optional(bool, true)
    enable_versioning          = optional(bool, true)
    enable_encryption          = optional(bool, true)
    enable_public_access_block = optional(bool, true)
    kms_key_arn                = optional(string, null)

    lifecycle_rules = optional(list(object({
      id              = string
      enabled         = optional(bool, true)
      days            = optional(number)
      storage_class   = optional(string)
      expiration_days = optional(number)
    })), [])

    tags = optional(map(string), {})
  })

  description = <<-EOT
    S3 bucket configuration with security-first defaults and lifecycle management.

    Creates encrypted S3 buckets with automatic versioning, lifecycle policies,
    and public access restrictions suitable for log archival and secure storage.

    REQUIRED ATTRIBUTES:
    - name_prefix: Prefix for bucket resources, typically environment name (e.g., "dev", "prod").
    - bucket_name: S3 bucket name suffix (combined with name_prefix as "{name_prefix}-{bucket_name}").
    - aws_region: AWS region for S3 bucket (e.g., "us-east-1").

    OPTIONAL ATTRIBUTES:
    - enable_private: Block all public access to bucket (default: true).
    - enable_versioning: Enable object versioning (default: true).
    - enable_encryption: Enable server-side encryption (default: true).
    - enable_public_access_block: Apply PublicAccessBlock policy (default: true).
    - kms_key_arn: KMS key ARN for encryption; if null, uses S3-managed SSE (default: null).
    - lifecycle_rules: List of lifecycle policies for object expiration/archival (default: []).
      - id: Unique lifecycle rule identifier.
      - enabled: Whether to apply the rule (default: true).
      - days: Number of days before transition takes effect.
      - storage_class: Target storage class for transition (e.g., "GLACIER", "DEEP_ARCHIVE", "INTELLIGENT_TIERING").
      - expiration_days: Number of days before object expiration.
    - tags: Map of resource tags (default: {}).

    RESOURCES CREATED:
    - AWS::S3::Bucket (encrypted, versioned, private)
    - AWS::S3::BucketVersioning
    - AWS::S3::BucketEncryption
    - AWS::S3::BucketPublicAccessBlock
    - AWS::S3::LifecycleConfiguration

    EXAMPLES:
    ```hcl
    lifecycle_rules = [
      {
        id            = "archive-to-glacier"
        enabled       = true
        days          = 90
        storage_class = "GLACIER"
      }
    ]
    ```
  EOT

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.s3.aws_region))
    error_message = "aws_region must be a valid AWS region format (e.g., us-east-1, eu-west-1)."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.s3.name_prefix)) && length(var.s3.name_prefix) >= 2 && length(var.s3.name_prefix) <= 30
    error_message = "name_prefix must be lowercase alphanumeric with hyphens, between 2 and 30 characters."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.s3.bucket_name)) && length(var.s3.bucket_name) >= 1 && length(var.s3.bucket_name) <= 30
    error_message = "bucket_name must be lowercase alphanumeric with hyphens, between 1 and 30 characters."
  }

  validation {
    condition = alltrue([
      for rule in var.s3.lifecycle_rules :
      (rule.days == null || try(rule.days >= 1 && rule.days <= 3650, false)) &&
      (rule.expiration_days == null || try(rule.expiration_days >= 1 && rule.expiration_days <= 3650, false))
    ])
    error_message = "lifecycle rule day values must be between 1 and 3650 when set."
  }

  validation {
    condition = alltrue([
      for rule in var.s3.lifecycle_rules :
      rule.storage_class == null || try(contains(["GLACIER", "DEEP_ARCHIVE", "INTELLIGENT_TIERING", "ONEZONE_IA", "STANDARD_IA"], rule.storage_class), false)
    ])
    error_message = "lifecycle_rules storage_class must be one of: GLACIER, DEEP_ARCHIVE, INTELLIGENT_TIERING, ONEZONE_IA, STANDARD_IA."
  }

  validation {
    condition = alltrue([
      for rule in var.s3.lifecycle_rules :
      (rule.storage_class != null && rule.days != null) || (rule.expiration_days != null)
    ])
    error_message = "Each lifecycle rule must define either (days + storage_class) for transition or expiration_days for deletion."
  }
}
