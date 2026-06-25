variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
}

variable "create_vpc" {
  description = "Whether Terraform should create a dedicated VPC and private subnets for the SIEM stack. Set false to reuse an existing VPC."
  type        = bool
  default     = true
}

variable "vpc_cidr_block" {
  description = "CIDR block for the SIEM VPC when create_vpc is true."
  type        = string
  default     = "10.60.0.0/16"
}

variable "vpc_availability_zones" {
  description = "Availability zones for the SIEM VPC when create_vpc is true."
  type        = list(string)
  default     = ["us-east-1a"]
}

variable "vpc_public_subnets" {
  description = "Public subnet definitions for NAT gateways and controlled access paths when create_vpc is true."
  type = list(object({
    cidr_block = string
    az         = string
  }))
  default = [
    { cidr_block = "10.60.1.0/24", az = "us-east-1a" }
  ]
}

variable "vpc_private_subnets" {
  description = "Private subnet definitions for OpenSearch and Firehose ENIs when create_vpc is true."
  type = list(object({
    cidr_block = string
    az         = string
  }))
  default = [
    { cidr_block = "10.60.11.0/24", az = "us-east-1a" }
  ]
}

variable "vpc_enable_nat_gateway" {
  description = "Whether to create NAT gateways for private subnet outbound access when create_vpc is true."
  type        = bool
  default     = false
}

variable "enable_dashboard_bastion" {
  description = "Whether to create an EC2 bastion host for browser/proxy access to private OpenSearch Dashboards."
  type        = bool
  default     = true
}

variable "dashboard_bastion_key_pair_name" {
  description = "Existing EC2 key pair name for the OpenSearch Dashboards bastion host."
  type        = string
  default     = "siem-key"
}

variable "dashboard_bastion_instance_type" {
  description = "EC2 instance type for the OpenSearch Dashboards bastion host."
  type        = string
  default     = "t3.nano"
}

variable "dashboard_bastion_root_volume_size" {
  description = "Root EBS volume size in GiB for the Dashboards bastion."
  type        = number
  default     = 8
}

variable "dashboard_bastion_allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into the OpenSearch Dashboards bastion host."
  type        = list(string)
  default     = []
}

variable "existing_vpc_id" {
  description = "Existing VPC ID to use for this environment. This is the recommended and most reliable way to select the target VPC."
  type        = string
  default     = null

  validation {
    condition     = var.create_vpc || var.existing_vpc_id != null || length(var.existing_vpc_tag_filters) > 0
    error_message = "Set create_vpc=true, existing_vpc_id, or existing_vpc_tag_filters."
  }
}

variable "existing_vpc_tag_filters" {
  description = "Tag filters used to find the existing VPC when existing_vpc_id is not set."
  type        = map(string)
  default     = {}
}

variable "existing_vpc_is_default" {
  description = "Whether the selected existing VPC should be the AWS account default VPC."
  type        = bool
  default     = false
}

variable "existing_vpc_cidr_block" {
  description = "Optional CIDR block used to narrow the existing VPC lookup when existing_vpc_id is not set."
  type        = string
  default     = null
}

variable "existing_kms_key_arns" {
  description = "Optional map of existing KMS key ARNs to reuse instead of creating new keys. Supported keys are logging and opensearch."
  type        = map(string)
  default     = {}
}

variable "existing_log_archive_bucket_name" {
  description = "Optional existing S3 bucket name for the CloudTrail log archive bucket."
  type        = string
  default     = null
}

variable "existing_firehose_backup_bucket_name" {
  description = "Optional existing S3 bucket name for the Firehose backup bucket."
  type        = string
  default     = null
}

variable "enable_kms_key_rotation" {
  description = "Whether Terraform should enable KMS key rotation when creating new keys."
  type        = bool
  default     = true
}

variable "create_customer_managed_kms_keys" {
  description = "Whether to create customer-managed KMS keys. Keep false for the lowest-cost personal demo; AWS-managed/S3-managed encryption is used instead."
  type        = bool
  default     = false
}

variable "cloudwatch_log_retention_days" {
  description = "Retention in days for demo CloudWatch log groups. Set null for no explicit retention because the whole stack is destroyed after practice."
  type        = number
  default     = null
}

variable "opensearch_data_node_count" {
  description = "Number of OpenSearch data nodes. Use 1 for the lowest-cost personal demo."
  type        = number
  default     = 1
}

variable "opensearch_instance_type" {
  description = "OpenSearch instance type. t3.small.search is a low-cost demo option."
  type        = string
  default     = "t3.small.search"
}

variable "opensearch_ebs_volume_size" {
  description = "OpenSearch EBS volume size in GiB."
  type        = number
  default     = 10
}

variable "opensearch_enable_log_publishing" {
  description = "Whether to publish OpenSearch service logs to CloudWatch. Disable for lower-cost demos."
  type        = bool
  default     = false
}

variable "cloudtrail_is_multi_region_trail" {
  description = "Whether CloudTrail records events from all regions. Disable for lower-cost demos."
  type        = bool
  default     = false
}

variable "cloudtrail_include_global_service_events" {
  description = "Whether CloudTrail includes global service events. Disable for lower-cost demos."
  type        = bool
  default     = false
}

variable "cloudtrail_enable_log_file_validation" {
  description = "Whether CloudTrail creates digest files for log validation. Disable for lower-cost demos."
  type        = bool
  default     = false
}

variable "enable_enterprise_siem_features" {
  description = "Enable enterprise-style SIEM additions: detections, incident queue, GuardDuty/Security Hub ingestion, VPC Flow Logs, and SOC IAM roles."
  type        = bool
  default     = true
}

variable "enable_guardduty_ingestion" {
  description = "Enable GuardDuty and ingest GuardDuty findings through EventBridge into the SIEM Firehose path."
  type        = bool
  default     = true
}

variable "enable_securityhub_ingestion" {
  description = "Enable Security Hub and ingest imported Security Hub findings through EventBridge into the SIEM Firehose path."
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs_ingestion" {
  description = "Enable VPC Flow Logs and ingest them through the SIEM Firehose path."
  type        = bool
  default     = true
}

variable "enable_detection_alerts" {
  description = "Create EventBridge detection rules, SNS alert topic, and SQS incident queue."
  type        = bool
  default     = true
}

variable "siem_alert_email_endpoints" {
  description = "Optional email addresses to subscribe to SIEM alert notifications. Email subscriptions require confirmation."
  type        = list(string)
  default     = []
}

variable "soc_trusted_principal_arns" {
  description = "Principal ARNs allowed to assume the SOC roles. Defaults to the current account root principal."
  type        = list(string)
  default     = []
}

variable "manage_opensearch_log_resource_policy" {
  description = "Whether Terraform should create/manage the CloudWatch Logs resource policy used by OpenSearch audit logging."
  type        = bool
  default     = true
}

variable "private_subnet_tag_filters" {
  description = "Optional tag filters used to narrow the private subnet lookup inside the selected VPC."
  type        = map(string)
  default     = {}
}

variable "existing_private_subnet_ids" {
  description = "Optional explicit private subnet IDs to use. When set, these take precedence over subnet auto-discovery."
  type        = list(string)
  default     = []
}

variable "cloudtrail_log_group_name" {
  description = "CloudWatch Logs log group name that receives CloudTrail events"
  type        = string
}

variable "cloudtrail_source_mode" {
  description = "How to wire CloudTrail into Firehose: auto, existing, or create."
  type        = string
  default     = "auto"

  validation {
    condition     = contains(["auto", "existing", "create"], var.cloudtrail_source_mode)
    error_message = "cloudtrail_source_mode must be one of: auto, existing, create."
  }
}

variable "manage_cloudtrail_log_archive_bucket_policy" {
  description = "Whether Terraform should manage the S3 bucket policy for the CloudTrail archive bucket."
  type        = bool
  default     = true
}

variable "existing_opensearch_security_group_id" {
  description = "Existing security group ID to reuse for OpenSearch and Firehose ENIs. When set, Terraform skips creating a new OpenSearch security group."
  type        = string
  default     = null
}

variable "existing_opensearch_logs_role_arn" {
  description = "Optional existing IAM role ARN for OpenSearch to publish audit logs to CloudWatch Logs."
  type        = string
  default     = null
}

variable "auto_discover_existing_iam_roles" {
  description = "Whether Terraform should search IAM for matching existing roles before creating new ones."
  type        = bool
  default     = true
}

variable "existing_cloudtrail_to_cloudwatch_role_arn" {
  description = "Optional existing IAM role ARN for CloudTrail to write to CloudWatch Logs."
  type        = string
  default     = null
}

variable "existing_cloudwatch_logs_to_firehose_role_arn" {
  description = "Optional existing IAM role ARN for CloudWatch Logs subscription delivery to Firehose."
  type        = string
  default     = null
}

variable "existing_firehose_transformer_role_arn" {
  description = "Optional existing IAM role ARN for the Firehose transformer Lambda."
  type        = string
  default     = null
}

variable "existing_firehose_stream_role_arn" {
  description = "Optional existing IAM role ARN for the Firehose delivery stream."
  type        = string
  default     = null
}

variable "existing_opensearch_audit_log_group_name" {
  description = "Optional existing CloudWatch log group name for OpenSearch audit logs."
  type        = string
  default     = null
}

variable "existing_firehose_transformer_log_group_name" {
  description = "Optional existing CloudWatch log group name for the Firehose transformer Lambda."
  type        = string
  default     = null
}

variable "existing_firehose_stream_log_group_name" {
  description = "Optional existing CloudWatch log group name for Firehose delivery logs."
  type        = string
  default     = null
}

variable "existing_firehose_s3_backup_log_group_name" {
  description = "Optional existing CloudWatch log group name for Firehose S3 backup failure logs."
  type        = string
  default     = null
}

variable "opensearch_master_username" {
  description = "OpenSearch master user username"
  type        = string
  sensitive   = true
}

variable "opensearch_master_password" {
  description = "OpenSearch master user password"
  type        = string
  sensitive   = true
}
