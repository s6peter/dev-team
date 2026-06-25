locals {
  key_policy_principals = {
    for name, key_config in var.kms.keys :
    name => length(key_config.service_principals) > 0 ? jsonencode({
      Sid    = "AllowServicePrincipals"
      Effect = "Allow"
      Principal = {
        Service = key_config.service_principals
      }
      Action   = "kms:*"
      Resource = "*"
    }) : ""
  }
}

resource "aws_kms_key" "this" {
  for_each = var.kms.keys

  description             = each.value.description
  deletion_window_in_days = var.kms.deletion_window_in_days
  enable_key_rotation     = var.kms.enable_key_rotation

  tags = merge(
    var.kms.tags,
    {
      Name = "${var.kms.name_prefix}-kms-${each.key}"
    }
  )
}

resource "aws_kms_alias" "this" {
  for_each = var.kms.keys

  name          = "alias/${var.kms.name_prefix}-${each.value.alias}"
  target_key_id = aws_kms_key.this[each.key].key_id
}

resource "aws_kms_key_policy" "service_principals" {
  for_each = {
    for name, key_config in var.kms.keys :
    name => key_config if length(key_config.service_principals) > 0
  }

  key_id = aws_kms_key.this[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM policies"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow AWS services"
        Effect = "Allow"
        Principal = {
          Service = each.value.service_principals
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
