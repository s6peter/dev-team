output "gitlab_url" {
  description = "GitLab URL. Wait 10-15 minutes after apply for the container to finish booting."
  value       = var.gitlab_external_url != "" ? var.gitlab_external_url : "http://${aws_instance.gitlab.public_dns}"
}

output "gitlab_ssh_clone_port" {
  value = 2222
}

output "gitlab_root_username" {
  value = "root"
}

output "gitlab_root_password" {
  value     = random_password.gitlab_root.result
  sensitive = true
}

output "gitlab_public_ip" {
  value = aws_instance.gitlab.public_ip
}

output "backup_bucket" {
  value = aws_s3_bucket.gitlab_backups.id
}

output "session_manager_command" {
  value = "aws ssm start-session --target ${aws_instance.gitlab.id} --region ${var.aws_region}"
}

output "sonarqube_url" {
  value = var.enable_lab_services ? "http://${aws_instance.gitlab.public_dns}:9000" : null
}

output "artifactory_url" {
  value = var.enable_lab_services ? "http://${aws_instance.gitlab.public_dns}:8082" : null
}

output "keycloak_url" {
  value = var.enable_lab_services ? "http://${aws_instance.gitlab.public_dns}:8080" : null
}

output "grafana_url" {
  value = var.enable_lab_services ? "http://${aws_instance.gitlab.public_dns}:3000" : null
}

output "eks_cluster_name" {
  value = var.enable_eks ? aws_eks_cluster.main[0].name : null
}

output "eks_update_kubeconfig_command" {
  value = var.enable_eks ? "aws eks update-kubeconfig --name ${aws_eks_cluster.main[0].name} --region ${var.aws_region}" : null
}

