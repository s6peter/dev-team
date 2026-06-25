variable "aws_region" {
  description = "AWS region for the backend resources."
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform state."
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name for Terraform state locking."
  type        = string
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default = {
    Project     = "boa-gitlab-software-factory-poc"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}

