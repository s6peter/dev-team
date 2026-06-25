data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "bank-of-america-devsecops-poc"
  })
}

resource "random_password" "gitlab_root" {
  length           = 24
  special          = true
  override_special = "!#%&*()-_=+[]{}<>:?"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                      = "${local.name}-public-${count.index + 1}"
    "kubernetes.io/role/elb"                  = "1"
    "kubernetes.io/cluster/${local.name}-eks" = "shared"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_s3_bucket" "gitlab_backups" {
  bucket_prefix = "${local.name}-gitlab-backups-"

  tags = {
    Name = "${local.name}-gitlab-backups"
  }
}

resource "aws_s3_bucket_versioning" "gitlab_backups" {
  bucket = aws_s3_bucket.gitlab_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gitlab_backups" {
  bucket = aws_s3_bucket.gitlab_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "gitlab_backups" {
  bucket = aws_s3_bucket.gitlab_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "gitlab_backups" {
  bucket = aws_s3_bucket.gitlab_backups.id

  rule {
    id     = "expire-old-poc-backups"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 14
    }
  }
}

resource "aws_iam_role" "gitlab" {
  name = "${local.name}-gitlab-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.gitlab.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.gitlab.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "backups" {
  name = "${local.name}-backup-s3"
  role = aws_iam_role.gitlab.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.gitlab_backups.arn,
        "${aws_s3_bucket.gitlab_backups.arn}/*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "gitlab" {
  name = "${local.name}-gitlab-profile"
  role = aws_iam_role.gitlab.name
}

resource "aws_security_group" "gitlab" {
  name        = "${local.name}-gitlab-sg"
  description = "GitLab POC all-in-one host"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name}-gitlab-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "GitLab HTTP for POC"
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "GitLab HTTPS if a certificate/domain is later added"
}

resource "aws_vpc_security_group_ingress_rule" "git_ssh" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 2222
  to_port           = 2222
  ip_protocol       = "tcp"
  description       = "Git over SSH"
}

resource "aws_vpc_security_group_ingress_rule" "admin_ssh" {
  count             = var.ssh_public_key == "" ? 0 : 1
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  description       = "Administrative SSH"
}

resource "aws_vpc_security_group_ingress_rule" "sonarqube" {
  count             = var.enable_lab_services ? 1 : 0
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 9000
  to_port           = 9000
  ip_protocol       = "tcp"
  description       = "SonarQube UI"
}

resource "aws_vpc_security_group_ingress_rule" "artifactory" {
  count             = var.enable_lab_services ? 1 : 0
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 8082
  to_port           = 8082
  ip_protocol       = "tcp"
  description       = "Artifactory UI"
}

resource "aws_vpc_security_group_ingress_rule" "keycloak" {
  count             = var.enable_lab_services ? 1 : 0
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 8080
  to_port           = 8080
  ip_protocol       = "tcp"
  description       = "Keycloak SAML/SSO lab"
}

resource "aws_vpc_security_group_ingress_rule" "grafana" {
  count             = var.enable_lab_services ? 1 : 0
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = var.admin_cidr
  from_port         = 3000
  to_port           = 3000
  ip_protocol       = "tcp"
  description       = "Grafana UI"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.gitlab.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Outbound package, container image, and API access"
}

resource "aws_key_pair" "admin" {
  count      = var.ssh_public_key == "" ? 0 : 1
  key_name   = "${local.name}-admin"
  public_key = var.ssh_public_key
}

resource "aws_instance" "gitlab" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.gitlab_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.gitlab.id]
  iam_instance_profile        = aws_iam_instance_profile.gitlab.name
  associate_public_ip_address = true
  key_name                    = var.ssh_public_key == "" ? null : aws_key_pair.admin[0].key_name
  user_data_replace_on_change = true

  user_data = templatefile("${path.module}/user_data.sh", {
    gitlab_root_password = random_password.gitlab_root.result
    gitlab_external_url  = var.gitlab_external_url
    backup_bucket        = aws_s3_bucket.gitlab_backups.id
    aws_region           = var.aws_region
    enable_lab_services  = var.enable_lab_services
  })

  root_block_device {
    volume_size = var.gitlab_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  tags = {
    Name = "${local.name}-gitlab-all-in-one"
    Role = "gitlab-platform-poc"
  }
}

resource "aws_cloudwatch_log_group" "platform" {
  name              = "/${var.project_name}/${var.environment}/platform"
  retention_in_days = 14
}
