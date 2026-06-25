output "stream_arn" {
  description = "ARN of the Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.cloudtrail_to_opensearch.arn
}

output "stream_name" {
  description = "Name of the Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.cloudtrail_to_opensearch.name
}

output "role_arn" {
  description = "ARN of the IAM role used by Firehose"
  value       = local.firehose_role_arn
}

output "log_group_name" {
  description = "CloudWatch log group for Firehose delivery logs"
  value       = local.firehose_log_group_name
}

output "s3_backup_log_group_name" {
  description = "CloudWatch log group for S3 backup failure logs"
  value       = local.s3_log_group_name
}
