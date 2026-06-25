Firehose Lambda Transformer Module

This module creates a Lambda function that transforms CloudWatch Logs subscription filter events into OpenSearch-compatible JSON format.

Purpose

CloudWatch Logs sends events in base64-encoded, gzip-compressed format. OpenSearch expects plain, newline-delimited JSON. This Lambda transformer:

Decompresses and decodes CloudWatch Logs events
Parses JSON messages (especially CloudTrail events)
Adds ingestion metadata (timestamps, source, context)
Outputs newline-delimited JSON ready for OpenSearch

Integration Points

This Lambda is used by the Firehose delivery stream as a processing step:

CloudWatch Logs -> Subscription Filter -> Firehose -> Lambda Transformer -> OpenSearch

Usage

Basic Example

```hcl
module "firehose_transformer" {
  source = "../../modules/firehose"

  firehose_transformer = {
    aws_region  = "us-east-1"
    name_prefix = "dev"
  }
}
```

With Custom Configuration

```hcl
module "firehose_transformer" {
  source = "../../modules/firehose"

  firehose_transformer = {
    aws_region  = "us-east-1"
    name_prefix = "production"
    environment = "production"
    memory_size = 512           # Increased for high-volume ingestion
    timeout     = 120           # Longer timeout for batch processing
    
    tags = {
      Team       = "Security"
      CostCenter = "Engineering"
      Purpose    = "SIEM-Ingestion"
    }
  }

  depends_on = []
}
```

Passing Transformer to Firehose Module

Once created, pass the Lambda ARN to the Firehose delivery stream:

```hcl
module "firehose_delivery_stream" {
  source = "../../modules/firehose-stream"

  firehose_stream = {
    aws_region                = "us-east-1"
    name_prefix               = "dev"
    
    # Lambda transformer (from this module)
    lambda_transformer_arn    = module.firehose_transformer.function_arn
    
    # OpenSearch destination
    opensearch_domain_arn     = module.opensearch.domain_arn
    opensearch_endpoint       = module.opensearch.endpoint
    opensearch_index_name     = "cloudtrail-logs"
    opensearch_role_arn       = module.iam_firehose_opensearch.role_arn
    
    # S3 backup for failed records
    s3_backup_bucket_arn      = module.s3_firehose_backup.bucket_arn
    s3_backup_role_arn        = module.iam_firehose_s3.role_arn
    
    cloudwatch_log_group_arn  = module.cloudwatch_firehose.log_group_arn
  }

  depends_on = [
    module.firehose_transformer,
    module.opensearch
  ]
}
```

Inputs

firehose_transformer object

REQUIRED:
- aws_region (string): AWS region (e.g., "us-east-1")
- name_prefix (string): Prefix for all resource names (e.g., "dev", "staging")

OPTIONAL:
- environment (string, default: "development"): Environment name for tagging
- memory_size (number, default: 256): Lambda memory in MB (128-10240)
- timeout (number, default: 60): Lambda timeout in seconds (1-900)
- tags (map(string), default: {}): Additional resource tags

Outputs

function_name: Lambda function name
function_arn: Lambda function ARN (use in Firehose processor configuration)
function_role_arn: IAM role ARN
log_group_name: CloudWatch log group name
log_group_arn: CloudWatch log group ARN

Lambda Handler Behavior

Input Processing

The handler receives Firehose data in array format:

```json
{
  "records": [
    {
      "recordId": "abc123",
      "data": "base64-encoded gzip-compressed CloudWatch Logs event"
    }
  ]
}
```

Output Format

Returns structured format for Firehose:

```json
{
  "records": [
    {
      "recordId": "abc123",
      "result": "Ok",
      "data": "{JSON event with metadata}\n"
    }
  ]
}
```

Metadata Added

Each transformed record includes _firehose_metadata with:
- ingestion_timestamp: ISO 8601 timestamp when Lambda processed it
- source: Always "cloudwatch-logs"
- log_group: Original CloudWatch log group
- log_stream: Original CloudWatch log stream
- original_event_id: CloudWatch event ID
- original_timestamp: CloudWatch event timestamp
- parse_error: (If JSON parsing failed) Error message

Error Handling

JSON Parse Errors: If message is not valid JSON, it's included as a fallback record with parse_error in metadata

Decompression/Payload Errors: Record marked as ProcessingFailed, sent to Firehose DLQ/S3 backup

All errors are logged to CloudWatch for debugging

Performance Tuning

For high-volume CloudTrail ingestion (1000+ events/second):

```hcl
firehose_transformer = {
  memory_size = 1024  # Faster CPU = faster processing
  timeout     = 120   # Account for batch processing time
}
```

Monitor CloudWatch logs and Lambda CloudWatch metrics to validate:
- Duration (should be < timeout)
- Error rate (should be near 0%)
- Throttling (should not occur)

Testing

Test the handler locally:

```bash
cd src
python3 -m pytest test_index.py  # If tests exist
```

Or manually with sample CloudWatch Logs event:

```bash
python3 src/index.py << 'EOF'
{
  "records": [
    {
      "recordId": "test-123",
      "data": "<base64-gzip-encoded CloudWatch Logs event>"
    }
  ]
}
EOF
```

Troubleshooting

Lambda Timeout

If timeout errors appear, increase memory_size (provides more CPU) and/or timeout duration.

Memory: 128 MB = lowest CPU
Memory: 3008+ MB = highest CPU (recommended for high-volume)

ProcessingFailed Records Accumulating

Check S3 backup bucket (firehose failures prefix). Examine error logs in CloudWatch.

Common causes:
- Invalid gzip compression
- Malformed JSON in CloudTrail events
- Unicode encoding issues

High Latency (> 2 seconds)

Check Lambda duration in CloudWatch metrics.

If duration is high:
- Increase memory_size
- Check if OpenSearch cluster is throttling (but this module doesn't call OpenSearch)
- Check if SQS or DLQ is backing up (Firehose-specific, not Lambda)

Related Documentation

Firehose Delivery Stream Module: Not yet created; will use this transformer
OpenSearch Integration: docs/OPENSEARCH_INTEGRATION.md
Ticket #699: Configure Firehose to OpenSearch
Ticket #700: Create Firehose + CW Logs subscription filter
