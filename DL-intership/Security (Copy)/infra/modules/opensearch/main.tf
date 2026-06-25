locals {
  domain_name             = coalesce(var.opensearch.existing_domain_name, "${var.opensearch.name_prefix}-${var.opensearch.domain_name}")
  availability_zone_count = min(length(var.opensearch.vpc_subnet_ids), 3)
  zone_awareness_enabled  = local.availability_zone_count >= 2
  use_existing_domain     = var.opensearch.existing_domain_name != null
  access_policy_principal_arns = length(var.opensearch.access_policy_principal_arns) > 0 ? var.opensearch.access_policy_principal_arns : [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
  ]
  log_publishing_options = {
    AUDIT_LOGS          = var.opensearch.enable_audit_logs ? var.opensearch.audit_log_group_name : ""
    INDEX_SLOW_LOGS     = var.opensearch.index_slow_log_group_name
    SEARCH_SLOW_LOGS    = var.opensearch.search_slow_log_group_name
    ES_APPLICATION_LOGS = var.opensearch.application_log_group_name
  }
}

data "aws_opensearch_domain" "existing" {
  count       = local.use_existing_domain ? 1 : 0
  domain_name = local.domain_name
}

resource "aws_opensearch_domain" "this" {
  count = local.use_existing_domain ? 0 : 1

  domain_name    = local.domain_name
  engine_version = var.opensearch.engine_version

  access_policies = var.opensearch.enable_access_policy ? jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = local.access_policy_principal_arns
        }
        Action   = "es:ESHttp*"
        Resource = "arn:aws:es:${var.opensearch.aws_region}:${data.aws_caller_identity.current.account_id}:domain/${local.domain_name}/*"
      }
    ]
  }) : null


  cluster_config {
    instance_type            = var.opensearch.instance_type
    instance_count           = var.opensearch.data_node_count
    dedicated_master_enabled = var.opensearch.data_node_count >= 3 ? true : false
    dedicated_master_type    = var.opensearch.data_node_count >= 3 ? "t3.small.search" : null
    dedicated_master_count   = var.opensearch.data_node_count >= 3 ? 3 : null
    zone_awareness_enabled   = local.zone_awareness_enabled

    dynamic "zone_awareness_config" {
      for_each = local.zone_awareness_enabled ? [1] : []
      content {
        availability_zone_count = local.availability_zone_count
      }
    }
  }

  ebs_options {
    ebs_enabled = var.opensearch.ebs_enabled
    volume_size = var.opensearch.ebs_volume_size
    volume_type = var.opensearch.ebs_volume_type
    iops        = var.opensearch.ebs_volume_type == "gp3" ? 3000 : null
    throughput  = var.opensearch.ebs_volume_type == "gp3" ? 125 : null
  }

  vpc_options {
    subnet_ids         = var.opensearch.vpc_subnet_ids
    security_group_ids = var.opensearch.security_group_ids
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = var.opensearch.kms_key_arn != "" ? var.opensearch.kms_key_arn : null
  }

  node_to_node_encryption {
    enabled = var.opensearch.enable_node_to_node_encryption
  }

  domain_endpoint_options {
    enforce_https       = var.opensearch.enforce_https
    tls_security_policy = var.opensearch.tls_security_policy
  }

  dynamic "snapshot_options" {
    for_each = var.opensearch.automated_snapshot_start_hour == null ? [] : [1]
    content {
      automated_snapshot_start_hour = var.opensearch.automated_snapshot_start_hour
    }
  }

  advanced_security_options {
    enabled                        = var.opensearch.enable_authentication
    internal_user_database_enabled = true

    dynamic "master_user_options" {
      for_each = var.opensearch.enable_authentication ? [1] : []
      content {
        master_user_name     = var.opensearch.master_username
        master_user_password = var.opensearch.master_password
      }
    }
  }

  dynamic "log_publishing_options" {
    for_each = var.opensearch.enable_log_publishing ? {
      for log_type, log_group_name in local.log_publishing_options : log_type => log_group_name
      if log_group_name != ""
    } : {}
    content {
      cloudwatch_log_group_arn = "arn:aws:logs:${var.opensearch.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${log_publishing_options.value}:*"
      enabled                  = true
      log_type                 = log_publishing_options.key
    }
  }

  advanced_options = var.opensearch.advanced_options

  auto_tune_options {
    desired_state       = var.opensearch.auto_tune_desired_state
    rollback_on_disable = "DEFAULT_ROLLBACK"
  }

  off_peak_window_options {
    enabled = var.opensearch.enable_off_peak_window

    off_peak_window {
      window_start_time {
        hours   = var.opensearch.off_peak_window_start_hour
        minutes = var.opensearch.off_peak_window_start_minute
      }
    }
  }

  software_update_options {
    auto_software_update_enabled = var.opensearch.auto_software_update_enabled
  }

  tags = var.opensearch.enable_tags ? merge(
    var.opensearch.tags,
    { Name = local.domain_name }
  ) : {}

}




data "aws_caller_identity" "current" {}
