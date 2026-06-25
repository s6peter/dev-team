output "key_ids" {
  description = "Map of key names to KMS Key IDs"
  value       = { for k, v in aws_kms_key.this : k => v.key_id }
}

output "key_arns" {
  description = "Map of key names to KMS Key ARNs"
  value       = { for k, v in aws_kms_key.this : k => v.arn }
}

output "key_aliases" {
  description = "Map of key names to KMS Key aliases"
  value       = { for k, v in aws_kms_alias.this : k => v.name }
}
