resource "aws_elasticache_replication_group" "gitlab" {
  replication_group_id          = "${var.project_name}-${var.environment}-redis"
  description                   = "GitLab Redis - persistent cache and shared state"
  node_type                     = var.redis_node_type
  num_cache_clusters            = length(local.azs)
  multi_az_enabled              = var.environment == "prod" ? true : false
  automatic_failover_enabled    = true

  engine             = "redis"
  engine_version     = "7.1"
  port               = 6379
  parameter_group_name = aws_elasticache_parameter_group.gitlab.name

  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  kms_key_id                 = local.kms_key_id
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  log_delivery_configuration {
    destination_type = "cloudwatch-logs"
    destination_arn  = aws_cloudwatch_log_group.redis.arn
    log_format       = "json"
  }

  tags = var.tags
}

resource "aws_elasticache_parameter_group" "gitlab" {
  name   = "${var.project_name}-${var.environment}-redis-params"
  family = "redis7"

  parameter {
    name  = "timeout"
    value = "60"
  }

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-redis"
  retention_in_days = var.backup_retention_days
  kms_key_id        = local.kms_key_id

  tags = var.tags
}
