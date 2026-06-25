locals {
  bucket_name = "${var.s3.name_prefix}-${var.s3.bucket_name}-${data.aws_caller_identity.current.account_id}-${var.s3.aws_region}"
  kms_key_arn = var.s3.kms_key_arn == null ? "" : var.s3.kms_key_arn
  use_kms_sse = local.kms_key_arn != ""
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "this" {
  bucket = local.bucket_name

  tags = merge(
    var.s3.tags,
    {
      Name = local.bucket_name
    }
  )
}

resource "aws_s3_bucket_versioning" "this" {
  count  = var.s3.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  count  = var.s3.enable_encryption ? 1 : 0
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = local.use_kms_sse ? "aws:kms" : "AES256"
      kms_master_key_id = local.use_kms_sse ? local.kms_key_arn : null
    }
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  count  = var.s3.enable_public_access_block ? 1 : 0
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = length(var.s3.lifecycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.s3.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {}

      dynamic "transition" {
        for_each = rule.value.storage_class != null && rule.value.days != null ? [1] : []
        content {
          days          = rule.value.days
          storage_class = rule.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }
    }
  }
}
