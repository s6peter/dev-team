
output "vpc_id" {
  description = "ID of security VPC"
  value       = module.vpc.vpc_id
}

output "vpc_public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "vpc_private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "bastion_instance_id" {
  description = "EC2 bastion instance ID"
  value       = module.ec2_access.instance_id
}

output "bastion_public_ip" {
  description = "Public IP of the bastion instance"
  value       = module.ec2_access.instance_public_ip
}

output "bastion_public_dns" {
  description = "Public DNS of the bastion instance"
  value       = module.ec2_access.instance_public_dns
}

output "bastion_security_group_id" {
  description = "Security group ID attached to the bastion instance"
  value       = module.ec2_access.security_group_id
}
