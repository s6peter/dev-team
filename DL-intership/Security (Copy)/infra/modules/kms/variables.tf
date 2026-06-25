variable "kms" {
  type = object({
    aws_region              = string
    deletion_window_in_days = optional(number, 30)
    enable_key_rotation     = optional(bool, true)

    keys = optional(map(object({
      description        = string
      alias              = string
      service_principals = optional(list(string), [])
    })), {})

    name_prefix = string
    tags        = optional(map(string), {})
  })

  description = <<-EOT
    KMS key management configuration for customer-managed encryption keys.

    Enables creation and management of AWS KMS keys with automatic rotation,
    service principal authorization, and comprehensive policy attachment.

    REQUIRED ATTRIBUTES:
    - aws_region: AWS region for KMS keys (e.g., "us-east-1").
    - name_prefix: Name prefix for all KMS resources, typically environment name (e.g., "dev", "prod").

    OPTIONAL ATTRIBUTES:
    - deletion_window_in_days: Days before KMS key deletion after scheduling (default: 30, valid 7-30).
    - enable_key_rotation: Automatically rotate KMS key annually (default: true).
    - keys: Map of KMS key configurations with names as keys and objects as values (default: {}).
      - description: Human-readable key description.
      - alias: KMS key alias name (without "alias/" prefix).
      - service_principals: AWS service principals to authorize (e.g., "logs.amazonaws.com").
    - tags: Map of resource tags (default: {}).

    RESOURCES CREATED:
    - AWS::KMS::Key (customer-managed encryption keys)
    - AWS::KMS::Alias (user-friendly key references)
    - AWS::KMS::KeyPolicy (service principal authorizations)

    EXAMPLES:
    ```hcl
    keys = {
      "logging" = {
        description        = "Key for CloudTrail and log archive"
        alias              = "logging"
        service_principals = ["logs.amazonaws.com", "cloudtrail.amazonaws.com"]
      }
    }
    ```
  EOT

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.kms.aws_region))
    error_message = "aws_region must be a valid AWS region format (e.g., us-east-1, eu-west-1)."
  }

  validation {
    condition     = var.kms.deletion_window_in_days >= 7 && var.kms.deletion_window_in_days <= 30
    error_message = "deletion_window_in_days must be between 7 and 30 days."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.kms.name_prefix)) && length(var.kms.name_prefix) >= 2 && length(var.kms.name_prefix) <= 50
    error_message = "name_prefix must be lowercase alphanumeric with hyphens, between 2 and 50 characters."
  }

  validation {
    condition     = length(var.kms.keys) > 0
    error_message = "keys map must contain at least one key definition."
  }
}
