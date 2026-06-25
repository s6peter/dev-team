
resource "aws_iam_role" "firehose_stream" {
  count              = var.firehose_stream.existing_role_arn == null ? 1 : 0
  name               = local.role_name
  assume_role_policy = data.aws_iam_policy_document.firehose_assume_role.json
  tags               = local.tags
}

data "aws_iam_policy_document" "firehose_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["firehose.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}


resource "aws_iam_role_policy" "firehose_to_opensearch" {
  count  = var.firehose_stream.existing_role_arn == null ? 1 : 0
  name   = "${local.role_name}-opensearch"
  role   = aws_iam_role.firehose_stream[0].id
  policy = data.aws_iam_policy_document.firehose_to_opensearch.json
}

data "aws_iam_policy_document" "firehose_to_opensearch" {
  statement {
    sid = "OpenSearchDomainAccess"

    actions = [
      "es:DescribeElasticsearchDomain",
      "es:DescribeElasticsearchDomainConfig",
      "es:ESHttpPut",
      "es:ESHttpPost"
    ]

    resources = [
      var.firehose_stream.opensearch_domain_arn,
      "${var.firehose_stream.opensearch_domain_arn}/*"
    ]
  }

  statement {
    sid = "VPCAccess"

    actions = [
      "ec2:DescribeVpcs",
      "ec2:DescribeVpcAttribute",
      "ec2:DescribeSubnets",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeNetworkInterfaces",
      "ec2:CreateNetworkInterface",
      "ec2:CreateNetworkInterfacePermission",
      "ec2:DescribeNetworkInterfaceAttribute",
      "ec2:DeleteNetworkInterface",
      "ec2:CreateSecurityGroup"
    ]

    resources = ["*"]
  }
}


resource "aws_iam_role_policy" "firehose_to_s3" {
  count  = var.firehose_stream.existing_role_arn == null ? 1 : 0
  name   = "${local.role_name}-s3-backup"
  role   = aws_iam_role.firehose_stream[0].id
  policy = data.aws_iam_policy_document.firehose_to_s3.json
}

data "aws_iam_policy_document" "firehose_to_s3" {
  statement {
    sid = "S3BucketAccess"

    actions = [
      "s3:GetObject",
      "s3:AbortMultipartUpload",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:ListBucket",
      "s3:ListBucketVersions"
    ]

    resources = [
      var.firehose_stream.s3_backup_bucket_arn,
      "${var.firehose_stream.s3_backup_bucket_arn}/*"
    ]
  }

  dynamic "statement" {
    for_each = var.firehose_stream.backup_kms_key_arn != "" ? [1] : []

    content {
      sid = "KMSAccessForS3Backup"

      actions = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ]

      resources = [var.firehose_stream.backup_kms_key_arn]
    }
  }
}


resource "aws_iam_role_policy" "firehose_invoke_lambda" {
  count  = var.firehose_stream.existing_role_arn == null ? 1 : 0
  name   = "${local.role_name}-invoke-lambda"
  role   = aws_iam_role.firehose_stream[0].id
  policy = data.aws_iam_policy_document.firehose_invoke_lambda.json
}

data "aws_iam_policy_document" "firehose_invoke_lambda" {
  statement {
    sid = "InvokeLambdaTransformer"

    actions = [
      "lambda:InvokeFunction"
    ]

    resources = [
      var.firehose_stream.lambda_transformer_arn,
      "${var.firehose_stream.lambda_transformer_arn}:*"
    ]
  }
}


resource "aws_iam_role_policy" "firehose_cloudwatch_logs" {
  count  = var.firehose_stream.existing_role_arn == null ? 1 : 0
  name   = "${local.role_name}-cloudwatch-logs"
  role   = aws_iam_role.firehose_stream[0].id
  policy = data.aws_iam_policy_document.firehose_cloudwatch_logs.json
}

data "aws_iam_policy_document" "firehose_cloudwatch_logs" {
  statement {
    sid = "CloudWatchLogsWrite"

    actions = [
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:${var.firehose_stream.aws_region}:*:log-group:${local.firehose_log_group_name}:*"
    ]
  }

  statement {
    sid = "S3CloudWatchLogsWrite"

    actions = [
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:${var.firehose_stream.aws_region}:*:log-group:${local.s3_log_group_name}:*"
    ]
  }
}
