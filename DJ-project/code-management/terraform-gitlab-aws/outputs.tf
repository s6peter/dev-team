output "gitlab_url" {
  description = "GitLab instance URL"
  value       = "https://${var.gitlab_domain}"
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.gitlab.dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID"
  value       = aws_lb.gitlab.zone_id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.gitlab.address
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.gitlab.primary_endpoint_address
  sensitive   = true
}

output "s3_storage_bucket" {
  description = "S3 bucket name for GitLab object storage"
  value       = aws_s3_bucket.gitlab_storage.id
}

output "s3_tf_state_bucket" {
  description = "S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "dynamodb_tf_lock_table" {
  description = "DynamoDB table for Terraform state locking"
  value       = aws_dynamodb_table.terraform_state_lock.name
}

output "gitlab_asg_name" {
  description = "GitLab Auto Scaling Group name"
  value       = aws_autoscaling_group.gitlab.name
}

output "runner_asg_name" {
  description = "GitLab Runner Auto Scaling Group name"
  value       = aws_autoscaling_group.runner.name
}

output "secretsmanager_rds_arn" {
  description = "Secrets Manager ARN for RDS credentials"
  value       = aws_secretsmanager_secret.rds.arn
}

output "kms_key_arn" {
  description = "KMS key ARN used for encryption"
  value       = local.kms_key_id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "waf_acl_arn" {
  description = "WAF web ACL ARN (prod only)"
  value       = var.environment == "prod" ? aws_wafv2_web_acl.gitlab[0].arn : null
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.gitlab.dashboard_name
}
