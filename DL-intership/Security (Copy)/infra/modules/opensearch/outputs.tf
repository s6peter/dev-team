output "domain_arn" {
  description = "OpenSearch domain ARN"
  value       = var.opensearch.existing_domain_name != null ? data.aws_opensearch_domain.existing[0].arn : aws_opensearch_domain.this[0].arn
}

output "domain_endpoint" {
  description = "OpenSearch domain endpoint (HTTPS)"
  value       = var.opensearch.existing_domain_name != null ? data.aws_opensearch_domain.existing[0].endpoint : aws_opensearch_domain.this[0].endpoint
}

output "domain_id" {
  description = "OpenSearch domain ID"
  value       = var.opensearch.existing_domain_name != null ? data.aws_opensearch_domain.existing[0].domain_id : aws_opensearch_domain.this[0].domain_id
}

output "domain_name" {
  description = "OpenSearch domain name"
  value       = var.opensearch.existing_domain_name != null ? data.aws_opensearch_domain.existing[0].domain_name : aws_opensearch_domain.this[0].domain_name
}

output "kibana_endpoint" {
  description = "OpenSearch Kibana endpoint"
  value       = "${var.opensearch.existing_domain_name != null ? data.aws_opensearch_domain.existing[0].endpoint : aws_opensearch_domain.this[0].endpoint}/_dashboards/"
}
