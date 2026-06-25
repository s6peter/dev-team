locals {
  name_prefix = var.firehose_stream.name_prefix
  environment = var.firehose_stream.environment

  stream_name              = "${local.name_prefix}-cloudtrail-firehose-stream"
  role_name                = "${local.name_prefix}-firehose-stream-role"
  firehose_log_group_name  = coalesce(var.firehose_stream.existing_firehose_log_group_name, "/aws/kinesisfirehose/${local.stream_name}")
  s3_log_group_name        = coalesce(var.firehose_stream.existing_s3_log_group_name, "/aws/s3/firehose-backup/${local.stream_name}")
  firehose_log_stream_name = "S3Delivery"
  s3_log_stream_name       = "S3FailureRecords"
  tags = merge(
    var.firehose_stream.tags,
    {
      Terraform = "true"
    }
  )
}
