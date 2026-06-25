variable "firehose_stream" {
  description = "Configuration object for Firehose delivery stream"
  type = object({
    aws_region                       = string
    name_prefix                      = string
    opensearch_endpoint              = string
    opensearch_domain_arn            = string
    vpc_subnet_ids                   = list(string)
    security_group_ids               = list(string)
    lambda_transformer_arn           = string
    s3_backup_bucket_arn             = string
    s3_bucket_name                   = string
    backup_kms_key_arn               = optional(string, "")
    environment                      = optional(string, "development")
    existing_role_arn                = optional(string, null)
    existing_firehose_log_group_name = optional(string, null)
    existing_s3_log_group_name       = optional(string, null)
    buffer_size_mb                   = optional(number, 128)
    buffer_interval_sec              = optional(number, 60)
    index_name                       = optional(string, "cloudtrail-logs")
    index_rotation                   = optional(string, "OneDay")
    retry_duration_sec               = optional(number, 3600)
    cloudwatch_logging               = optional(bool, true)
    log_retention_days               = optional(number)
    enable_document_id               = optional(bool, true)
    tags                             = optional(map(string), {})
  })

  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.firehose_stream.name_prefix))
    error_message = "name_prefix must contain only lowercase alphanumeric characters and hyphens."
  }

  validation {
    condition     = length(var.firehose_stream.vpc_subnet_ids) >= 1
    error_message = "vpc_subnet_ids must contain at least one subnet ID."
  }

  validation {
    condition     = length(var.firehose_stream.security_group_ids) >= 1
    error_message = "security_group_ids must contain at least one security group ID."
  }

  validation {
    condition     = var.firehose_stream.buffer_size_mb >= 1 && var.firehose_stream.buffer_size_mb <= 100
    error_message = "buffer_size_mb must be between 1 and 100 MB."
  }

  validation {
    condition     = var.firehose_stream.buffer_interval_sec >= 60 && var.firehose_stream.buffer_interval_sec <= 900
    error_message = "buffer_interval_sec must be between 60 and 900 seconds."
  }

  validation {
    condition     = var.firehose_stream.retry_duration_sec >= 0 && var.firehose_stream.retry_duration_sec <= 7200
    error_message = "retry_duration_sec must be between 0 and 7200 seconds."
  }

  validation {
    condition     = var.firehose_stream.log_retention_days == null || contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.firehose_stream.log_retention_days)
    error_message = "log_retention_days must be a valid CloudWatch Logs retention value."
  }
}
