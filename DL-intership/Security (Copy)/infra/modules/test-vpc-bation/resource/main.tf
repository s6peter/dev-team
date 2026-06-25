module "vpc" {
  source = "../vpc"

  vpc = {
    name_prefix          = var.environment
    aws_region           = var.aws_region
    cidr_block           = var.vpc_cidr_block
    availability_zones   = var.availability_zones
    public_subnets       = var.public_subnets
    private_subnets      = var.private_subnets
    enable_nat_gateway   = var.enable_nat_gateway
    enable_dns_hostnames = var.enable_dns_hostnames
    enable_dns_support   = var.enable_dns_support
    tags = var.common_tags
  }
}

module "ec2_access" {
  source = "../ec2-access"

  aws_region         = var.aws_region
  environment        = var.environment
  common_tags        = var.common_tags
  vpc_id             = module.vpc.vpc_id
  vpc_cidr_block     = module.vpc.vpc_cidr
  public_subnet_id   = module.vpc.public_subnet_ids[var.bastion_public_subnet_index]
  key_pair_name      = var.key_pair_name
  instance_type      = var.instance_type
  allowed_ssh_cidrs  = var.allowed_ssh_cidrs
  root_volume_size   = var.root_volume_size
}

data "aws_caller_identity" "current" {}
