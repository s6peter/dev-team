
locals {
  firehose_role_arn = coalesce(var.firehose_stream.existing_role_arn, try(aws_iam_role.firehose_stream[0].arn, null))
}

resource "aws_cloudwatch_log_group" "firehose_delivery_log" {
  count             = var.firehose_stream.existing_firehose_log_group_name == null ? 1 : 0
  name              = local.firehose_log_group_name
  retention_in_days = var.firehose_stream.log_retention_days
  tags              = local.tags

  depends_on = [aws_iam_role.firehose_stream]
}

resource "aws_cloudwatch_log_stream" "firehose_delivery_stream" {
  count          = var.firehose_stream.existing_firehose_log_group_name == null ? 1 : 0
  name           = local.firehose_log_stream_name
  log_group_name = local.firehose_log_group_name

  depends_on = [aws_cloudwatch_log_group.firehose_delivery_log]
}

resource "aws_cloudwatch_log_group" "firehose_s3_log" {
  count             = var.firehose_stream.existing_s3_log_group_name == null ? 1 : 0
  name              = local.s3_log_group_name
  retention_in_days = var.firehose_stream.log_retention_days
  tags              = local.tags

  depends_on = [aws_iam_role.firehose_stream]
}

resource "aws_cloudwatch_log_stream" "firehose_s3_stream" {
  count          = var.firehose_stream.existing_s3_log_group_name == null ? 1 : 0
  name           = local.s3_log_stream_name
  log_group_name = local.s3_log_group_name

  depends_on = [aws_cloudwatch_log_group.firehose_s3_log]
}


resource "aws_kinesis_firehose_delivery_stream" "cloudtrail_to_opensearch" {
  name        = local.stream_name
  destination = "opensearch"

  opensearch_configuration {
    domain_arn            = var.firehose_stream.opensearch_domain_arn
    index_name            = var.firehose_stream.index_name
    index_rotation_period = var.firehose_stream.index_rotation
    role_arn              = local.firehose_role_arn

    buffering_interval = var.firehose_stream.buffer_interval_sec
    buffering_size     = var.firehose_stream.buffer_size_mb
    retry_duration     = var.firehose_stream.retry_duration_sec

    s3_configuration {
      role_arn            = local.firehose_role_arn
      bucket_arn          = var.firehose_stream.s3_backup_bucket_arn
      prefix              = "firehose-backup/failed-records/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
      error_output_prefix = "firehose-backup/errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/!{firehose:error-output-type}/"

      compression_format = "GZIP"

      cloudwatch_logging_options {
        enabled         = var.firehose_stream.cloudwatch_logging
        log_group_name  = local.s3_log_group_name
        log_stream_name = local.s3_log_stream_name
      }
    }

    s3_backup_mode = "FailedDocumentsOnly"

    cloudwatch_logging_options {
      enabled         = var.firehose_stream.cloudwatch_logging
      log_group_name  = local.firehose_log_group_name
      log_stream_name = local.firehose_log_stream_name
    }

    processing_configuration {
      enabled = true

      processors {
        type = "Lambda"

        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = var.firehose_stream.lambda_transformer_arn
        }
      }
    }

    vpc_config {
      role_arn           = local.firehose_role_arn
      subnet_ids         = var.firehose_stream.vpc_subnet_ids
      security_group_ids = var.firehose_stream.security_group_ids
    }

  }

  tags = local.tags

  depends_on = [
    aws_iam_role_policy.firehose_to_s3,
    aws_iam_role_policy.firehose_to_opensearch,
    aws_iam_role_policy.firehose_invoke_lambda,
    aws_iam_role_policy.firehose_cloudwatch_logs
  ]
}
