variable "aws_region" {
  description = "AWS region for the GitLab cloud-native platform."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for resources."
  type        = string
  default     = "gitlab-cloud-native"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "test"
}

variable "create_vpc" {
  description = "Create VPC networking. Keep false for no-cost validation plans."
  type        = bool
  default     = false
}

variable "create_eks" {
  description = "Create the EKS cluster. This incurs AWS cost."
  type        = bool
  default     = false
}

variable "create_rds" {
  description = "Create external RDS PostgreSQL. This incurs AWS cost."
  type        = bool
  default     = false
}

variable "create_redis" {
  description = "Create external ElastiCache Redis. This incurs AWS cost."
  type        = bool
  default     = false
}

variable "create_s3_buckets" {
  description = "Create S3 object storage buckets for GitLab. Low cost but still billable."
  type        = bool
  default     = false
}

variable "create_waf" {
  description = "Create AWS WAF Web ACL for ALB protection. This incurs AWS cost."
  type        = bool
  default     = false
}

variable "vpc_cidr" {
  description = "VPC CIDR."
  type        = string
  default     = "10.70.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use. Production should use 3; test can use 2."
  type        = number
  default     = 2
}

variable "cluster_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.31"
}

variable "gitlab_domain" {
  description = "Base domain for GitLab, for example gitlab.example.com."
  type        = string
  default     = "gitlab.example.com"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID. Leave blank for manual DNS or if not creating DNS records."
  type        = string
  default     = ""
}

variable "node_instance_types" {
  description = "Default EKS managed node group instance types."
  type        = list(string)
  default     = ["t3.large"]
}

variable "gitlab_app_min_size" {
  description = "Minimum GitLab app node count. Use 0 for cost-controlled testing; production should be at least 2."
  type        = number
  default     = 0
}

variable "gitlab_app_desired_size" {
  description = "Desired GitLab app node count. Use 0 for cost-controlled testing; production should be at least 2."
  type        = number
  default     = 0
}

variable "gitlab_app_max_size" {
  description = "Maximum GitLab app node count."
  type        = number
  default     = 2
}

variable "runner_min_size" {
  description = "Minimum runner node count. Use 0 so runners scale down when idle."
  type        = number
  default     = 0
}

variable "runner_desired_size" {
  description = "Desired runner node count. Use 0 for testing."
  type        = number
  default     = 0
}

variable "runner_max_size" {
  description = "Maximum runner node count."
  type        = number
  default     = 3
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class. Use db.t4g.micro for test; production requires larger sizing."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Enable RDS Multi-AZ. Use false for testing; true for production HA."
  type        = bool
  default     = false
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type. Use cache.t4g.micro for test; production requires larger sizing."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_replicas_per_node_group" {
  description = "Redis replicas per node group. Use 0 for testing; production should use at least 1."
  type        = number
  default     = 0
}

variable "admin_cidrs" {
  description = "CIDRs allowed for administrative access to GitLab/Keycloak/Grafana if used by security groups."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags."
  type        = map(string)
  default     = {}
}
