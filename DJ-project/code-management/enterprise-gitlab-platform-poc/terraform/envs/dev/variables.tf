variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for AWS resources."
  type        = string
  default     = "boa-gitlab-poc"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "POC VPC CIDR."
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Two public subnets. EKS needs at least two subnets when enabled."
  type        = list(string)
  default     = ["10.42.1.0/24", "10.42.2.0/24"]
}

variable "admin_cidr" {
  description = "Your trusted public IP/CIDR for SSH and admin web UIs. Use x.x.x.x/32."
  type        = string
}

variable "gitlab_instance_type" {
  description = "All-in-one EC2 size. t3.xlarge is the practical minimum for GitLab + SonarQube + Artifactory lab services."
  type        = string
  default     = "t3.xlarge"
}

variable "gitlab_volume_size" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 120
}

variable "ssh_public_key" {
  description = "Optional SSH public key material. Leave blank to use SSM Session Manager instead of SSH."
  type        = string
  default     = ""
}

variable "gitlab_external_url" {
  description = "Optional GitLab external URL. Leave blank to use the EC2 public DNS over HTTP."
  type        = string
  default     = ""
}

variable "enable_lab_services" {
  description = "Run SonarQube, Artifactory OSS, Keycloak, Prometheus, and Grafana on the same EC2 host."
  type        = bool
  default     = true
}

variable "enable_eks" {
  description = "Optional EKS cluster for Kubernetes executor runners and GitOps demo. Keep false for the cheapest base POC."
  type        = bool
  default     = false
}

variable "eks_node_instance_type" {
  description = "Managed node group instance type for optional EKS."
  type        = string
  default     = "t3.small"
}

variable "tags" {
  description = "Additional tags."
  type        = map(string)
  default     = {}
}

