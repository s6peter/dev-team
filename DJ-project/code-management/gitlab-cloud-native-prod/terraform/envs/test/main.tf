data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  gitlab_buckets = toset([
    "artifacts",
    "lfs",
    "uploads",
    "packages",
    "external-diffs",
    "terraform-state",
    "dependency-proxy",
    "registry",
    "backups"
  ])
}

resource "aws_kms_key" "gitlab" {
  count                   = var.create_vpc || var.create_s3_buckets || var.create_rds || var.create_redis ? 1 : 0
  description             = "KMS key for ${local.name} GitLab cloud-native platform"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "gitlab" {
  count         = length(aws_kms_key.gitlab)
  name          = "alias/${local.name}-gitlab"
  target_key_id = aws_kms_key.gitlab[0].key_id
}

module "vpc" {
  count   = var.create_vpc ? 1 : 0
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.17"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs              = local.azs
  public_subnets   = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 10)]
  database_subnets = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 20)]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "test"
  one_nat_gateway_per_az = var.environment != "test"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  create_database_subnet_group = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

module "eks" {
  count   = var.create_eks ? 1 : 0
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.31"

  cluster_name    = local.name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc[0].vpc_id
  subnet_ids = module.vpc[0].private_subnets

  enable_irsa                              = true
  cluster_endpoint_public_access           = true
  cluster_endpoint_public_access_cidrs     = length(var.admin_cidrs) > 0 ? var.admin_cidrs : ["0.0.0.0/0"]
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
    eks-pod-identity-agent = {
      most_recent = true
    }
  }

  eks_managed_node_groups = {
    gitlab_app = {
      name           = "${local.name}-gitlab-app"
      instance_types = var.node_instance_types
      min_size       = var.gitlab_app_min_size
      desired_size   = var.gitlab_app_desired_size
      max_size       = var.gitlab_app_max_size

      labels = {
        workload = "gitlab-app"
      }
    }

    gitlab_runner = {
      name           = "${local.name}-runner"
      instance_types = var.node_instance_types
      min_size       = var.runner_min_size
      desired_size   = var.runner_desired_size
      max_size       = var.runner_max_size

      labels = {
        workload = "gitlab-runner"
      }

      taints = {
        runner = {
          key    = "workload"
          value  = "gitlab-runner"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }
}

resource "aws_security_group" "rds" {
  count       = var.create_rds ? 1 : 0
  name        = "${local.name}-rds"
  description = "Allow PostgreSQL from EKS nodes"
  vpc_id      = module.vpc[0].vpc_id
}

resource "aws_security_group_rule" "rds_from_eks" {
  count                    = var.create_rds && var.create_eks ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds[0].id
  source_security_group_id = module.eks[0].node_security_group_id
}

resource "random_password" "postgres" {
  count   = var.create_rds ? 1 : 0
  length  = 32
  special = true
}

module "rds" {
  count   = var.create_rds ? 1 : 0
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.10"

  identifier = "${local.name}-postgres"

  engine               = "postgres"
  engine_version       = "16"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 5
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.gitlab[0].arn

  db_name  = "gitlabhq_production"
  username = "gitlab"
  password = random_password.postgres[0].result
  port     = 5432

  multi_az               = var.db_multi_az
  subnet_ids             = module.vpc[0].database_subnets
  vpc_security_group_ids = [aws_security_group.rds[0].id]

  backup_retention_period = var.environment == "prod" ? 30 : 7
  deletion_protection     = var.environment == "prod"
  skip_final_snapshot     = var.environment != "prod"
}

resource "aws_security_group" "redis" {
  count       = var.create_redis ? 1 : 0
  name        = "${local.name}-redis"
  description = "Allow Redis from EKS nodes"
  vpc_id      = module.vpc[0].vpc_id
}

resource "aws_security_group_rule" "redis_from_eks" {
  count                    = var.create_redis && var.create_eks ? 1 : 0
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis[0].id
  source_security_group_id = module.eks[0].node_security_group_id
}

resource "aws_elasticache_subnet_group" "redis" {
  count      = var.create_redis ? 1 : 0
  name       = "${local.name}-redis"
  subnet_ids = module.vpc[0].database_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  count                      = var.create_redis ? 1 : 0
  replication_group_id       = "${local.name}-redis"
  description                = "Redis for GitLab ${local.name}"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.redis_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.redis[0].name
  security_group_ids         = [aws_security_group.redis[0].id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = var.redis_replicas_per_node_group > 0
  num_node_groups            = 1
  replicas_per_node_group    = var.redis_replicas_per_node_group
}

resource "aws_s3_bucket" "gitlab" {
  for_each = var.create_s3_buckets ? local.gitlab_buckets : []
  bucket   = "${local.name}-${each.key}-${data.aws_caller_identity.current.account_id}"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_public_access_block" "gitlab" {
  for_each = aws_s3_bucket.gitlab
  bucket   = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gitlab" {
  for_each = aws_s3_bucket.gitlab
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.gitlab[0].arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "gitlab" {
  for_each = aws_s3_bucket.gitlab
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_wafv2_web_acl" "gitlab" {
  count       = var.create_waf ? 1 : 0
  name        = "${local.name}-gitlab"
  description = "Baseline WAF for GitLab ALB"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-common"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-gitlab-waf"
    sampled_requests_enabled   = true
  }
}
