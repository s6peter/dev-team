output "bucket_arn" {
    value = aws_s3_bucket.my_logging_bucket.arn
  
}

output "bucket_name" {
    value = aws_s3_bucket.my_logging_bucket.bucket
  
}

output "bucket_id" {
    value = aws_s3_bucket.my_logging_bucket.id
  
}