locals {
  vpc_tag_filters = [
    for key, value in var.existing_vpc_tag_filters : {
      name   = "tag:${key}"
      values = [value]
    }
  ]

  private_subnet_tag_filters = [
    for key, value in var.private_subnet_tag_filters : {
      name   = "tag:${key}"
      values = [value]
    }
  ]

  explicit_private_subnet_ids = var.create_vpc ? [] : sort(var.existing_private_subnet_ids)
  explicit_vpc_id = try(one(distinct([
    for subnet in values(data.aws_subnet.explicit_private) : subnet.vpc_id
  ])), null)
  tagged_vpc_id               = try(one(data.aws_vpcs.selected[0].ids), null)
  vpc_name                    = try(var.existing_vpc_tag_filters["Name"], null)
  private_subnet_name_pattern = local.vpc_name != null ? lower(replace(local.vpc_name, "-vpc", "-private-subnet")) : null
  discovered_private_subnet_ids = sort([
    for subnet_id, subnet in data.aws_subnet.private_candidates : subnet_id
    if local.private_subnet_name_pattern == null || try(strcontains(lower(subnet.tags["Name"]), local.private_subnet_name_pattern), false)
  ])
  selected_private_subnet_ids = (
    var.create_vpc ? module.vpc[0].private_subnet_ids :
    length(local.explicit_private_subnet_ids) > 0 ? local.explicit_private_subnet_ids :
    local.discovered_private_subnet_ids
  )

  selected_private_vpc_ids = var.create_vpc ? [module.vpc[0].vpc_id] : sort(distinct([
    for subnet in values(data.aws_subnet.selected_private) : subnet.vpc_id
  ]))
  discovered_vpc_id = (
    length(local.selected_private_vpc_ids) > 0 ? local.selected_private_vpc_ids[0] : null
  )

  selected_vpc_id = (
    var.create_vpc ? module.vpc[0].vpc_id :
    var.existing_vpc_id != null ? var.existing_vpc_id :
    local.explicit_vpc_id != null ? local.explicit_vpc_id :
    local.tagged_vpc_id != null ? local.tagged_vpc_id :
    local.discovered_vpc_id
  )
  selected_vpc_cidr_block                     = var.create_vpc ? var.vpc_cidr_block : (var.existing_vpc_cidr_block != null ? var.existing_vpc_cidr_block : try(data.aws_vpc.selected[0].cidr_block, null))
  network_ready                               = var.create_vpc ? length(var.vpc_private_subnets) >= 1 : (local.selected_vpc_id != null && length(local.selected_private_subnet_ids) >= 1 && local.selected_vpc_cidr_block != null)
  selected_opensearch_security_group          = var.existing_opensearch_security_group_id != null ? var.existing_opensearch_security_group_id : try(aws_security_group.opensearch[0].id, null)
  use_existing_kms_keys                       = length(var.existing_kms_key_arns) > 0
  create_customer_managed_kms_keys            = var.create_customer_managed_kms_keys && !local.use_existing_kms_keys
  kms_key_arns                                = local.use_existing_kms_keys ? var.existing_kms_key_arns : (local.create_customer_managed_kms_keys ? module.kms[0].key_arns : { logging = "", opensearch = "" })
  desired_log_archive_bucket_name             = coalesce(var.existing_log_archive_bucket_name, "${var.environment}-log-archive-${data.aws_caller_identity.current.account_id}-${var.aws_region}")
  use_existing_log_archive_bucket             = var.existing_log_archive_bucket_name != null || (!var.create_vpc && try(data.external.log_archive_bucket_existing.result.exists, "false") == "true")
  selected_log_archive_bucket_name            = local.use_existing_log_archive_bucket ? local.desired_log_archive_bucket_name : try(module.s3_log_archive[0].bucket_name, null)
  selected_log_archive_bucket_arn             = "arn:aws:s3:::${local.selected_log_archive_bucket_name}"
  desired_firehose_backup_bucket_name         = coalesce(var.existing_firehose_backup_bucket_name, "${var.environment}-firehose-backup-${data.aws_caller_identity.current.account_id}-${var.aws_region}")
  use_existing_firehose_backup_bucket         = var.existing_firehose_backup_bucket_name != null || (!var.create_vpc && try(data.external.firehose_backup_bucket_existing.result.exists, "false") == "true")
  selected_firehose_backup_bucket_name        = local.use_existing_firehose_backup_bucket ? local.desired_firehose_backup_bucket_name : try(module.s3_firehose_backup[0].bucket_name, null)
  selected_firehose_backup_bucket_arn         = "arn:aws:s3:::${local.selected_firehose_backup_bucket_name}"
  desired_firehose_transformer_log_group_name = coalesce(var.existing_firehose_transformer_log_group_name, "/aws/lambda/${var.environment}-firehose-transformer")
  selected_firehose_transformer_log_group_name = (
    var.existing_firehose_transformer_log_group_name != null || (!var.create_vpc && try(data.external.firehose_transformer_log_group_existing.result.exists, "false") == "true")
  ) ? local.desired_firehose_transformer_log_group_name : null
  desired_firehose_transformer_function_name  = "${var.environment}-firehose-transformer"
  selected_firehose_transformer_function_name = !var.create_vpc && try(data.external.firehose_transformer_function_existing.result.exists, "false") == "true" ? local.desired_firehose_transformer_function_name : null
  desired_firehose_stream_log_group_name      = coalesce(var.existing_firehose_stream_log_group_name, "/aws/kinesisfirehose/${var.environment}-cloudtrail-firehose-stream")
  selected_firehose_stream_log_group_name = (
    var.existing_firehose_stream_log_group_name != null || (!var.create_vpc && try(data.external.firehose_stream_log_group_existing.result.exists, "false") == "true")
  ) ? local.desired_firehose_stream_log_group_name : null
  desired_firehose_s3_backup_log_group_name = coalesce(var.existing_firehose_s3_backup_log_group_name, "/aws/s3/firehose-backup/${var.environment}-cloudtrail-firehose-stream")
  selected_firehose_s3_backup_log_group_name = (
    var.existing_firehose_s3_backup_log_group_name != null || (!var.create_vpc && try(data.external.firehose_s3_backup_log_group_existing.result.exists, "false") == "true")
  ) ? local.desired_firehose_s3_backup_log_group_name : null
  desired_opensearch_domain_name  = "${var.environment}-siem"
  selected_opensearch_domain_name = !var.create_vpc && try(data.external.opensearch_domain_existing.result.exists, "false") == "true" ? local.desired_opensearch_domain_name : null
  enterprise_siem_enabled         = var.enable_enterprise_siem_features
  guardduty_ingestion_enabled     = local.enterprise_siem_enabled && var.enable_guardduty_ingestion
  securityhub_ingestion_enabled   = local.enterprise_siem_enabled && var.enable_securityhub_ingestion
  vpc_flow_logs_ingestion_enabled = local.enterprise_siem_enabled && var.enable_vpc_flow_logs_ingestion && var.create_vpc
  detection_alerts_enabled        = local.enterprise_siem_enabled && var.enable_detection_alerts
  soc_trusted_principal_arns      = length(var.soc_trusted_principal_arns) > 0 ? var.soc_trusted_principal_arns : ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
}

data "aws_vpcs" "selected" {
  count = !var.create_vpc && var.existing_vpc_id == null && length(var.existing_vpc_tag_filters) > 0 ? 1 : 0

  dynamic "filter" {
    for_each = local.vpc_tag_filters

    content {
      name   = filter.value.name
      values = filter.value.values
    }
  }

  dynamic "filter" {
    for_each = var.existing_vpc_is_default ? [1] : []

    content {
      name   = "isDefault"
      values = ["true"]
    }
  }

  dynamic "filter" {
    for_each = var.existing_vpc_cidr_block != null ? [var.existing_vpc_cidr_block] : []

    content {
      name   = "cidr-block"
      values = [filter.value]
    }
  }
}

data "aws_vpc" "selected" {
  count = !var.create_vpc && local.selected_vpc_id != null && var.existing_vpc_cidr_block == null ? 1 : 0
  id    = local.selected_vpc_id
}

data "external" "log_archive_bucket_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "s3_bucket"
    name   = local.desired_log_archive_bucket_name
    region = var.aws_region
  }
}

data "external" "firehose_backup_bucket_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "s3_bucket"
    name   = local.desired_firehose_backup_bucket_name
    region = var.aws_region
  }
}

data "external" "firehose_transformer_log_group_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "log_group"
    name   = local.desired_firehose_transformer_log_group_name
    region = var.aws_region
  }
}

data "external" "firehose_transformer_function_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "lambda_function"
    name   = local.desired_firehose_transformer_function_name
    region = var.aws_region
  }
}

data "external" "firehose_stream_log_group_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "log_group"
    name   = local.desired_firehose_stream_log_group_name
    region = var.aws_region
  }
}

data "external" "firehose_s3_backup_log_group_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "log_group"
    name   = local.desired_firehose_s3_backup_log_group_name
    region = var.aws_region
  }
}

data "external" "opensearch_domain_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "opensearch_domain"
    name   = local.desired_opensearch_domain_name
    region = var.aws_region
  }
}

data "archive_file" "opensearch_bootstrap_lambda" {
  type        = "zip"
  source_file = "${path.module}/../../opensearch/vpc_bootstrap_lambda.py"
  output_path = "${path.module}/../../opensearch/dist/vpc_bootstrap_lambda.zip"
}

data "aws_subnets" "private_candidates" {
  count = var.create_vpc ? 0 : 1

  dynamic "filter" {
    for_each = local.private_subnet_tag_filters

    content {
      name   = filter.value.name
      values = filter.value.values
    }
  }
}

data "aws_subnet" "explicit_private" {
  for_each = toset(local.explicit_private_subnet_ids)
  id       = each.value
}

data "aws_subnet" "private_candidates" {
  for_each = var.create_vpc ? toset([]) : toset(data.aws_subnets.private_candidates[0].ids)
  id       = each.value
}

data "aws_subnet" "selected_private" {
  for_each = var.create_vpc ? toset([]) : toset(local.selected_private_subnet_ids)
  id       = each.value
}

resource "terraform_data" "validate_network_selection" {
  input = local.selected_vpc_id

  lifecycle {
    precondition {
      condition     = length(local.selected_private_vpc_ids) <= 1
      error_message = "The discovered private subnets span multiple VPCs. Tighten private_subnet_tag_filters or set existing_private_subnet_ids so all selected private subnets belong to a single VPC."
    }

    precondition {
      condition     = local.network_ready
      error_message = "Unable to resolve a usable existing network from AWS. Ensure the VPC can be found from existing_vpc_id or existing_vpc_tag_filters, Terraform can find at least two private subnets from private_subnet_tag_filters or existing_private_subnet_ids, and set existing_vpc_cidr_block only if this role cannot read VPC attributes."
    }
  }
}

data "aws_cloudwatch_log_groups" "opensearch_audit_existing" {
  log_group_name_prefix = coalesce(var.existing_opensearch_audit_log_group_name, "/aws/opensearch/${var.environment}/audit")
}

data "external" "opensearch_index_slow_log_group_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "log_group"
    name   = local.opensearch_index_slow_log_group_name
    region = var.aws_region
  }
}

data "external" "opensearch_search_slow_log_group_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "log_group"
    name   = local.opensearch_search_slow_log_group_name
    region = var.aws_region
  }
}

data "external" "opensearch_application_log_group_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "log_group"
    name   = local.opensearch_application_log_group_name
    region = var.aws_region
  }
}

module "kms" {
  count  = local.create_customer_managed_kms_keys ? 1 : 0
  source = "../../modules/kms"

  kms = {
    aws_region              = var.aws_region
    deletion_window_in_days = 30
    enable_key_rotation     = var.enable_kms_key_rotation

    keys = {
      "logging" = {
        description        = "KMS key for CloudTrail and logs archive"
        alias              = "logging"
        service_principals = ["logs.amazonaws.com", "s3.amazonaws.com", "cloudtrail.amazonaws.com", "firehose.amazonaws.com"]
      }
      "opensearch" = {
        description        = "KMS key for OpenSearch cluster encryption"
        alias              = "opensearch"
        service_principals = ["es.amazonaws.com"]
      }
    }

    name_prefix = var.environment
    tags        = var.common_tags
  }
}

module "s3_log_archive" {
  count  = local.use_existing_log_archive_bucket ? 0 : 1
  source = "../../modules/s3"

  s3 = {
    name_prefix                = var.environment
    bucket_name                = "log-archive"
    aws_region                 = var.aws_region
    enable_private             = true
    enable_versioning          = false
    enable_encryption          = true
    enable_public_access_block = true
    kms_key_arn                = local.kms_key_arns["logging"]

    lifecycle_rules = []

    tags = merge(
      var.common_tags,
      { role = "log-archive" }
    )
  }
}

data "aws_iam_policy_document" "cloudtrail_s3_log_archive" {
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions   = ["s3:GetBucketAcl"]
    resources = [local.selected_log_archive_bucket_arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/${var.environment}-security-trail"]
    }
  }

  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions = ["s3:PutObject"]
    resources = [
      "${local.selected_log_archive_bucket_arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/${var.environment}-security-trail"]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail_log_archive" {
  count  = var.manage_cloudtrail_log_archive_bucket_policy ? 1 : 0
  bucket = local.selected_log_archive_bucket_name
  policy = data.aws_iam_policy_document.cloudtrail_s3_log_archive.json
}
module "vpc" {
  count  = var.create_vpc ? 1 : 0
  source = "../../modules/test-vpc-bation/vpc"

  vpc = {
    name_prefix        = var.environment
    aws_region         = var.aws_region
    cidr_block         = var.vpc_cidr_block
    availability_zones = var.vpc_availability_zones
    public_subnets     = var.vpc_public_subnets
    private_subnets    = var.vpc_private_subnets

    enable_nat_gateway   = var.vpc_enable_nat_gateway
    enable_dns_hostnames = true
    enable_dns_support   = true

    tags = var.common_tags
  }
}

module "dashboard_bastion" {
  count  = var.enable_dashboard_bastion && var.create_vpc ? 1 : 0
  source = "../../modules/test-vpc-bation/ec2-access"

  aws_region        = var.aws_region
  environment       = var.environment
  common_tags       = merge(var.common_tags, { purpose = "opensearch-dashboards-access" })
  vpc_id            = module.vpc[0].vpc_id
  vpc_cidr_block    = module.vpc[0].vpc_cidr
  public_subnet_id  = module.vpc[0].public_subnet_ids[0]
  key_pair_name     = var.dashboard_bastion_key_pair_name
  instance_type     = var.dashboard_bastion_instance_type
  allowed_ssh_cidrs = var.dashboard_bastion_allowed_ssh_cidrs
  root_volume_size  = var.dashboard_bastion_root_volume_size
}

resource "aws_security_group" "opensearch" {
  count = local.network_ready && var.existing_opensearch_security_group_id == null ? 1 : 0

  name_prefix = "${var.environment}-opensearch-"
  description = "Security group for OpenSearch cluster (User story #693 / Ticket #694)"
  vpc_id      = local.selected_vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [local.selected_vpc_cidr_block]
    description = "HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.common_tags,
    { Name = "${var.environment}-opensearch-sg" }
  )
}

resource "aws_iam_role" "opensearch_logs" {
  count       = local.create_opensearch_logs_role ? 1 : 0
  name_prefix = "${var.environment}-opensearch-logs-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "es.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "opensearch_logs" {
  count       = local.create_opensearch_logs_role ? 1 : 0
  name_prefix = "${var.environment}-opensearch-logs-"
  role        = aws_iam_role.opensearch_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEventsBatch",
          "logs:CreateLogStream",
          "logs:CreateLogGroup"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/opensearch/*",
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/opensearch/*:log-stream:*"
        ]
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "opensearch_audit" {
  count             = var.opensearch_enable_log_publishing && !local.use_existing_opensearch_audit_log_group ? 1 : 0
  name              = local.opensearch_audit_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "opensearch-audit-logs" }
  )
}

resource "aws_cloudwatch_log_group" "opensearch_index_slow" {
  count             = var.opensearch_enable_log_publishing && !local.use_existing_opensearch_index_slow_log_group ? 1 : 0
  name              = local.opensearch_index_slow_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "opensearch-index-slow-logs" }
  )
}

resource "aws_cloudwatch_log_group" "opensearch_search_slow" {
  count             = var.opensearch_enable_log_publishing && !local.use_existing_opensearch_search_slow_log_group ? 1 : 0
  name              = local.opensearch_search_slow_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "opensearch-search-slow-logs" }
  )
}

resource "aws_cloudwatch_log_group" "opensearch_application" {
  count             = var.opensearch_enable_log_publishing && !local.use_existing_opensearch_application_log_group ? 1 : 0
  name              = local.opensearch_application_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "opensearch-application-logs" }
  )
}

data "external" "opensearch_logs_resource_policy_existing" {
  program = ["/bin/bash", "${path.module}/aws_resource_exists.sh"]

  query = {
    type   = "logs_resource_policy"
    name   = "${var.environment}-opensearch-logs"
    region = var.aws_region
  }
}

resource "aws_cloudwatch_log_resource_policy" "opensearch_logs" {
  count       = var.opensearch_enable_log_publishing && var.manage_opensearch_log_resource_policy && (var.create_vpc || try(data.external.opensearch_logs_resource_policy_existing.result.exists, "false") != "true") ? 1 : 0
  policy_name = "${var.environment}-opensearch-logs"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "es.amazonaws.com"
        }
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          local.opensearch_audit_log_group_arn,
          "${local.opensearch_audit_log_group_arn}:log-stream:*",
          local.opensearch_index_slow_log_group_arn,
          "${local.opensearch_index_slow_log_group_arn}:log-stream:*",
          local.opensearch_search_slow_log_group_arn,
          "${local.opensearch_search_slow_log_group_arn}:log-stream:*",
          local.opensearch_application_log_group_arn,
          "${local.opensearch_application_log_group_arn}:log-stream:*"
        ]
      }
    ]
  })
}

data "aws_cloudwatch_log_groups" "cloudtrail_existing" {
  log_group_name_prefix = var.cloudtrail_log_group_name
}

data "aws_iam_roles" "opensearch_logs_existing" {
  count = var.auto_discover_existing_iam_roles && var.existing_opensearch_logs_role_arn == null ? 1 : 0

  name_regex  = "^${var.environment}-opensearch-logs-.*$"
  path_prefix = "/"
}

data "aws_iam_roles" "cloudtrail_to_cloudwatch_existing" {
  count = var.auto_discover_existing_iam_roles && var.existing_cloudtrail_to_cloudwatch_role_arn == null ? 1 : 0

  name_regex  = "^${var.environment}-cloudtrail-cw-.*$"
  path_prefix = "/"
}

data "aws_iam_roles" "cloudwatch_logs_to_firehose_existing" {
  count = var.auto_discover_existing_iam_roles && var.existing_cloudwatch_logs_to_firehose_role_arn == null ? 1 : 0

  name_regex  = "^${var.environment}-cw-to-firehose-.*$"
  path_prefix = "/"
}

data "aws_iam_roles" "firehose_transformer_existing" {
  count = var.auto_discover_existing_iam_roles && var.existing_firehose_transformer_role_arn == null ? 1 : 0

  name_regex  = "^${var.environment}-firehose-transformer-.*$"
  path_prefix = "/"
}

data "aws_iam_roles" "firehose_stream_existing" {
  count = var.auto_discover_existing_iam_roles && var.existing_firehose_stream_role_arn == null ? 1 : 0

  name_regex  = "^${var.environment}-firehose-stream-role$"
  path_prefix = "/"
}

locals {
  desired_opensearch_audit_log_group_name       = coalesce(var.existing_opensearch_audit_log_group_name, "/aws/opensearch/${var.environment}/audit")
  desired_opensearch_index_slow_log_group_name  = "/aws/opensearch/${var.environment}/index-slow"
  desired_opensearch_search_slow_log_group_name = "/aws/opensearch/${var.environment}/search-slow"
  desired_opensearch_application_log_group_name = "/aws/opensearch/${var.environment}/application"
  existing_opensearch_audit_log_group_names     = tolist(try(data.aws_cloudwatch_log_groups.opensearch_audit_existing.log_group_names, []))
  use_existing_opensearch_audit_log_group       = !var.create_vpc && contains(local.existing_opensearch_audit_log_group_names, local.desired_opensearch_audit_log_group_name)
  use_existing_opensearch_index_slow_log_group  = !var.create_vpc && try(data.external.opensearch_index_slow_log_group_existing.result.exists, "false") == "true"
  use_existing_opensearch_search_slow_log_group = !var.create_vpc && try(data.external.opensearch_search_slow_log_group_existing.result.exists, "false") == "true"
  use_existing_opensearch_application_log_group = !var.create_vpc && try(data.external.opensearch_application_log_group_existing.result.exists, "false") == "true"
  opensearch_audit_log_group_name               = local.desired_opensearch_audit_log_group_name
  opensearch_index_slow_log_group_name          = local.desired_opensearch_index_slow_log_group_name
  opensearch_search_slow_log_group_name         = local.desired_opensearch_search_slow_log_group_name
  opensearch_application_log_group_name         = local.desired_opensearch_application_log_group_name
  opensearch_audit_log_group_arn                = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${local.opensearch_audit_log_group_name}"
  opensearch_index_slow_log_group_arn           = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${local.opensearch_index_slow_log_group_name}"
  opensearch_search_slow_log_group_arn          = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${local.opensearch_search_slow_log_group_name}"
  opensearch_application_log_group_arn          = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${local.opensearch_application_log_group_name}"
  detected_opensearch_logs_role_arn             = var.create_vpc ? null : try(sort(tolist(data.aws_iam_roles.opensearch_logs_existing[0].arns))[0], null)
  detected_cloudtrail_to_cloudwatch_role_arn    = var.create_vpc ? null : try(sort(tolist(data.aws_iam_roles.cloudtrail_to_cloudwatch_existing[0].arns))[0], null)
  detected_cloudwatch_logs_to_firehose_role_arn = var.create_vpc ? null : try(sort(tolist(data.aws_iam_roles.cloudwatch_logs_to_firehose_existing[0].arns))[0], null)
  detected_firehose_transformer_role_arn        = var.create_vpc ? null : try(sort(tolist(data.aws_iam_roles.firehose_transformer_existing[0].arns))[0], null)
  detected_firehose_stream_role_arn             = var.create_vpc ? null : try(sort(tolist(data.aws_iam_roles.firehose_stream_existing[0].arns))[0], null)
  create_opensearch_logs_role                   = var.opensearch_enable_log_publishing && (var.existing_opensearch_logs_role_arn != null ? var.existing_opensearch_logs_role_arn : local.detected_opensearch_logs_role_arn) == null
  opensearch_logs_role_arn                      = local.create_opensearch_logs_role ? aws_iam_role.opensearch_logs[0].arn : (var.existing_opensearch_logs_role_arn != null ? var.existing_opensearch_logs_role_arn : local.detected_opensearch_logs_role_arn)
  existing_cloudtrail_log_group_names           = tolist(try(data.aws_cloudwatch_log_groups.cloudtrail_existing.log_group_names, []))
  existing_cloudtrail_log_group_arn             = try("${one(tolist(data.aws_cloudwatch_log_groups.cloudtrail_existing.arns))}:*", null)
  detected_existing_cloudtrail_log_group        = local.existing_cloudtrail_log_group_arn != null
  use_existing_cloudtrail_log_group = (
    var.cloudtrail_source_mode == "existing" ||
    (var.cloudtrail_source_mode == "auto" && !var.create_vpc &&
      local.detected_existing_cloudtrail_log_group
    )
  )
  create_cloudtrail_to_cloudwatch_role    = !local.use_existing_cloudtrail_log_group && (var.existing_cloudtrail_to_cloudwatch_role_arn != null ? var.existing_cloudtrail_to_cloudwatch_role_arn : local.detected_cloudtrail_to_cloudwatch_role_arn) == null
  cloudtrail_to_cloudwatch_role_arn       = local.use_existing_cloudtrail_log_group ? null : (local.create_cloudtrail_to_cloudwatch_role ? aws_iam_role.cloudtrail_to_cloudwatch[0].arn : (var.existing_cloudtrail_to_cloudwatch_role_arn != null ? var.existing_cloudtrail_to_cloudwatch_role_arn : local.detected_cloudtrail_to_cloudwatch_role_arn))
  create_cloudwatch_logs_to_firehose_role = local.network_ready && (var.existing_cloudwatch_logs_to_firehose_role_arn != null ? var.existing_cloudwatch_logs_to_firehose_role_arn : local.detected_cloudwatch_logs_to_firehose_role_arn) == null
  cloudwatch_logs_to_firehose_role_arn    = local.create_cloudwatch_logs_to_firehose_role ? aws_iam_role.cloudwatch_logs_to_firehose[0].arn : (var.existing_cloudwatch_logs_to_firehose_role_arn != null ? var.existing_cloudwatch_logs_to_firehose_role_arn : local.detected_cloudwatch_logs_to_firehose_role_arn)
  selected_cloudtrail_log_group_name      = local.use_existing_cloudtrail_log_group ? var.cloudtrail_log_group_name : aws_cloudwatch_log_group.cloudtrail_source[0].name
  selected_cloudtrail_log_group_arn       = local.use_existing_cloudtrail_log_group ? local.existing_cloudtrail_log_group_arn : "${aws_cloudwatch_log_group.cloudtrail_source[0].arn}:*"
}

resource "terraform_data" "validate_cloudtrail_source_mode" {
  input = var.cloudtrail_source_mode

  lifecycle {
    precondition {
      condition     = var.cloudtrail_source_mode != "existing" || local.detected_existing_cloudtrail_log_group
      error_message = "cloudtrail_source_mode is set to \"existing\", but CloudWatch log group ${var.cloudtrail_log_group_name} was not found in this account/region. Change cloudtrail_source_mode to \"auto\" or \"create\", or create the log group first."
    }
  }
}

resource "aws_cloudwatch_log_group" "cloudtrail_source" {
  count             = local.use_existing_cloudtrail_log_group ? 0 : 1
  name              = var.cloudtrail_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "cloudtrail-source-logs" }
  )
}

resource "aws_iam_role" "cloudtrail_to_cloudwatch" {
  count       = local.create_cloudtrail_to_cloudwatch_role ? 1 : 0
  name_prefix = "${var.environment}-cloudtrail-cw-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "cloudtrail_to_cloudwatch" {
  count       = local.create_cloudtrail_to_cloudwatch_role ? 1 : 0
  name_prefix = "${var.environment}-cloudtrail-cw-"
  role        = aws_iam_role.cloudtrail_to_cloudwatch[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          local.selected_cloudtrail_log_group_arn,
          replace(local.selected_cloudtrail_log_group_arn, ":*", ":log-stream:*")
        ]
      }
    ]
  })
}

resource "aws_cloudtrail" "this" {
  count = local.use_existing_cloudtrail_log_group ? 0 : 1

  name                          = "${var.environment}-security-trail"
  s3_bucket_name                = local.selected_log_archive_bucket_name
  enable_logging                = true
  include_global_service_events = var.cloudtrail_include_global_service_events
  is_multi_region_trail         = var.cloudtrail_is_multi_region_trail
  enable_log_file_validation    = var.cloudtrail_enable_log_file_validation
  cloud_watch_logs_group_arn    = local.selected_cloudtrail_log_group_arn
  cloud_watch_logs_role_arn     = local.cloudtrail_to_cloudwatch_role_arn
  kms_key_id                    = local.kms_key_arns["logging"] != "" ? local.kms_key_arns["logging"] : null

  depends_on = [
    module.s3_log_archive,
    aws_s3_bucket_policy.cloudtrail_log_archive,
    aws_iam_role_policy.cloudtrail_to_cloudwatch
  ]
}

resource "aws_iam_role" "cloudwatch_logs_to_firehose" {
  count = local.create_cloudwatch_logs_to_firehose_role ? 1 : 0

  name_prefix = "${var.environment}-cw-to-firehose-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "cloudwatch_logs_to_firehose" {
  count       = local.create_cloudwatch_logs_to_firehose_role ? 1 : 0
  name_prefix = "${var.environment}-cw-to-firehose-"
  role        = aws_iam_role.cloudwatch_logs_to_firehose[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "firehose:PutRecord",
          "firehose:PutRecordBatch"
        ]
        Resource = [
          module.firehose_stream[0].stream_arn
        ]
      }
    ]
  })
}

resource "aws_cloudwatch_log_subscription_filter" "cloudtrail_to_firehose_existing" {
  count = local.network_ready && local.use_existing_cloudtrail_log_group ? 1 : 0

  name            = "${var.environment}-cloudtrail-to-firehose"
  log_group_name  = var.cloudtrail_log_group_name
  filter_pattern  = ""
  destination_arn = module.firehose_stream[0].stream_arn
  role_arn        = local.cloudwatch_logs_to_firehose_role_arn

  depends_on = [
    module.firehose_stream,
    aws_iam_role_policy.cloudwatch_logs_to_firehose
  ]
}

resource "aws_cloudwatch_log_subscription_filter" "cloudtrail_to_firehose_created" {
  count = local.network_ready && !local.use_existing_cloudtrail_log_group ? 1 : 0

  name            = "${var.environment}-cloudtrail-to-firehose"
  log_group_name  = aws_cloudwatch_log_group.cloudtrail_source[0].name
  filter_pattern  = ""
  destination_arn = module.firehose_stream[0].stream_arn
  role_arn        = local.cloudwatch_logs_to_firehose_role_arn

  depends_on = [
    module.firehose_stream,
    aws_cloudwatch_log_group.cloudtrail_source,
    aws_cloudtrail.this,
    aws_iam_role_policy.cloudwatch_logs_to_firehose
  ]
}

module "opensearch" {
  count  = local.network_ready ? 1 : 0
  source = "../../modules/opensearch"
  providers = {
    aws = aws.no_default_tags
  }

  opensearch = {
    name_prefix          = var.environment
    aws_region           = var.aws_region
    domain_name          = "siem"
    existing_domain_name = local.selected_opensearch_domain_name

    engine_version  = "OpenSearch_2.11"
    data_node_count = var.opensearch_data_node_count
    instance_type   = var.opensearch_instance_type
    ebs_enabled     = true
    ebs_volume_size = var.opensearch_ebs_volume_size
    ebs_volume_type = "gp3"

    vpc_subnet_ids     = local.selected_private_subnet_ids
    security_group_ids = [local.selected_opensearch_security_group]

    kms_key_arn         = local.kms_key_arns["opensearch"]
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"

    enable_authentication        = true
    master_username              = var.opensearch_master_username
    master_password              = var.opensearch_master_password
    access_policy_principal_arns = ["*"]

    enable_audit_logs          = var.opensearch_enable_log_publishing
    enable_log_publishing      = var.opensearch_enable_log_publishing
    audit_log_group_name       = local.opensearch_audit_log_group_name
    index_slow_log_group_name  = local.opensearch_index_slow_log_group_name
    search_slow_log_group_name = local.opensearch_search_slow_log_group_name
    application_log_group_name = local.opensearch_application_log_group_name
    audit_log_role_arn         = local.opensearch_logs_role_arn

    auto_tune_desired_state       = "DISABLED"
    auto_software_update_enabled  = true
    automated_snapshot_start_hour = 3
    enable_off_peak_window        = true
    off_peak_window_start_hour    = 2
    off_peak_window_start_minute  = 0
    enable_tags                   = false

    tags = merge(
      var.common_tags,
      {
        role      = "opensearch-siem"
        Terraform = "true"
      }
    )
  }

  depends_on = [
    aws_cloudwatch_log_resource_policy.opensearch_logs,
    aws_cloudwatch_log_group.opensearch_audit,
    aws_cloudwatch_log_group.opensearch_index_slow,
    aws_cloudwatch_log_group.opensearch_search_slow,
    aws_cloudwatch_log_group.opensearch_application,
    aws_iam_role_policy.opensearch_logs
  ]
}

module "firehose_transformer" {
  source = "../../modules/firehose"

  firehose_transformer = {
    aws_region              = var.aws_region
    name_prefix             = var.environment
    environment             = var.environment
    memory_size             = 128
    timeout                 = 60
    log_retention_days      = var.cloudwatch_log_retention_days
    existing_role_arn       = var.existing_firehose_transformer_role_arn != null ? var.existing_firehose_transformer_role_arn : local.detected_firehose_transformer_role_arn
    existing_function_name  = local.selected_firehose_transformer_function_name
    existing_log_group_name = local.selected_firehose_transformer_log_group_name

    tags = merge(
      var.common_tags,
      {
        module      = "firehose-transformer"
        purpose     = "cloudtrail-ingestion"
        criticality = "high"
      }
    )
  }

  depends_on = []
}

module "firehose_stream" {
  count  = local.network_ready ? 1 : 0
  source = "../../modules/firehose-stream"

  firehose_stream = {
    aws_region                       = var.aws_region
    name_prefix                      = var.environment
    opensearch_endpoint              = module.opensearch[0].domain_endpoint
    opensearch_domain_arn            = module.opensearch[0].domain_arn
    vpc_subnet_ids                   = local.selected_private_subnet_ids
    security_group_ids               = [local.selected_opensearch_security_group]
    lambda_transformer_arn           = module.firehose_transformer.function_arn
    s3_backup_bucket_arn             = local.selected_firehose_backup_bucket_arn
    s3_bucket_name                   = local.selected_firehose_backup_bucket_name
    backup_kms_key_arn               = local.kms_key_arns["logging"]
    environment                      = var.environment
    existing_role_arn                = var.existing_firehose_stream_role_arn != null ? var.existing_firehose_stream_role_arn : local.detected_firehose_stream_role_arn
    existing_firehose_log_group_name = local.selected_firehose_stream_log_group_name
    existing_s3_log_group_name       = local.selected_firehose_s3_backup_log_group_name
    buffer_size_mb                   = 100
    buffer_interval_sec              = 60
    log_retention_days               = var.cloudwatch_log_retention_days
    index_name                       = "siem-events"
    index_rotation                   = "OneDay"
    retry_duration_sec               = 3600
    cloudwatch_logging               = true

    tags = merge(
      var.common_tags,
      {
        module      = "firehose-stream"
        purpose     = "cloudtrail-ingestion"
        criticality = "high"
      }
    )
  }

  depends_on = [
    module.firehose_transformer,
    module.opensearch,
    module.s3_firehose_backup
  ]
}

resource "aws_guardduty_detector" "siem" {
  count  = local.guardduty_ingestion_enabled ? 1 : 0
  enable = true

  tags = merge(
    var.common_tags,
    { purpose = "siem-guardduty-ingestion" }
  )
}

resource "aws_securityhub_account" "siem" {
  count                    = local.securityhub_ingestion_enabled ? 1 : 0
  enable_default_standards = false
}

resource "aws_cloudwatch_log_group" "guardduty_findings" {
  count             = local.guardduty_ingestion_enabled ? 1 : 0
  name              = "/aws/events/${var.environment}/guardduty-findings"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "siem-guardduty-findings" }
  )
}

resource "aws_cloudwatch_log_group" "securityhub_findings" {
  count             = local.securityhub_ingestion_enabled ? 1 : 0
  name              = "/aws/events/${var.environment}/securityhub-findings"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "siem-securityhub-findings" }
  )
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count             = local.vpc_flow_logs_ingestion_enabled ? 1 : 0
  name              = "/aws/vpc-flow-logs/${var.environment}/siem"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "siem-vpc-flow-logs" }
  )
}

resource "aws_cloudwatch_log_resource_policy" "eventbridge_to_siem_logs" {
  count       = local.guardduty_ingestion_enabled || local.securityhub_ingestion_enabled ? 1 : 0
  policy_name = "${var.environment}-eventbridge-siem-logs"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = compact([
          local.guardduty_ingestion_enabled ? "${aws_cloudwatch_log_group.guardduty_findings[0].arn}:*" : "",
          local.securityhub_ingestion_enabled ? "${aws_cloudwatch_log_group.securityhub_findings[0].arn}:*" : ""
        ])
      }
    ]
  })
}

resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  count       = local.guardduty_ingestion_enabled ? 1 : 0
  name        = "${var.environment}-guardduty-findings-to-siem"
  description = "Ingest GuardDuty findings into SIEM event logs"

  event_pattern = jsonencode({
    source        = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "guardduty_findings_log_group" {
  count = local.guardduty_ingestion_enabled ? 1 : 0
  rule  = aws_cloudwatch_event_rule.guardduty_findings[0].name
  arn   = aws_cloudwatch_log_group.guardduty_findings[0].arn

  depends_on = [aws_cloudwatch_log_resource_policy.eventbridge_to_siem_logs]
}

resource "aws_cloudwatch_event_rule" "securityhub_findings" {
  count       = local.securityhub_ingestion_enabled ? 1 : 0
  name        = "${var.environment}-securityhub-findings-to-siem"
  description = "Ingest Security Hub findings into SIEM event logs"

  event_pattern = jsonencode({
    source        = ["aws.securityhub"]
    "detail-type" = ["Security Hub Findings - Imported"]
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "securityhub_findings_log_group" {
  count = local.securityhub_ingestion_enabled ? 1 : 0
  rule  = aws_cloudwatch_event_rule.securityhub_findings[0].name
  arn   = aws_cloudwatch_log_group.securityhub_findings[0].arn

  depends_on = [aws_cloudwatch_log_resource_policy.eventbridge_to_siem_logs]
}

resource "aws_iam_role" "vpc_flow_logs" {
  count       = local.vpc_flow_logs_ingestion_enabled ? 1 : 0
  name_prefix = "${var.environment}-vpc-flow-logs-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "vpc_flow_logs" {
  count       = local.vpc_flow_logs_ingestion_enabled ? 1 : 0
  name_prefix = "${var.environment}-vpc-flow-logs-"
  role        = aws_iam_role.vpc_flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          aws_cloudwatch_log_group.vpc_flow_logs[0].arn,
          "${aws_cloudwatch_log_group.vpc_flow_logs[0].arn}:*"
        ]
      }
    ]
  })
}

resource "aws_flow_log" "siem_vpc" {
  count = local.vpc_flow_logs_ingestion_enabled ? 1 : 0

  iam_role_arn    = aws_iam_role.vpc_flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = local.selected_vpc_id

  tags = merge(
    var.common_tags,
    { Name = "${var.environment}-siem-vpc-flow-logs" }
  )

  depends_on = [aws_iam_role_policy.vpc_flow_logs]
}

resource "aws_cloudwatch_log_subscription_filter" "guardduty_to_firehose" {
  count = local.network_ready && local.guardduty_ingestion_enabled ? 1 : 0

  name            = "${var.environment}-guardduty-to-firehose"
  log_group_name  = aws_cloudwatch_log_group.guardduty_findings[0].name
  filter_pattern  = ""
  destination_arn = module.firehose_stream[0].stream_arn
  role_arn        = local.cloudwatch_logs_to_firehose_role_arn

  depends_on = [
    module.firehose_stream,
    aws_cloudwatch_event_target.guardduty_findings_log_group,
    aws_iam_role_policy.cloudwatch_logs_to_firehose
  ]
}

resource "aws_cloudwatch_log_subscription_filter" "securityhub_to_firehose" {
  count = local.network_ready && local.securityhub_ingestion_enabled ? 1 : 0

  name            = "${var.environment}-securityhub-to-firehose"
  log_group_name  = aws_cloudwatch_log_group.securityhub_findings[0].name
  filter_pattern  = ""
  destination_arn = module.firehose_stream[0].stream_arn
  role_arn        = local.cloudwatch_logs_to_firehose_role_arn

  depends_on = [
    module.firehose_stream,
    aws_cloudwatch_event_target.securityhub_findings_log_group,
    aws_iam_role_policy.cloudwatch_logs_to_firehose
  ]
}

resource "aws_cloudwatch_log_subscription_filter" "vpc_flow_logs_to_firehose" {
  count = local.network_ready && local.vpc_flow_logs_ingestion_enabled ? 1 : 0

  name            = "${var.environment}-vpc-flow-logs-to-firehose"
  log_group_name  = aws_cloudwatch_log_group.vpc_flow_logs[0].name
  filter_pattern  = ""
  destination_arn = module.firehose_stream[0].stream_arn
  role_arn        = local.cloudwatch_logs_to_firehose_role_arn

  depends_on = [
    module.firehose_stream,
    aws_flow_log.siem_vpc,
    aws_iam_role_policy.cloudwatch_logs_to_firehose
  ]
}

resource "aws_sns_topic" "siem_alerts" {
  count = local.detection_alerts_enabled ? 1 : 0
  name  = "${var.environment}-siem-alerts"

  tags = merge(
    var.common_tags,
    { purpose = "siem-alerts" }
  )
}

resource "aws_sns_topic_subscription" "siem_alert_email" {
  for_each = local.detection_alerts_enabled ? toset(var.siem_alert_email_endpoints) : toset([])

  topic_arn = aws_sns_topic.siem_alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sqs_queue" "siem_incidents" {
  count = local.detection_alerts_enabled ? 1 : 0
  name  = "${var.environment}-siem-incidents"

  message_retention_seconds = 1209600

  tags = merge(
    var.common_tags,
    { purpose = "siem-incident-workflow" }
  )
}

resource "aws_sns_topic_policy" "siem_alerts" {
  count = local.detection_alerts_enabled ? 1 : 0
  arn   = aws_sns_topic.siem_alerts[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.siem_alerts[0].arn
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "siem_incidents" {
  count     = local.detection_alerts_enabled ? 1 : 0
  queue_url = aws_sqs_queue.siem_incidents[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.siem_incidents[0].arn
      }
    ]
  })
}

resource "aws_cloudwatch_event_rule" "detect_root_activity" {
  count       = local.detection_alerts_enabled ? 1 : 0
  name        = "${var.environment}-detect-root-activity"
  description = "Detect root account API activity from CloudTrail"

  event_pattern = jsonencode({
    source        = ["aws.signin", "aws.iam", "aws.sts", "aws.cloudtrail", "aws.s3", "aws.ec2"]
    "detail-type" = ["AWS API Call via CloudTrail", "AWS Console Sign In via CloudTrail"]
    detail = {
      userIdentity = {
        type = ["Root"]
      }
    }
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_rule" "detect_iam_changes" {
  count       = local.detection_alerts_enabled ? 1 : 0
  name        = "${var.environment}-detect-iam-changes"
  description = "Detect IAM policy, role, user, group, and access key changes"

  event_pattern = jsonencode({
    source        = ["aws.iam"]
    "detail-type" = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["iam.amazonaws.com"]
      eventName = [
        "AttachGroupPolicy",
        "AttachRolePolicy",
        "AttachUserPolicy",
        "CreateAccessKey",
        "CreatePolicy",
        "CreatePolicyVersion",
        "DeletePolicy",
        "DeletePolicyVersion",
        "DetachGroupPolicy",
        "DetachRolePolicy",
        "DetachUserPolicy",
        "PutGroupPolicy",
        "PutRolePolicy",
        "PutUserPolicy",
        "UpdateAssumeRolePolicy"
      ]
    }
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_rule" "detect_cloudtrail_changes" {
  count       = local.detection_alerts_enabled ? 1 : 0
  name        = "${var.environment}-detect-cloudtrail-changes"
  description = "Detect CloudTrail tampering or trail configuration changes"

  event_pattern = jsonencode({
    source        = ["aws.cloudtrail"]
    "detail-type" = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["cloudtrail.amazonaws.com"]
      eventName = [
        "DeleteTrail",
        "PutEventSelectors",
        "StopLogging",
        "UpdateTrail"
      ]
    }
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_rule" "detect_guardduty_findings" {
  count       = local.detection_alerts_enabled && local.guardduty_ingestion_enabled ? 1 : 0
  name        = "${var.environment}-detect-guardduty-findings"
  description = "Send GuardDuty findings to alert and incident channels"

  event_pattern = jsonencode({
    source        = ["aws.guardduty"]
    "detail-type" = ["GuardDuty Finding"]
  })

  tags = var.common_tags
}

locals {
  detection_event_rule_names = compact([
    local.detection_alerts_enabled ? aws_cloudwatch_event_rule.detect_root_activity[0].name : "",
    local.detection_alerts_enabled ? aws_cloudwatch_event_rule.detect_iam_changes[0].name : "",
    local.detection_alerts_enabled ? aws_cloudwatch_event_rule.detect_cloudtrail_changes[0].name : "",
    local.detection_alerts_enabled && local.guardduty_ingestion_enabled ? aws_cloudwatch_event_rule.detect_guardduty_findings[0].name : ""
  ])
}

resource "aws_cloudwatch_event_target" "detection_alert_sns" {
  for_each = local.detection_alerts_enabled ? toset(local.detection_event_rule_names) : toset([])

  rule = each.value
  arn  = aws_sns_topic.siem_alerts[0].arn

  depends_on = [aws_sns_topic_policy.siem_alerts]
}

resource "aws_cloudwatch_event_target" "detection_incident_queue" {
  for_each = local.detection_alerts_enabled ? toset(local.detection_event_rule_names) : toset([])

  rule = each.value
  arn  = aws_sqs_queue.siem_incidents[0].arn

  depends_on = [aws_sqs_queue_policy.siem_incidents]
}

resource "aws_cloudwatch_dashboard" "soc_operations" {
  count          = local.enterprise_siem_enabled ? 1 : 0
  dashboard_name = "${var.environment}-soc-operations"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2
        properties = {
          markdown = "# ${var.environment} SOC Operations\nSIEM ingestion, detection, and incident workflow health."
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 12
        height = 6
        properties = {
          region = var.aws_region
          title  = "Firehose Delivery To OpenSearch"
          metrics = [
            ["AWS/Firehose", "DeliveryToAmazonOpenSearchService.Records", "DeliveryStreamName", "${var.environment}-cloudtrail-firehose-stream"],
            [".", "DeliveryToAmazonOpenSearchService.Success", ".", "."],
            [".", "DeliveryToAmazonOpenSearchService.DataFreshness", ".", "."]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 2
        width  = 12
        height = 6
        properties = {
          region = var.aws_region
          title  = "Transformer Errors"
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", "${var.environment}-firehose-transformer"],
            [".", "Invocations", ".", "."],
            [".", "Duration", ".", ".", { stat = "Average" }]
          ]
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 8
        height = 6
        properties = {
          region = var.aws_region
          title  = "GuardDuty Findings Ingested"
          metrics = local.guardduty_ingestion_enabled ? [
            ["AWS/Logs", "IncomingLogEvents", "LogGroupName", aws_cloudwatch_log_group.guardduty_findings[0].name]
          ] : []
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 8
        width  = 8
        height = 6
        properties = {
          region = var.aws_region
          title  = "Security Hub Findings Ingested"
          metrics = local.securityhub_ingestion_enabled ? [
            ["AWS/Logs", "IncomingLogEvents", "LogGroupName", aws_cloudwatch_log_group.securityhub_findings[0].name]
          ] : []
          stat   = "Sum"
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 8
        width  = 8
        height = 6
        properties = {
          region = var.aws_region
          title  = "Open Incident Queue Depth"
          metrics = local.detection_alerts_enabled ? [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.siem_incidents[0].name]
          ] : []
          stat   = "Average"
          period = 300
        }
      }
    ]
  })
}

resource "aws_iam_role" "soc_analyst" {
  count = local.enterprise_siem_enabled ? 1 : 0
  name  = "${var.environment}-soc-analyst-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = local.soc_trusted_principal_arns
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(var.common_tags, { purpose = "least-privilege-soc-readonly" })
}

resource "aws_iam_role" "incident_responder" {
  count = local.enterprise_siem_enabled ? 1 : 0
  name  = "${var.environment}-incident-responder-role"

  assume_role_policy = aws_iam_role.soc_analyst[0].assume_role_policy

  tags = merge(var.common_tags, { purpose = "least-privilege-incident-response" })
}

resource "aws_iam_role" "siem_admin" {
  count = local.enterprise_siem_enabled ? 1 : 0
  name  = "${var.environment}-siem-admin-role"

  assume_role_policy = aws_iam_role.soc_analyst[0].assume_role_policy

  tags = merge(var.common_tags, { purpose = "least-privilege-siem-admin" })
}

resource "aws_iam_role_policy" "soc_analyst" {
  count = local.enterprise_siem_enabled ? 1 : 0
  name  = "${var.environment}-soc-analyst-readonly"
  role  = aws_iam_role.soc_analyst[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpHead",
          "es:ESHttpPost"
        ]
        Resource = [
          module.opensearch[0].domain_arn,
          "${module.opensearch[0].domain_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents",
          "logs:GetLogEvents",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "incident_responder" {
  count = local.enterprise_siem_enabled ? 1 : 0
  name  = "${var.environment}-incident-responder"
  role  = aws_iam_role.incident_responder[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpHead",
          "es:ESHttpPost",
          "es:ESHttpPut"
        ]
        Resource = [
          module.opensearch[0].domain_arn,
          "${module.opensearch[0].domain_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ReceiveMessage"
        ]
        Resource = local.detection_alerts_enabled ? aws_sqs_queue.siem_incidents[0].arn : "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "siem_admin" {
  count = local.enterprise_siem_enabled ? 1 : 0
  name  = "${var.environment}-siem-admin"
  role  = aws_iam_role.siem_admin[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "es:ESHttp*"
        ]
        Resource = [
          module.opensearch[0].domain_arn,
          "${module.opensearch[0].domain_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents",
          "logs:GetLogEvents",
          "sqs:*"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "opensearch_bootstrap" {
  count             = local.network_ready ? 1 : 0
  name              = "/aws/lambda/${var.environment}-opensearch-bootstrap"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(
    var.common_tags,
    { purpose = "opensearch-bootstrap" }
  )
}

resource "aws_iam_role" "opensearch_bootstrap" {
  count = local.network_ready ? 1 : 0
  name  = "${var.environment}-opensearch-bootstrap-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "opensearch_bootstrap" {
  count = local.network_ready ? 1 : 0
  name  = "${var.environment}-opensearch-bootstrap-lambda-policy"
  role  = aws_iam_role.opensearch_bootstrap[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.opensearch_bootstrap[0].arn}:*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeSubnets",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "opensearch_bootstrap" {
  count = local.network_ready ? 1 : 0

  function_name = "${var.environment}-opensearch-bootstrap"
  description   = "Bootstrap OpenSearch SIEM security mappings, templates, and initial CloudTrail index"

  filename         = data.archive_file.opensearch_bootstrap_lambda.output_path
  source_code_hash = data.archive_file.opensearch_bootstrap_lambda.output_base64sha256
  handler          = "vpc_bootstrap_lambda.handler"
  runtime          = "python3.12"

  role        = aws_iam_role.opensearch_bootstrap[0].arn
  memory_size = 128
  timeout     = 120

  environment {
    variables = {
      OPENSEARCH_ENDPOINT         = module.opensearch[0].domain_endpoint
      OPENSEARCH_USERNAME         = var.opensearch_master_username
      OPENSEARCH_PASSWORD         = var.opensearch_master_password
      FIREHOSE_ROLE_ARN           = module.firehose_stream[0].role_arn
      SOC_ANALYST_ROLE_ARN        = local.enterprise_siem_enabled ? aws_iam_role.soc_analyst[0].arn : ""
      INCIDENT_RESPONDER_ROLE_ARN = local.enterprise_siem_enabled ? aws_iam_role.incident_responder[0].arn : ""
      SIEM_ADMIN_ROLE_ARN         = local.enterprise_siem_enabled ? aws_iam_role.siem_admin[0].arn : ""
      OPENSEARCH_REPLICA_COUNT    = var.opensearch_data_node_count > 1 ? "1" : "0"
    }
  }

  vpc_config {
    subnet_ids         = local.selected_private_subnet_ids
    security_group_ids = [local.selected_opensearch_security_group]
  }

  tags = merge(
    var.common_tags,
    { purpose = "opensearch-bootstrap" }
  )

  depends_on = [
    aws_cloudwatch_log_group.opensearch_bootstrap,
    aws_iam_role_policy.opensearch_bootstrap,
    aws_iam_role_policy.soc_analyst,
    aws_iam_role_policy.incident_responder,
    aws_iam_role_policy.siem_admin,
    module.opensearch,
    module.firehose_stream
  ]
}

resource "terraform_data" "opensearch_bootstrap" {
  count = local.network_ready ? 1 : 0

  triggers_replace = {
    function_name      = aws_lambda_function.opensearch_bootstrap[0].function_name
    function_code_hash = data.archive_file.opensearch_bootstrap_lambda.output_base64sha256
    opensearch_domain  = module.opensearch[0].domain_arn
    firehose_role_arn  = module.firehose_stream[0].role_arn
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      aws lambda wait function-active-v2 \
        --function-name '${aws_lambda_function.opensearch_bootstrap[0].function_name}' \
        --region '${var.aws_region}'
      aws lambda invoke \
        --function-name '${aws_lambda_function.opensearch_bootstrap[0].function_name}' \
        --region '${var.aws_region}' \
        --payload '{}' \
        /tmp/${aws_lambda_function.opensearch_bootstrap[0].function_name}-response.json
      cat /tmp/${aws_lambda_function.opensearch_bootstrap[0].function_name}-response.json
    EOT
  }

  depends_on = [
    aws_lambda_function.opensearch_bootstrap,
    module.firehose_stream
  ]
}

module "s3_firehose_backup" {
  count  = local.use_existing_firehose_backup_bucket ? 0 : 1
  source = "../../modules/s3"

  s3 = {
    name_prefix                = var.environment
    bucket_name                = "firehose-backup"
    aws_region                 = var.aws_region
    enable_private             = true
    enable_versioning          = false
    enable_encryption          = true
    enable_public_access_block = true
    kms_key_arn                = local.kms_key_arns["logging"]

    lifecycle_rules = []

    tags = merge(
      var.common_tags,
      { role = "firehose-backup" }
    )
  }
}

data "aws_caller_identity" "current" {}
