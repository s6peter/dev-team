# S3 bucket for GitLab object storage (artifacts, uploads, LFS, packages, registry)
resource "aws_s3_bucket" "gitlab_storage" {
  bucket = "${var.project_name}-${var.environment}-gitlab-storage"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-gitlab-storage"
  })
}

resource "aws_s3_bucket_versioning" "gitlab_storage" {
  bucket = aws_s3_bucket.gitlab_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gitlab_storage" {
  bucket = aws_s3_bucket.gitlab_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = local.kms_key_id
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "gitlab_storage" {
  bucket = aws_s3_bucket.gitlab_storage.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {
      prefix = "artifacts/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {
      prefix = "backups/"
    }

    expiration {
      days = var.backup_retention_days
    }
  }
}

resource "aws_s3_bucket_public_access_block" "gitlab_storage" {
  bucket = aws_s3_bucket.gitlab_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "gitlab_s3_access" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [
      aws_s3_bucket.gitlab_storage.arn,
      "${aws_s3_bucket.gitlab_storage.arn}/*",
    ]
  }
}

resource "aws_iam_policy" "gitlab_s3" {
  name   = "${var.project_name}-${var.environment}-s3-policy"
  policy = data.aws_iam_policy_document.gitlab_s3_access.json

  tags = var.tags
}

# S3 bucket for Terraform state (GitLab managed infrastructure via CI)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-${var.environment}-tf-state"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-tf-state"
  })
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = local.kms_key_id
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB for Terraform state locking
resource "aws_dynamodb_table" "terraform_state_lock" {
  name         = "${var.project_name}-${var.environment}-tf-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = local.kms_key_id
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = var.tags
}

# S3 bucket for GitLab CI cache
resource "aws_s3_bucket" "gitlab_ci_cache" {
  bucket = "${var.project_name}-${var.environment}-ci-cache"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ci-cache"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "gitlab_ci_cache" {
  bucket = aws_s3_bucket.gitlab_ci_cache.id

  rule {
    id     = "expire-cache"
    status = "Enabled"

    expiration {
      days = 7
    }
  }
}
