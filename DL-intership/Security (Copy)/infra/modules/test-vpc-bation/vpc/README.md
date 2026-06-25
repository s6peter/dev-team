# AWS VPC Module

Creates a VPC with public and private subnets across multiple availability zones, with NAT gateways for private subnet internet access.

## Usage

```hcl
module "vpc" {
  source = "../../modules/vpc"

  vpc = {
    name_prefix       = "security"
    cidr_block        = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b"]

    public_subnets = [
      { cidr_block = "10.0.1.0/24", az = "us-east-1a" },
      { cidr_block = "10.0.2.0/24", az = "us-east-1b" }
    ]

    private_subnets = [
      { cidr_block = "10.0.11.0/24", az = "us-east-1a" },
      { cidr_block = "10.0.12.0/24", az = "us-east-1b" }
    ]

    enable_nat_gateway = true
    enable_dns_hostnames = true
    enable_dns_support   = true

    tags = {
      Environment = "development"
      ManagedBy   = "terraform"
    }
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `vpc.name_prefix` | Prefix for VPC name | `string` | n/a | yes |
| `vpc.cidr_block` | VPC CIDR block | `string` | n/a | yes |
| `vpc.public_subnets` | List of public subnet configs | `list(object)` | `[]` | no |
| `vpc.private_subnets` | List of private subnet configs | `list(object)` | `[]` | no |
| `vpc.enable_nat_gateway` | Enable NAT gateways for private subnets | `bool` | `true` | no |
| `vpc.enable_dns_hostnames` | Enable DNS hostnames in VPC | `bool` | `true` | no |
| `vpc.enable_dns_support` | Enable DNS support in VPC | `bool` | `true` | no |
| `vpc.tags` | Tags for VPC and subnets | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `vpc_id` | VPC ID |
| `vpc_cidr` | VPC CIDR block |
| `public_subnet_ids` | List of public subnet IDs |
| `private_subnet_ids` | List of private subnet IDs |
| `nat_gateway_ids` | List of NAT gateway IDs |

## Notes

- NAT gateways are placed in public subnets; one per public subnet recommended.
- Private subnets route internet traffic through NAT gateways.
- DNS support recommended for service discovery (required for OpenSearch).
