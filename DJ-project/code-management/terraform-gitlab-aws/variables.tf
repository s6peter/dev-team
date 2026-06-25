variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "gitlab-enterprise"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs per AZ"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs per AZ"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "database_subnet_cidrs" {
  description = "Database subnet CIDRs per AZ"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

variable "elasticache_subnet_cidrs" {
  description = "ElastiCache subnet CIDRs per AZ"
  type        = list(string)
  default     = ["10.0.30.0/24", "10.0.31.0/24", "10.0.32.0/24"]
}

variable "gitlab_instance_type" {
  description = "EC2 instance type for GitLab application node"
  type        = string
  default     = "m6i.4xlarge"
}

variable "gitlab_instance_count" {
  description = "Number of GitLab application nodes (minimum 2 for HA)"
  type        = number
  default     = 2
}

variable "gitlab_domain" {
  description = "Domain name for GitLab (e.g. gitlab.example.com)"
  type        = string
}

variable "gitlab_hosted_zone_id" {
  description = "Route53 hosted zone ID for the GitLab domain"
  type        = string
  default     = ""
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 500
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "allowed_ingress_cidrs" {
  description = "CIDRs allowed to access GitLab HTTPS"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    Project     = "code-management-platform"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}

variable "kms_key_arn" {
  description = "Existing KMS key ARN for encryption. If empty, creates a new key."
  type        = string
  default     = ""
}

variable "ssl_certificate_arn" {
  description = "ACM SSL certificate ARN for the ALB"
  type        = string
}

variable "gitlab_ssh_port" {
  description = "GitLab SSH port"
  type        = number
  default     = 2222
}

variable "gitlab_trusted_ips" {
  description = "Trusted IPs for GitLab web console access"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

variable "runner_instance_type" {
  description = "EC2 instance type for GitLab runners"
  type        = string
  default     = "c6i.2xlarge"
}

variable "runner_min_count" {
  description = "Minimum number of runner instances"
  type        = number
  default     = 2
}

variable "runner_max_count" {
  description = "Maximum number of runner instances"
  type        = number
  default     = 20
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}
