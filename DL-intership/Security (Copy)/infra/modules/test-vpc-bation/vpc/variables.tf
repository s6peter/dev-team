variable "vpc" {
  type = object({
    name_prefix        = string
    aws_region         = string
    cidr_block         = string
    availability_zones = list(string)

    public_subnets = optional(list(object({
      cidr_block = string
      az         = string
    })), [])

    private_subnets = optional(list(object({
      cidr_block = string
      az         = string
    })), [])

    enable_nat_gateway   = optional(bool, true)
    enable_dns_hostnames = optional(bool, true)
    enable_dns_support   = optional(bool, true)

    tags = optional(map(string), {})
  })

  description = <<-EOT
    VPC network configuration with multi-AZ support and NAT gateway integration.

    Creates a VPC with public and private subnets across multiple availability zones,
    configured with DNS support and NAT gateways for secure internet access from
    private subnets.

    REQUIRED ATTRIBUTES:
    - name_prefix: VPC name prefix, typically environment name (e.g., "dev", "prod").
    - aws_region: AWS region for VPC (e.g., "us-east-1").
    - cidr_block: VPC CIDR block (e.g., "10.0.0.0/16").
    - availability_zones: List of AZ names for subnet distribution (e.g., ["us-east-1a", "us-east-1b"]).

    OPTIONAL ATTRIBUTES:
    - public_subnets: List of public subnet configurations (default: []).
      - cidr_block: Subnet CIDR block (e.g., "10.0.1.0/24").
      - az: Availability zone for subnet.
    - private_subnets: List of private subnet configurations (default: []).
      - cidr_block: Subnet CIDR block (e.g., "10.0.10.0/24").
      - az: Availability zone for subnet.
    - enable_nat_gateway: Create NAT gateways for private subnet internet access (default: true).
    - enable_dns_hostnames: Enable DNS hostnames in VPC (default: true).
    - enable_dns_support: Enable DNS support in VPC (default: true).
    - tags: Map of resource tags (default: {}).

    RESOURCES CREATED:
    - AWS::EC2::VPC
    - AWS::EC2::Subnet (public and private)
    - AWS::EC2::InternetGateway
    - AWS::EC2::NatGateway
    - AWS::EC2::ElasticIP
    - AWS::EC2::RouteTable
    - AWS::EC2::Route

    EXAMPLES:
    ```hcl
    public_subnets = [
      { cidr_block = "10.0.1.0/24", az = "us-east-1a" },
      { cidr_block = "10.0.2.0/24", az = "us-east-1b" }
    ]
    private_subnets = [
      { cidr_block = "10.0.10.0/24", az = "us-east-1a" },
      { cidr_block = "10.0.11.0/24", az = "us-east-1b" }
    ]
    ```
  EOT

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.vpc.aws_region))
    error_message = "aws_region must be a valid AWS region format (e.g., us-east-1, eu-west-1)."
  }

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.vpc.name_prefix)) && length(var.vpc.name_prefix) >= 2 && length(var.vpc.name_prefix) <= 30
    error_message = "name_prefix must be lowercase alphanumeric with hyphens, between 2 and 30 characters."
  }

  validation {
    condition     = can(cidrhost(var.vpc.cidr_block, 0))
    error_message = "cidr_block must be a valid CIDR notation (e.g., 10.0.0.0/16)."
  }

  validation {
    condition     = length(var.vpc.availability_zones) >= 1
    error_message = "availability_zones must contain at least 1 AZ name."
  }

  validation {
    condition     = alltrue([for subnet in var.vpc.public_subnets : can(cidrhost(subnet.cidr_block, 0))])
    error_message = "All public_subnets cidr_block values must be valid CIDR notation."
  }

  validation {
    condition     = alltrue([for subnet in var.vpc.private_subnets : can(cidrhost(subnet.cidr_block, 0))])
    error_message = "All private_subnets cidr_block values must be valid CIDR notation."
  }
}
