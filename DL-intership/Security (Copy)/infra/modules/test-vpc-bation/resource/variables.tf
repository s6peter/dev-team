variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
}

variable "vpc_cidr_block" {
  description = "CIDR block for the VPC created by this stack."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use for the VPC subnets."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnets" {
  description = "Public subnets to create in the VPC."
  type = list(object({
    cidr_block = string
    az         = string
  }))
  default = [
    { cidr_block = "10.0.1.0/24", az = "us-east-1a" },
    { cidr_block = "10.0.2.0/24", az = "us-east-1b" },
  ]
}

variable "private_subnets" {
  description = "Private subnets to create in the VPC."
  type = list(object({
    cidr_block = string
    az         = string
  }))
  default = [
    { cidr_block = "10.0.11.0/24", az = "us-east-1a" },
    { cidr_block = "10.0.12.0/24", az = "us-east-1b" },
  ]
}

variable "enable_nat_gateway" {
  description = "Whether to create NAT gateways for private subnet egress."
  type        = bool
  default     = true
}

variable "enable_dns_hostnames" {
  description = "Whether to enable DNS hostnames in the VPC."
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Whether to enable DNS support in the VPC."
  type        = bool
  default     = true
}

variable "key_pair_name" {
  description = "Existing EC2 key pair name to attach to the bastion instance."
  type        = string
  default     = "siem-key"
}

variable "instance_type" {
  description = "EC2 instance type for the bastion host."
  type        = string
  default     = "t3.micro"
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into the bastion instance."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "root_volume_size" {
  description = "Root EBS volume size for the bastion host."
  type        = number
  default     = 20
}

variable "bastion_public_subnet_index" {
  description = "Index of the VPC public subnet list to use for the bastion host."
  type        = number
  default     = 0
}
