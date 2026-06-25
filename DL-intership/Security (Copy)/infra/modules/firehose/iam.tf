resource "aws_iam_role" "lambda" {
  count = var.firehose_transformer.existing_role_arn == null ? 1 : 0

  name_prefix = "${var.firehose_transformer.name_prefix}-firehose-transformer-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(var.firehose_transformer.tags, {
    Name     = "${local.function_name}-role"
    Function = local.function_name
  })
}

resource "aws_iam_role_policy" "lambda" {
  count       = var.firehose_transformer.existing_role_arn == null ? 1 : 0
  name_prefix = "${var.firehose_transformer.name_prefix}-firehose-transformer-"
  role        = aws_iam_role.lambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          local.log_group_arn,
          "${local.log_group_arn}:*"
        ]
      }
    ]
  })
}
