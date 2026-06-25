module "secure_s3_bucket" {
  source = "./module"
  

  bucket_name    = "my-default-bucket-04-20"
 
  force_destroy  = true

  tags = {
    Environment = "dev"
    Owner       = "devsecops"
  }

  # logging = {
  #   target_bucket = "log-bucket"
  #   target_prefix = "logs/"
  # }

  bucket_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = "arn:aws:s3:::my-default-bucket-04-20/*"
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
