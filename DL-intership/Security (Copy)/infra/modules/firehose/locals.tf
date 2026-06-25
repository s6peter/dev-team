locals {
  function_name  = coalesce(var.firehose_transformer.existing_function_name, "${var.firehose_transformer.name_prefix}-firehose-transformer")
  log_group_name = coalesce(var.firehose_transformer.existing_log_group_name, "/aws/lambda/${local.function_name}")
}
