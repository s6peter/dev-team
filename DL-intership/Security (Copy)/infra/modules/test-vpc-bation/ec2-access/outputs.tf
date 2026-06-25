output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.bastion.id
}

output "instance_public_ip" {
  description = "Public IP address for SSH"
  value       = aws_instance.bastion.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name for SSH"
  value       = aws_instance.bastion.public_dns
}

output "security_group_id" {
  description = "Security group ID attached to the EC2 instance"
  value       = aws_security_group.ssh_access.id
}
