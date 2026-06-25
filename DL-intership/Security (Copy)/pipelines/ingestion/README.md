# SIEM Ingestion Pipelines

This folder is for the pipelines that move telemetry into the SIEM.

Two first-class ingestion models should be preserved:

- real-time pipeline: CloudWatch Logs -> Lambda or Firehose -> OpenSearch
- archive pipeline: S3 -> SQS -> worker -> OpenSearch

Every ingestion component should define:

- source of truth
- delivery guarantees
- retry behavior
- dead-letter or failure handling
- owner and on-call expectations
