resource "aws_db_instance" "gitlab" {
  identifier = "${var.project_name}-${var.environment}-pg"

  engine                      = "postgres"
  engine_version              = "16"
  major_engine_version        = "16"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  storage_encrypted           = true
  kms_key_id                  = local.kms_key_id
  storage_type                = "gp3"
  iops                        = 12000
  backup_retention_period     = var.backup_retention_days
  backup_window               = "03:00-04:00"
  maintenance_window          = "sun:05:00-sun:06:00"
  copy_tags_to_snapshot       = true
  delete_automated_backups    = false
  skip_final_snapshot         = false
  final_snapshot_identifier   = "${var.project_name}-${var.environment}-pg-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  auto_minor_version_upgrade  = true
  multi_az                    = var.db_multi_az
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  parameter_group_name        = aws_db_parameter_group.gitlab.name
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 15
  monitoring_role_arn                   = aws_iam_role.rds_enhanced_monitoring.arn

  db_name  = "gitlabhq_production"
  username = "gitlab"
  password = random_password.rds_master.result

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
    ]
  }

  tags = var.tags
}

resource "aws_db_parameter_group" "gitlab" {
  name   = "${var.project_name}-${var.environment}-pg-params"
  family = "postgres16"

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements,pg_buffercache,pg_trgm,btree_gist"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name         = "max_worker_processes"
    value        = "32"
  }

  parameter {
    name         = "max_parallel_workers"
    value        = "16"
  }

  parameter {
    name         = "max_parallel_workers_per_gather"
    value        = "8"
  }

  parameter {
    name         = "random_page_cost"
    value        = "1.1"
    apply_method = "immediate"
  }

  parameter {
    name         = "effective_cache_size"
    value        = "{DBInstanceClassMemory*3/4}"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "work_mem"
    value        = "65536"
    apply_method = "immediate"
  }

  parameter {
    name         = "maintenance_work_mem"
    value        = "2097152"
    apply_method = "immediate"
  }

  tags = var.tags
}

resource "random_password" "rds_master" {
  length           = 32
  special          = false
}

resource "aws_secretsmanager_secret" "rds" {
  name = "${var.project_name}-${var.environment}-rds-credentials"
  kms_key_id = local.kms_key_id

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "rds" {
  secret_id = aws_secretsmanager_secret.rds.id
  secret_string = jsonencode({
    username = aws_db_instance.gitlab.username
    password = random_password.rds_master.result
    host     = aws_db_instance.gitlab.address
    port     = aws_db_instance.gitlab.port
    dbname   = aws_db_instance.gitlab.db_name
  })
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]

  tags = var.tags
}
