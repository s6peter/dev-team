variable "opensearch" {
  type = object({
    name_prefix    = string
    aws_region     = string
    domain_name    = string
    engine_version = optional(string, "OpenSearch_2.11")

    data_node_count = optional(number, 3)
    instance_type   = optional(string, "t3.medium.search")
    ebs_enabled     = optional(bool, true)
    ebs_volume_size = optional(number, 100)
    ebs_volume_type = optional(string, "gp3")

    vpc_subnet_ids     = list(string)
    security_group_ids = list(string)

    kms_key_arn                    = optional(string, "")
    enforce_https                  = optional(bool, true)
    tls_security_policy            = optional(string, "Policy-Min-TLS-1-2-2019-07")
    enable_node_to_node_encryption = optional(bool, true)

    enable_authentication = optional(bool, true)
    master_username       = optional(string, "admin")
    master_password       = optional(string, "")

    enable_access_policy         = optional(bool, true)
    access_policy_principal_arns = optional(list(string), [])

    enable_audit_logs          = optional(bool, true)
    enable_log_publishing      = optional(bool, true)
    audit_log_group_name       = optional(string, "")
    index_slow_log_group_name  = optional(string, "")
    search_slow_log_group_name = optional(string, "")
    application_log_group_name = optional(string, "")
    audit_log_role_arn         = optional(string, "")

    auto_tune_desired_state       = optional(string, "ENABLED")
    auto_software_update_enabled  = optional(bool, true)
    automated_snapshot_start_hour = optional(number, 3)
    enable_off_peak_window        = optional(bool, true)
    off_peak_window_start_hour    = optional(number, 2)
    off_peak_window_start_minute  = optional(number, 0)
    advanced_options = optional(map(string), {
      "indices.fielddata.cache.size"        = "20"
      "indices.query.bool.max_clause_count" = "4096"
      "override_main_response_version"      = "false"
    })

    existing_domain_name = optional(string, null)
    enable_tags          = optional(bool, true)
    tags                 = optional(map(string), {})
  })

  description = <<-EOT
    OpenSearch domain configuration for enterprise search and SIEM workloads.

    Creates a VPC-isolated OpenSearch cluster with KMS encryption, audit logging,
    fine-grained access control, and automatic performance tuning. Designed for
    CloudTrail log analysis and security event management.

    REQUIRED ATTRIBUTES:
    - name_prefix: OpenSearch resource name prefix, typically environment name (e.g., "dev", "prod").
    - aws_region: AWS region for OpenSearch domain (e.g., "us-east-1").
    - domain_name: OpenSearch domain name suffix (combined with name_prefix).
    - vpc_subnet_ids: List of private subnet IDs for OpenSearch placement (minimum 2).
    - security_group_ids: List of security group IDs restricting access to domain.
    - kms_key_arn: ARN of KMS key for at-rest encryption.

    OPTIONAL ATTRIBUTES:
    - engine_version: OpenSearch engine version (default: "OpenSearch_2.11").
    - data_node_count: Number of data nodes (default: 3, minimum 3 for production).
    - instance_type: OpenSearch node instance type (default: "t3.medium.search").
    - ebs_enabled: Enable EBS storage (default: true).
    - ebs_volume_size: EBS volume size in GB (default: 100).
    - ebs_volume_type: EBS volume type (default: "gp3").
    - enforce_https: Require HTTPS for all connections (default: true).
    - tls_security_policy: TLS version policy (default: "Policy-Min-TLS-1-2-2019-07").
    - enable_node_to_node_encryption: Encrypt traffic between cluster nodes (default: true).
    - enable_authentication: Enable fine-grained access control (default: true).
    - master_username: Master user for FGA (default: "admin").
    - master_password: Master password for fine-grained access control; if empty, ignored (default: "").
    - enable_access_policy: Attach a domain access policy (default: true).
    - access_policy_principal_arns: IAM principal ARNs allowed by the domain policy. Defaults to the current AWS account root principal.
    - enable_log_publishing: Enable configured CloudWatch log publishing options (default: true).
    - enable_audit_logs: Backward-compatible audit log enable flag (default: true).
    - audit_log_group_name: CloudWatch log group for audit logs (default: "").
    - index_slow_log_group_name: CloudWatch log group for index slow logs (default: "").
    - search_slow_log_group_name: CloudWatch log group for search slow logs (default: "").
    - application_log_group_name: CloudWatch log group for application logs (default: "").
    - audit_log_role_arn: IAM role ARN for audit logging (default: "").
    - auto_tune_desired_state: Auto-tune desired state (default: "ENABLED").
    - auto_software_update_enabled: Apply service software updates automatically (default: true).
    - automated_snapshot_start_hour: UTC hour for automated snapshots (default: 3; set null to omit).
    - enable_off_peak_window: Configure an off-peak maintenance window (default: true).
    - off_peak_window_start_hour: UTC hour for off-peak window start (default: 2).
    - off_peak_window_start_minute: UTC minute for off-peak window start (default: 0).
    - advanced_options: OpenSearch advanced options map.
    - tags: Map of resource tags (default: {}).

    RESOURCES CREATED:
    - AWS::OpenSearchService::Domain (VPC-isolated, encrypted, audited)
    - AWS::CloudWatch::LogGroup (audit logs)
    - AWS::IAM::Role (for audit logging)

    EXAMPLES:
    ```hcl
    opensearch = {
      name_prefix    = "dev"
      aws_region     = "us-east-1"
      domain_name    = "siem"
      data_node_count = 3
      instance_type  = "t3.medium.search"
      ebs_volume_size = 100
      vpc_subnet_ids = ["subnet-xxx", "subnet-yyy"]
      security_group_ids = ["sg-xxx"]
      kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
    }
    ```
  EOT

  sensitive = true

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.opensearch.aws_region))
    error_message = "aws_region must be a valid AWS region format (e.g., us-east-1, eu-west-1)."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.opensearch.name_prefix)) && length(var.opensearch.name_prefix) >= 2 && length(var.opensearch.name_prefix) <= 30
    error_message = "name_prefix must be lowercase alphanumeric with hyphens, between 2 and 30 characters."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.opensearch.domain_name)) && length(var.opensearch.domain_name) >= 1 && length(var.opensearch.domain_name) <= 28
    error_message = "domain_name must be lowercase alphanumeric with hyphens, between 1 and 28 characters."
  }

  validation {
    condition     = length(var.opensearch.vpc_subnet_ids) >= 1
    error_message = "vpc_subnet_ids must contain at least 1 subnet ID."
  }

  validation {
    condition     = length(var.opensearch.security_group_ids) >= 1
    error_message = "security_group_ids must contain at least 1 security group ID."
  }

  validation {
    condition     = var.opensearch.data_node_count >= 1
    error_message = "data_node_count must be at least 1."
  }

  validation {
    condition     = length(var.opensearch.vpc_subnet_ids) != 2 || var.opensearch.data_node_count % 2 == 0
    error_message = "data_node_count must be even when deploying across exactly 2 subnets/AZs."
  }

  validation {
    condition     = var.opensearch.ebs_volume_size >= 10 && var.opensearch.ebs_volume_size <= 1000
    error_message = "ebs_volume_size must be between 10 and 1000 GB."
  }

  validation {
    condition     = contains(["OpenSearch_2.11", "OpenSearch_2.9", "OpenSearch_2.7", "OpenSearch_2.5"], var.opensearch.engine_version)
    error_message = "engine_version must be a supported OpenSearch version (e.g., OpenSearch_2.11, OpenSearch_2.9)."
  }

  validation {
    condition     = !var.opensearch.enable_log_publishing || !var.opensearch.enable_audit_logs || var.opensearch.audit_log_group_name != ""
    error_message = "audit_log_group_name must be set when audit log publishing is enabled."
  }

  validation {
    condition     = var.opensearch.automated_snapshot_start_hour == null || (var.opensearch.automated_snapshot_start_hour >= 0 && var.opensearch.automated_snapshot_start_hour <= 23)
    error_message = "automated_snapshot_start_hour must be null or an hour from 0 to 23."
  }

  validation {
    condition     = var.opensearch.off_peak_window_start_hour >= 0 && var.opensearch.off_peak_window_start_hour <= 23
    error_message = "off_peak_window_start_hour must be an hour from 0 to 23."
  }

  validation {
    condition     = var.opensearch.off_peak_window_start_minute >= 0 && var.opensearch.off_peak_window_start_minute <= 59
    error_message = "off_peak_window_start_minute must be a minute from 0 to 59."
  }

  validation {
    condition     = !var.opensearch.enable_authentication || length(trimspace(var.opensearch.master_password)) >= 8
    error_message = "master_password must be at least 8 characters when enable_authentication is true."
  }

  validation {
    condition = !var.opensearch.enable_authentication || (
      can(regex("[A-Z]", var.opensearch.master_password)) &&
      can(regex("[a-z]", var.opensearch.master_password)) &&
      can(regex("[0-9]", var.opensearch.master_password)) &&
      can(regex("[^A-Za-z0-9]", var.opensearch.master_password))
    )
    error_message = "master_password must contain at least one uppercase letter, one lowercase letter, one number, and one special character when enable_authentication is true."
  }
}
