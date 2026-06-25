locals {
  create_kms = var.kms_key_arn == "" ? 1 : 0
}

resource "aws_kms_key" "main" {
  count                   = local.create_kms
  description             = "${var.project_name}-${var.environment} encryption key"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = var.tags
}

resource "aws_kms_alias" "main" {
  count         = local.create_kms
  name          = "alias/${var.project_name}-${var.environment}"
  target_key_id = aws_kms_key.main[0].key_id
}

locals {
  kms_key_id = var.kms_key_arn != "" ? var.kms_key_arn : aws_kms_key.main[0].arn
}

# Security group: ALB
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "ALB security group"
  vpc_id      = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS from internet"
}

resource "aws_vpc_security_group_ingress_rule" "alb_http_redirect" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP redirect to HTTPS"
}

resource "aws_vpc_security_group_ingress_rule" "alb_ssh" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = var.gitlab_ssh_port
  to_port           = var.gitlab_ssh_port
  ip_protocol       = "tcp"
  description       = "GitLab SSH"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "All outbound"
}

# Security group: GitLab EC2
resource "aws_security_group" "gitlab" {
  name        = "${var.project_name}-${var.environment}-gitlab-sg"
  description = "GitLab EC2 security group"
  vpc_id      = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-gitlab-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "gitlab_from_alb" {
  security_group_id            = aws_security_group.gitlab.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 80
  to_port                      = 443
  ip_protocol                  = "tcp"
  description                  = "Traffic from ALB"
}

resource "aws_vpc_security_group_ingress_rule" "gitlab_ssh_from_alb" {
  security_group_id            = aws_security_group.gitlab.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = var.gitlab_ssh_port
  to_port                      = var.gitlab_ssh_port
  ip_protocol                  = "tcp"
  description                  = "SSH from ALB"
}

resource "aws_vpc_security_group_ingress_rule" "gitlab_internal_ssh" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.vpc_cidr
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  description       = "Internal SSH access"
}

resource "aws_vpc_security_group_ingress_rule" "gitlab_gitaly" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.vpc_cidr
  from_port         = 8075
  to_port           = 8075
  ip_protocol       = "tcp"
  description       = "Gitaly internal traffic"
}

resource "aws_vpc_security_group_egress_rule" "gitlab_all" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "All outbound"
}

# Security group: RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "RDS security group"
  vpc_id      = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_gitlab" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.gitlab.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "rds_all" {
  security_group_id = aws_security_group.rds.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# Security group: ElastiCache
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "ElastiCache Redis security group"
  vpc_id      = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "redis_from_gitlab" {
  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = aws_security_group.gitlab.id
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "redis_all" {
  security_group_id = aws_security_group.redis.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
