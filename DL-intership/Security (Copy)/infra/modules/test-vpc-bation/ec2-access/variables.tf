variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
}

variable "vpc_id" {
  description = "Existing VPC ID where the EC2 instance will be created"
  type        = string
}

variable "public_subnet_id" {
  description = "Existing public subnet ID for the EC2 instance"
  type        = string
}

variable "vpc_cidr_block" {
  description = "CIDR block for the target VPC"
  type        = string
}

variable "key_pair_name" {
  description = "Existing AWS EC2 key pair name. If your private key file is siem-key.pem, this is usually siem-key."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH to the instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB"
  type        = number
  default     = 20
}
