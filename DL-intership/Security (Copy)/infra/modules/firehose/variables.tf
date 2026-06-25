variable "firehose_transformer" {
  type = object({
    aws_region = string

    name_prefix = string
    environment = optional(string, "development")

    memory_size             = optional(number, 256)
    timeout                 = optional(number, 60)
    log_retention_days      = optional(number)
    existing_role_arn       = optional(string, null)
    existing_function_name  = optional(string, null)
    existing_log_group_name = optional(string, null)

    tags = optional(map(string), {})
  })

  description = <<-EOT
    Firehose Lambda Transformer configuration object.
    
    Transforms CloudWatch Logs subscription filter events to OpenSearch-compatible JSON format.
    Decompresses gzip-encoded base64 data and parses JSON messages.

    REQUIRED ATTRIBUTES:
    - aws_region: AWS region (e.g., "us-east-1")
    - name_prefix: Prefix for resource names (e.g., "dev", "staging")

    OPTIONAL ATTRIBUTES:
    - environment: Environment name for tagging (default: "development")
    - memory_size: Lambda memory size in MB, range 128-10240 (default: 256)
    - timeout: Lambda timeout in seconds, range 1-900 (default: 60)
    - tags: Resource tags map (default: {})

    RESOURCES CREATED:
    - Lambda Function
    - IAM Role and inline Policy
    - CloudWatch Log Group (30-day retention)

    OUTPUTS PROVIDED:
    - function_name: Lambda function name
    - function_arn: Lambda function ARN
    - function_role_arn: IAM role ARN
    - log_group_name: CloudWatch log group name
  EOT

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.firehose_transformer.aws_region))
    error_message = "aws_region must be a valid AWS region format."
  }

  validation {
    condition     = var.firehose_transformer.memory_size >= 128 && var.firehose_transformer.memory_size <= 10240
    error_message = "memory_size must be between 128 and 10240 MB."
  }

  validation {
    condition     = var.firehose_transformer.timeout >= 1 && var.firehose_transformer.timeout <= 900
    error_message = "timeout must be between 1 and 900 seconds."
  }

  validation {
    condition     = var.firehose_transformer.log_retention_days == null || contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.firehose_transformer.log_retention_days)
    error_message = "log_retention_days must be a valid CloudWatch Logs retention value."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.firehose_transformer.name_prefix))
    error_message = "name_prefix must contain only lowercase letters, numbers, and hyphens."
  }
}
