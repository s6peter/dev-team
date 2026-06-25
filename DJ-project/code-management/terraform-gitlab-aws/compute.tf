data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

resource "aws_iam_instance_profile" "gitlab" {
  name = "${var.project_name}-${var.environment}-gitlab-profile"
  role = aws_iam_role.gitlab.name
}

resource "aws_iam_role" "gitlab" {
  name = "${var.project_name}-${var.environment}-gitlab-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = [
    aws_iam_policy.gitlab_s3.arn,
    "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ]

  tags = var.tags
}

resource "aws_iam_role_policy" "gitlab_registry" {
  name = "gitlab-registry"
  role = aws_iam_role.gitlab.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_launch_template" "gitlab" {
  name_prefix   = "${var.project_name}-${var.environment}-gitlab-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.gitlab_instance_type
  user_data     = base64encode(templatefile("${path.module}/user_data.sh", {
    gitlab_domain          = var.gitlab_domain
    gitlab_ssh_port        = var.gitlab_ssh_port
    rds_endpoint           = aws_db_instance.gitlab.address
    rds_password           = random_password.rds_master.result
    rds_username           = aws_db_instance.gitlab.username
    rds_database           = aws_db_instance.gitlab.db_name
    redis_endpoint         = aws_elasticache_replication_group.gitlab.primary_endpoint_address
    s3_storage_bucket      = aws_s3_bucket.gitlab_storage.id
    aws_region             = var.aws_region
    project_name           = var.project_name
    environment            = var.environment
    gitlab_trusted_ips_joined = join(" ", var.gitlab_trusted_ips)
  }))

  iam_instance_profile {
    arn = aws_iam_instance_profile.gitlab.arn
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 250
      delete_on_termination = true
      encrypted             = true
      kms_key_id            = local.kms_key_id
    }
  }

  block_device_mappings {
    device_name = "/dev/xvdf"

    ebs {
      volume_size           = 200
      volume_type           = "gp3"
      iops                  = 6000
      throughput            = 500
      delete_on_termination = true
      encrypted             = true
      kms_key_id            = local.kms_key_id
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring {
    enabled = true
  }

  network_interfaces {
    associate_public_ip_address = false
    delete_on_termination       = true
    security_groups             = [aws_security_group.gitlab.id]
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.project_name}-${var.environment}-gitlab"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "gitlab" {
  name                = "${var.project_name}-${var.environment}-gitlab-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = var.gitlab_instance_count
  max_size            = var.gitlab_instance_count + 2
  desired_capacity    = var.gitlab_instance_count
  target_group_arns   = [aws_lb_target_group.gitlab_https.arn, aws_lb_target_group.gitlab_ssh.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 600

  launch_template {
    id      = aws_launch_template.gitlab.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
    }
  }

  tag {
    key                 = "Name"
    value              = "${var.project_name}-${var.environment}-gitlab"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# GitLab Runner Auto-Scaling Group
resource "aws_iam_instance_profile" "runner" {
  name = "${var.project_name}-${var.environment}-runner-profile"
  role = aws_iam_role.runner.name
}

resource "aws_iam_role" "runner" {
  name = "${var.project_name}-${var.environment}-runner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ]

  tags = var.tags
}

resource "aws_launch_template" "runner" {
  name_prefix   = "${var.project_name}-${var.environment}-runner-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.runner_instance_type
  user_data     = base64encode("# GitLab Runner user data - configure via Ansible in production")

  iam_instance_profile {
    arn = aws_iam_instance_profile.runner.arn
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring {
    enabled = true
  }

  network_interfaces {
    associate_public_ip_address = false
    delete_on_termination       = true
    security_groups             = [aws_security_group.gitlab.id]
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.project_name}-${var.environment}-runner"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "runner" {
  name                = "${var.project_name}-${var.environment}-runner-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = var.runner_min_count
  max_size            = var.runner_max_count
  desired_capacity    = var.runner_min_count
  health_check_type   = "EC2"

  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value              = "${var.project_name}-${var.environment}-runner"
    propagate_at_launch = true
  }
}

# CPU-based scaling for runners
resource "aws_autoscaling_policy" "runner_cpu" {
  name                   = "${var.project_name}-${var.environment}-runner-cpu-policy"
  autoscaling_group_name = aws_autoscaling_group.runner.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# CloudWatch dashboard
resource "aws_cloudwatch_dashboard" "gitlab" {
  dashboard_name = "${var.project_name}-${var.environment}-gitlab"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "p99" }],
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ALB Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { label = "Connections" }],
            ["AWS/RDS", "CPUUtilization", { label = "CPU %" }],
            ["AWS/RDS", "FreeableMemory", { label = "Freeable Memory" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { label = "Redis CPU" }],
            ["AWS/ElastiCache", "CacheHits", { label = "Hits" }],
            ["AWS/ElastiCache", "CacheMisses", { label = "Misses" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ElastiCache Metrics"
        }
      },
    ]
  })
}

# Backup automation via EventBridge
resource "aws_events_rule" "gitlab_backup" {
  name                = "${var.project_name}-${var.environment}-gitlab-backup"
  description         = "Trigger GitLab backup on schedule"
  schedule_expression = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC

  tags = var.tags
}

resource "aws_events_target" "gitlab_backup" {
  rule      = aws_events_rule.gitlab_backup.name
  arn       = aws_sfn_state_machine.gitlab_backup.arn
  role_arn  = aws_iam_role.eventbridge_sfn.arn
}

resource "aws_iam_role" "eventbridge_sfn" {
  name = "${var.project_name}-${var.environment}-eventbridge-sfn"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "eventbridge_sfn" {
  name = "invoke-sfn"
  role = aws_iam_role.eventbridge_sfn.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action   = "states:StartExecution"
        Resource = aws_sfn_state_machine.gitlab_backup.arn
      }
    ]
  })
}

# Placeholder Step Function for backup orchestration
resource "aws_sfn_state_machine" "gitlab_backup" {
  name     = "${var.project_name}-${var.environment}-gitlab-backup"
  role_arn = aws_iam_role.sfn_backup.arn
  type     = "STANDARD"

  definition = jsonencode({
    Comment = "GitLab Backup Orchestrator",
    StartAt = "SelectInstance",
    States = {
      SelectInstance = {
        Type = "Pass",
        Result = aws_autoscaling_group.gitlab.name,
        ResultPath = "$.asg_name",
        Next = "RunSSMBackupCommand"
      },
      RunSSMBackupCommand = {
        Type         = "Task",
        Resource     = "arn:aws:states:::aws:runCommand",
        Parameters = {
          DocumentName = "AWS-RunShellScript",
          Targets = [
            {
              Key    = "tag:aws:autoscaling:groupName",
              Values = [aws_autoscaling_group.gitlab.name]
            }
          ],
          Parameters = {
            "commands" : ["sudo gitlab-backup create STRATEGY=copy"]
          }
        },
        End = true
      }
    }
  })

  tags = var.tags
}

resource "aws_iam_role" "sfn_backup" {
  name = "${var.project_name}-${var.environment}-sfn-backup"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "sfn_backup" {
  name = "sfn-backup-permissions"
  role = aws_iam_role.sfn_backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:ListCommands",
          "ssm:ListCommandInvocations",
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "gitlab_app" {
  name              = "/${var.project_name}/${var.environment}/gitlab"
  retention_in_days = var.backup_retention_days
  kms_key_id        = local.kms_key_id

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "gitlab_audit" {
  name              = "/${var.project_name}/${var.environment}/gitlab-audit"
  retention_in_days = var.backup_retention_days * 2
  kms_key_id        = local.kms_key_id

  tags = var.tags
}
