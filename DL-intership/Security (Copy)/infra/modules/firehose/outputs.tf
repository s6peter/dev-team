output "function_name" {
  description = "Lambda function name"
  value       = local.lambda_function_name
}

output "function_arn" {
  description = "Lambda function ARN"
  value       = local.lambda_function_arn
}

output "function_role_arn" {
  description = "Lambda IAM role ARN"
  value       = local.lambda_role_arn
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = local.log_group_name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = local.log_group_arn
}
