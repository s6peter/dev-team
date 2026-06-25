resource "aws_lb" "gitlab" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod" ? true : false
  idle_timeout               = 360
  ip_address_type            = "ipv4"

  access_logs {
    bucket  = aws_s3_bucket.gitlab_storage.id
    prefix  = "alb-logs"
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb"
  })
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.gitlab.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.gitlab.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gitlab_https.arn
  }
}

resource "aws_lb_listener" "ssh" {
  load_balancer_arn = aws_lb.gitlab.arn
  port              = var.gitlab_ssh_port
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gitlab_ssh.arn
  }
}

resource "aws_lb_target_group" "gitlab_https" {
  name     = "${var.project_name}-${var.environment}-tg-https"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/users/sign_in"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200-399"
  }

  stickiness {
    type    = "lb_cookie"
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-tg-https"
  })
}

resource "aws_lb_target_group" "gitlab_ssh" {
  name     = "${var.project_name}-${var.environment}-tg-ssh"
  port     = var.gitlab_ssh_port
  protocol = "TCP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    port                = var.gitlab_ssh_port
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-tg-ssh"
  })
}

# WAF association (production only)
resource "aws_wafv2_web_acl_association" "gitlab" {
  count        = var.environment == "prod" ? 1 : 0
  resource_arn = aws_lb.gitlab.arn
  web_acl_arn  = aws_wafv2_web_acl.gitlab[0].arn
}

resource "aws_wafv2_web_acl" "gitlab" {
  count       = var.environment == "prod" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-waf"
  description = "WAF for GitLab ALB"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 0

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateBasedRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 5000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateBasedRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}
