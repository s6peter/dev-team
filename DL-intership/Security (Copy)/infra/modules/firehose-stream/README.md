# Firehose Delivery Stream Module

Terraform module for creating an AWS Kinesis Firehose delivery stream that routes CloudTrail logs from CloudWatch Logs through a Lambda transformer to OpenSearch, with S3 backup for failed records.

## Architecture

This module implements the final stage of the CloudTrail log ingestion pipeline:

```
CloudTrail Events
    ↓
CloudWatch Logs (subscription filter feeds here)
    ↓
Firehose Delivery Stream (this module)
    ├→ Lambda Transformer (from firehose-transformer module)
    │  ├→ Decompresses logs
    │  ├→ Parses JSON
    │  └→ Adds metadata
    ├→ OpenSearch (successful records)
    └→ S3 (failed records)
```

## Overview

The Firehose delivery stream:

1. **Receives data** from CloudWatch Logs subscription filter
2. **Invokes Lambda transformer** to process/enrich records
3. **Routes successful records** to OpenSearch for indexing
4. **Backs up failures** to S3 for analysis and debugging
5. **Logs all operations** to CloudWatch for monitoring

For failed records at the OpenSearch stage, Firehose automatically routes to S3 backup using `FailedDocumentsOnly` mode.

## Usage

### Basic Example

```hcl
module "firehose_stream" {
  source = "../../modules/firehose-stream"

  firehose_stream = {
    aws_region              = "us-east-1"
    name_prefix             = "cloudtrail"
    opensearch_endpoint     = "https://my-domain.us-east-1.es.amazonaws.com"
    opensearch_domain_arn   = "arn:aws:es:us-east-1:123456789012:domain/my-domain"
    lambda_transformer_arn  = module.firehose_transformer.function_arn
    s3_backup_bucket_arn    = aws_s3_bucket.firehose_backup.arn
    s3_bucket_name          = aws_s3_bucket.firehose_backup.id
    environment             = var.environment
    tags                    = var.common_tags
  }
}
```

### With Custom Buffering

```hcl
module "firehose_stream" {
  source = "../../modules/firehose-stream"

  firehose_stream = {
    aws_region              = "us-east-1"
    name_prefix             = "cloudtrail"
    opensearch_endpoint     = "https://my-domain.us-east-1.es.amazonaws.com"
    opensearch_domain_arn   = "arn:aws:es:us-east-1:123456789012:domain/my-domain"
    lambda_transformer_arn  = module.firehose_transformer.function_arn
    s3_backup_bucket_arn    = aws_s3_bucket.firehose_backup.arn
    s3_bucket_name          = aws_s3_bucket.firehose_backup.id
    environment             = var.environment
    buffer_size_mb          = 64
    buffer_interval_sec     = 120
    index_rotation          = "OneHour"
    retry_duration_sec      = 1800
    tags                    = var.common_tags
  }
}
```

## Input Variables

### `firehose_stream` (required)

An object containing the Firehose delivery stream configuration:

- **`aws_region`** (required, string): AWS region where Firehose is deployed
- **`name_prefix`** (required, string): Prefix for resource names (lowercase alphanumeric and hyphens only)
- **`opensearch_endpoint`** (required, string): Full HTTPS endpoint URL for OpenSearch domain
- **`opensearch_domain_arn`** (required, string): ARN of the OpenSearch domain
- **`lambda_transformer_arn`** (required, string): ARN of the Lambda transformer function
- **`s3_backup_bucket_arn`** (required, string): ARN of S3 bucket for failed record backup
- **`s3_bucket_name`** (required, string): Name of S3 bucket for failed record backup
- **`environment`** (optional, string, default: "development"): Environment name (development/staging/production)
- **`buffer_size_mb`** (optional, number, default: 128): Buffer size in MB (1-128)
- **`buffer_interval_sec`** (optional, number, default: 60): Buffer interval in seconds (60-900)
- **`index_name`** (optional, string, default: "cloudtrail-logs"): OpenSearch index name
- **`index_rotation`** (optional, string, default: "OneDay"): OpenSearch index rotation (NoRotation, OneHour, OneDay, OneWeek, OneMonth)
- **`retry_duration_sec`** (optional, number, default: 3600): Retry duration in seconds (0-7200)
- **`cloudwatch_logging`** (optional, bool, default: true): Enable CloudWatch logging for delivery and S3 backup
- **`enable_document_id`** (optional, bool, default: true): Enable document ID generation
- **`tags`** (optional, map(string), default: {}): Additional tags to apply to all resources

## Output Values

- **`stream_arn`**: ARN of the Firehose delivery stream
- **`stream_name`**: Name of the Firehose delivery stream
- **`role_arn`**: ARN of the IAM role used by Firehose
- **`log_group_name`**: CloudWatch log group for Firehose delivery logs
- **`s3_backup_log_group_name`**: CloudWatch log group for S3 backup failure logs

## IAM Permissions

This module creates an IAM role with the following managed policies:

1. **OpenSearch Access**: PutBulkData, DescribeDomain operations
2. **S3 Backup Access**: GetObject, PutObject, AbortMultipartUpload, ListBucket
3. **Lambda Invocation**: InvokeFunction for the transformer
4. **CloudWatch Logs**: PutLogEvents for monitoring

The role trusts the Firehose service (`firehose.amazonaws.com`).

## CloudWatch Logging

All operations are logged to CloudWatch as follows:

- **Delivery Logs** (`/aws/kinesisfirehose/{stream-name}`): Operations related to sending data to OpenSearch
- **S3 Failure Logs** (`/aws/s3/firehose-backup/{stream-name}`): Operations related to S3 backup of failed records

Both log groups are retained for 30 days. Logs are automatically indexed by Firehose.

## Data Flow and Error Handling

### Successful Path

```
CloudWatch Logs Input
    ↓
Lambda Transformer (decompress, parse, enrich)
    ↓
OpenSearch (indexed with metadata)
    ↓
Success - Data available for search
```

### Failure Path (Lambda Issue)

```
CloudWatch Logs Input
    ↓
Lambda Transformer (if transformation fails)
    ↓
ProcessingFailed Record
    ↓
S3 Backup (with error details)
    ↓
CloudWatch Log (S3 failure log stream)
    ↓
Manual investigation required
```

### Failure Path (OpenSearch Issue)

```
CloudWatch Logs Input → Lambda Transformer
    ↓
OpenSearch Delivery (if OpenSearch unavailable)
    ↓
Immediate Retry (up to retry_duration_sec)
    ↓
If still failing
    ↓
S3 Backup (FailedDocumentsOnly mode)
    ↓
CloudWatch Log (S3 failure log stream)
    ↓
Data recoverable for replay
```

## Buffering and Performance

The module buffers records before sending to OpenSearch to optimize batch performance:

- **Default**: 128 MB or 60 seconds (whichever comes first)
- **Low latency**: 64 MB or 30 seconds
- **High throughput**: 128 MB or 300 seconds

Adjust `buffer_size_mb` and `buffer_interval_sec` based on:

- **CloudTrail event volume**: Higher volume → larger buffer
- **Query latency requirements**: Lower latency → smaller buffer
- **OpenSearch shard capacity**: Adjust to match target throughput

## Index Rotation

OpenSearch indices are automatically rotated based on `index_rotation`:

- **NoRotation**: Single index, grows continuously (not recommended for large volumes)
- **OneHour**: New index every hour (high elasticity cost)
- **OneDay**: New index daily (balanced - default)
- **OneWeek**: New index weekly (good for low volume)
- **OneMonth**: New index monthly (for archival)

## Monitoring and Troubleshooting

### Check CloudWatch Logs

```bash
# Firehose delivery logs
aws logs tail /aws/kinesisfirehose/cloudtrail-firehose-stream --follow

# S3 backup failure logs
aws logs tail /aws/s3/firehose-backup/cloudtrail-firehose-stream --follow
```

### Check S3 Backup Bucket

```bash
# List failed records
aws s3 ls s3://my-backup-bucket/firehose-backup/failed-records/ --recursive

# Check error records
aws s3 ls s3://my-backup-bucket/firehose-backup/errors/ --recursive
```

### Metrics to Monitor

In CloudWatch Metrics under `AWS/Firehose`:

- `DeliveryToOpenSearch.Records`: Records sent to OpenSearch
- `DeliveryToOpenSearch.Bytes`: Bytes sent to OpenSearch
- `DeliveryToS3.Records`: Records sent to S3 (failures)
- `DeliveryToS3.Bytes`: Bytes sent to S3
- `IncomingRecords`: Total records received
- `IncomingBytes`: Total bytes received

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Records stuck in S3 | OpenSearch domain unreachable | Verify security group allows outbound 443, check domain health |
| Transformation failures | Lambda errors | Check Lambda function logs, verify environment variables |
| Buffer not draining | Very low event volume | Increase buffer_interval_sec or check upstream log source |
| High latency to OpenSearch | Buffer too large or domain overloaded | Reduce buffer_size_mb or scale OpenSearch |

## Dependencies

This module requires:

1. **OpenSearch Domain**: Pre-existing and accessible from Firehose (same VPC or with proper security group rules)
2. **S3 Bucket**: Pre-existing for backup with appropriate permissions
3. **Lambda Transformer**: From `firehose-transformer` module
4. **CloudWatch Log Source**: CloudWatch subscription filter to feed this stream

## Integration with Other Modules

### Using with Firehose Transformer

```hcl
module "firehose_transformer" {
  source = "../../modules/firehose"
  # ... configuration ...
}

module "firehose_stream" {
  source = "../../modules/firehose-stream"

  firehose_stream = {
    # ... other config ...
    lambda_transformer_arn = module.firehose_transformer.function_arn
    # ... rest of config ...
  }
}
```

### Using with CloudTrail Integration

After deploying this module, create a CloudWatch subscription filter:

```hcl
resource "aws_cloudwatch_log_subscription_filter" "cloudtrail_to_firehose" {
  name            = "cloudtrail-to-firehose"
  log_group_name  = "/aws/cloudtrail/organization"
  filter_pattern  = ""  # Match all events
  destination_arn = module.firehose_stream.stream_arn

  depends_on = [aws_iam_role_policy.cloudwatch_logs_to_firehose]
}
```

## Cost Considerations

Firehose charges for:

1. **Data ingestion**: $0.035 per GB ingested (first 2.5 GB free)
2. **Data formatting**: Formatting and buffer management included
3. **Lambda invocation**: Via Lambda pricing
4. **OpenSearch delivery**: Included in ingestion fee
5. **S3 backup**: Standard S3 storage and PUT/GET charges

Estimate for production CloudTrail:

- **Event volume**: ~1000 events/day = ~5 MB/day
- **Monthly cost**: ~5 GB/month = $150-200 (including OpenSearch and S3)

## Files in This Module

- `variables.tf`: Input variable definitions with validation
- `main.tf`: Firehose delivery stream and CloudWatch log group resources
- `iam.tf`: IAM role and policies for Firehose service access
- `data.tf`: Data sources (AWS account info)
- `outputs.tf`: Output values for integration
- `providers.tf`: Terraform and provider version requirements
- `README.md`: This documentation

## See Also

- [Firehose Transformer Module](../firehose): Lambda function for transforming CloudWatch Logs
- [OpenSearch Module](../opensearch): OpenSearch domain setup
- [S3 Module](../s3): S3 bucket for backup storage
- [AWS Firehose Documentation](https://docs.aws.amazon.com/kinesis/latest/dev/enhanced-fanout.html)
