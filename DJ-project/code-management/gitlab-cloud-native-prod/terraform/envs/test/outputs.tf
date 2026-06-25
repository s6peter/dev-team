output "cluster_name" {
  description = "EKS cluster name."
  value       = var.create_eks ? module.eks[0].cluster_name : null
}

output "configure_kubectl" {
  description = "Command to configure kubectl."
  value       = var.create_eks ? "aws eks update-kubeconfig --name ${module.eks[0].cluster_name} --region ${var.aws_region}" : null
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint for GitLab Helm values."
  value       = var.create_rds ? module.rds[0].db_instance_address : null
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint for GitLab Helm values."
  value       = var.create_redis ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : null
}

output "s3_buckets" {
  description = "S3 buckets for GitLab object storage."
  value       = { for k, v in aws_s3_bucket.gitlab : k => v.bucket }
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN for ALB association."
  value       = var.create_waf ? aws_wafv2_web_acl.gitlab[0].arn : null
}
