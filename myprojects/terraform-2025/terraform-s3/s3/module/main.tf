



###authenticating terraform for sevice account 
# provider "aws" {
#   alias = "web"
#   region = "us-east-1"
#   assume_role_with_web_identity {
#     role_arn                = "arn:aws:iam::123456789012:role/your-web-identity-role"
#     web_identity_token_file = "/path/to/token.jwt"
#     session_name            = "web-session"
#   }
# }


##authenticate terraform with sso
# provider "aws" {
#   region = "us-east-1"
#   profile = "my-sso-profile"

#   assume_role {
#     role_arn     = "arn:aws:iam::152617279670:role/migrate-dms-s3"
#     session_name = "classic-session"
#   }
# }


##using access key and secret key located in ./aws
provider "aws" {
  region = "us-west-1"
  profile = "default"

}


resource "aws_s3_bucket" "my_logging_bucket" {
    bucket = var.bucket_name
    force_destroy = var.force_destroy
  
    tags = var.tags
  
}


# resource "aws_s3_bucket_acl" "loging_acl" {
#   bucket = aws_s3_bucket.my_logging_bucket.bucket
#   acl = "private"
  
# }

resource "aws_s3_bucket_versioning" "my_logging_bucket_versioning" {
  bucket = aws_s3_bucket.my_logging_bucket.bucket
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "logging_bucket_public_access" {
  bucket = aws_s3_bucket.my_logging_bucket.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true 
  restrict_public_buckets = true 

  
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.my_logging_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "this" {
  count  = var.bucket_policy != "" ? 1 : 0
  bucket = aws_s3_bucket.my_logging_bucket.id
  policy = var.bucket_policy
}


#Every time someone accesses a file, logs are stored in another S3 bucket.Great for audit and monitoring access patterns.
resource "aws_s3_bucket_logging" "this" {
  count = var.logging != null ? 1 : 0
  bucket = aws_s3_bucket.my_logging_bucket.id

  target_bucket = var.logging.target_bucket
  target_prefix = var.logging.target_prefix
}