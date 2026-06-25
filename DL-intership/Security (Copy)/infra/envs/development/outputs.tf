output "kms_logging_key_arn" {
  description = "ARN of logging KMS key"
  value       = local.kms_key_arns["logging"]
}

output "selected_vpc_id" {
  description = "ID of the existing VPC selected for this environment"
  value       = local.selected_vpc_id
}

output "selected_private_subnet_ids" {
  description = "IDs of the existing private subnets selected for this environment"
  value       = local.selected_private_subnet_ids
}

output "kms_opensearch_key_arn" {
  description = "ARN of OpenSearch KMS key"
  value       = local.kms_key_arns["opensearch"]
}

output "s3_log_archive_arn" {
  description = "ARN of log archive S3 bucket"
  value       = local.selected_log_archive_bucket_arn
}

output "s3_log_archive_name" {
  description = "Name of log archive S3 bucket"
  value       = local.selected_log_archive_bucket_name
}


output "opensearch_domain_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = try(module.opensearch[0].domain_endpoint, null)
  sensitive   = true
}

output "opensearch_vpc_endpoint" {
  description = "OpenSearch VPC endpoint hostname"
  value       = try(module.opensearch[0].domain_endpoint, null)
  sensitive   = true
}

output "opensearch_dashboards_vpc_endpoint" {
  description = "OpenSearch Dashboards VPC endpoint URL"
  value       = try(module.opensearch[0].kibana_endpoint, null)
  sensitive   = true
}

output "opensearch_domain_arn" {
  description = "OpenSearch domain ARN"
  value       = try(module.opensearch[0].domain_arn, null)
  sensitive   = true
}

output "opensearch_security_group_id" {
  description = "Security group ID for OpenSearch"
  value       = local.selected_opensearch_security_group
}

output "opensearch_log_group" {
  description = "CloudWatch log group for OpenSearch audit logs"
  value       = var.opensearch_enable_log_publishing ? local.opensearch_audit_log_group_name : null
}

output "firehose_transformer_function_name" {
  description = "Firehose Lambda transformer function name"
  value       = module.firehose_transformer.function_name
}

output "firehose_transformer_function_arn" {
  description = "Firehose Lambda transformer function ARN"
  value       = module.firehose_transformer.function_arn
}

output "firehose_transformer_role_arn" {
  description = "Firehose Lambda transformer IAM role ARN"
  value       = module.firehose_transformer.function_role_arn
}

output "firehose_transformer_log_group_name" {
  description = "Firehose Lambda transformer CloudWatch log group name"
  value       = module.firehose_transformer.log_group_name
}

output "firehose_stream_arn" {
  description = "Firehose delivery stream ARN"
  value       = try(module.firehose_stream[0].stream_arn, null)
}

output "firehose_stream_name" {
  description = "Firehose delivery stream name"
  value       = try(module.firehose_stream[0].stream_name, null)
}

output "firehose_stream_role_arn" {
  description = "Firehose delivery stream IAM role ARN"
  value       = try(module.firehose_stream[0].role_arn, null)
}

output "firehose_stream_log_group_name" {
  description = "CloudWatch log group for Firehose delivery logs"
  value       = try(module.firehose_stream[0].log_group_name, null)
}

output "firehose_stream_s3_backup_log_group_name" {
  description = "CloudWatch log group for S3 backup failure logs"
  value       = try(module.firehose_stream[0].s3_backup_log_group_name, null)
}

output "s3_firehose_backup_arn" {
  description = "ARN of S3 bucket for Firehose backup"
  value       = local.selected_firehose_backup_bucket_arn
}

output "s3_firehose_backup_name" {
  description = "Name of S3 bucket for Firehose backup"
  value       = local.selected_firehose_backup_bucket_name
}

output "dashboard_bastion_instance_id" {
  description = "EC2 instance ID for OpenSearch Dashboards proxy access"
  value       = try(module.dashboard_bastion[0].instance_id, null)
}

output "dashboard_bastion_public_ip" {
  description = "Public IP for SSH access to the OpenSearch Dashboards bastion"
  value       = try(module.dashboard_bastion[0].instance_public_ip, null)
}

output "dashboard_bastion_public_dns" {
  description = "Public DNS name for SSH access to the OpenSearch Dashboards bastion"
  value       = try(module.dashboard_bastion[0].instance_public_dns, null)
}

output "dashboard_bastion_security_group_id" {
  description = "Security group ID attached to the OpenSearch Dashboards bastion"
  value       = try(module.dashboard_bastion[0].security_group_id, null)
}

output "siem_event_index_name" {
  description = "Primary OpenSearch index prefix used by Firehose for SIEM events"
  value       = "siem-events"
}

output "siem_alert_topic_arn" {
  description = "SNS topic ARN for detection alerts"
  value       = try(aws_sns_topic.siem_alerts[0].arn, null)
}

output "siem_incident_queue_url" {
  description = "SQS queue URL for incident workflow events"
  value       = try(aws_sqs_queue.siem_incidents[0].url, null)
}

output "soc_operations_dashboard_name" {
  description = "CloudWatch dashboard name for SOC operations monitoring"
  value       = try(aws_cloudwatch_dashboard.soc_operations[0].dashboard_name, null)
}

output "guardduty_findings_log_group_name" {
  description = "CloudWatch log group used to ingest GuardDuty findings"
  value       = try(aws_cloudwatch_log_group.guardduty_findings[0].name, null)
}

output "securityhub_findings_log_group_name" {
  description = "CloudWatch log group used to ingest Security Hub findings"
  value       = try(aws_cloudwatch_log_group.securityhub_findings[0].name, null)
}

output "vpc_flow_logs_log_group_name" {
  description = "CloudWatch log group used to ingest VPC Flow Logs"
  value       = try(aws_cloudwatch_log_group.vpc_flow_logs[0].name, null)
}

output "soc_analyst_role_arn" {
  description = "Least-privilege SOC analyst role ARN"
  value       = try(aws_iam_role.soc_analyst[0].arn, null)
}

output "incident_responder_role_arn" {
  description = "Least-privilege incident responder role ARN"
  value       = try(aws_iam_role.incident_responder[0].arn, null)
}

output "siem_admin_role_arn" {
  description = "Least-privilege SIEM admin role ARN"
  value       = try(aws_iam_role.siem_admin[0].arn, null)
}
