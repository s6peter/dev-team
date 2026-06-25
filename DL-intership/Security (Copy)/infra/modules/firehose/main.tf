locals {
  use_existing_function = var.firehose_transformer.existing_function_name != null
  log_group_arn         = "arn:aws:logs:${var.firehose_transformer.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${local.log_group_name}"
  lambda_role_arn       = var.firehose_transformer.existing_role_arn != null ? var.firehose_transformer.existing_role_arn : (local.use_existing_function ? data.aws_lambda_function.existing[0].role : try(aws_iam_role.lambda[0].arn, null))
  lambda_function_name  = local.use_existing_function ? data.aws_lambda_function.existing[0].function_name : aws_lambda_function.transformer[0].function_name
  lambda_function_arn   = local.use_existing_function ? data.aws_lambda_function.existing[0].arn : aws_lambda_function.transformer[0].arn
}

data "aws_lambda_function" "existing" {
  count         = local.use_existing_function ? 1 : 0
  function_name = local.function_name
}

resource "aws_cloudwatch_log_group" "lambda" {
  count             = var.firehose_transformer.existing_log_group_name == null ? 1 : 0
  name              = local.log_group_name
  retention_in_days = var.firehose_transformer.log_retention_days

  tags = merge(var.firehose_transformer.tags, {
    Name     = "${local.function_name}-logs"
    Function = local.function_name
  })
}

resource "aws_lambda_function" "transformer" {
  count = local.use_existing_function ? 0 : 1

  function_name = local.function_name
  description   = "Transform CloudWatch Logs subscription filter events to OpenSearch-compatible JSON"

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "python3.12"

  role        = local.lambda_role_arn
  memory_size = var.firehose_transformer.memory_size
  timeout     = var.firehose_transformer.timeout

  environment {
    variables = {
      ENVIRONMENT = var.firehose_transformer.environment
    }
  }

  tags = merge(var.firehose_transformer.tags, {
    Name     = local.function_name
    Function = local.function_name
  })

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.lambda
  ]
}
