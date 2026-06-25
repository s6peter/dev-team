# AWS OpenSearch SIEM Practice Stack

This Terraform project deploys a private AWS security monitoring pipeline that looks and behaves like a small enterprise SIEM:

```text
AWS telemetry -> CloudWatch Logs -> Kinesis Firehose -> Lambda transform -> OpenSearch -> Dashboards
```

It also adds detection and response building blocks:

- GuardDuty ingestion
- Security Hub ingestion
- VPC Flow Logs ingestion
- EventBridge detection rules
- SNS alert topic
- SQS incident queue
- CloudWatch SOC operations dashboard
- OpenSearch SIEM indices, role mappings, and seed detection documents
- Least-privilege SOC IAM roles

The current `development` profile is designed for practice in a personal AWS account. It keeps the high-cost shape low by using one AZ, one OpenSearch node, no NAT Gateway, no customer-managed KMS keys by default, and no explicit retention policies because the stack is meant to be destroyed after practice.

## Repository Layout

```text
infra/
  envs/development/              Terraform environment to deploy
  modules/firehose/              Lambda transformer module
  modules/firehose-stream/       Kinesis Firehose delivery stream module
  modules/opensearch/            Private OpenSearch domain module
  modules/s3/                    S3 bucket module
  modules/test-vpc-bation/       Practice VPC and bastion modules
  opensearch/                    OpenSearch bootstrap assets and Lambda
  SIEM_IMPLEMENTATION_REPORT.md  Detailed architecture/report
```

## What Gets Deployed

Core pipeline:

- Dedicated VPC with one public subnet and one private subnet
- Bastion EC2 host for private Dashboards access
- Private OpenSearch domain
- CloudTrail trail and CloudWatch log group
- Firehose delivery stream into OpenSearch
- Lambda transformer for CloudWatch Logs subscription payloads
- S3 log archive and Firehose failed-record backup buckets

Enterprise-style SIEM additions:

- GuardDuty detector and finding ingestion path
- Security Hub account and finding ingestion path
- VPC Flow Logs ingestion path
- EventBridge detection rules
- SNS topic for alerts
- SQS queue for incident workflow
- CloudWatch dashboard for SOC operations health
- IAM roles for SOC analyst, incident responder, and SIEM admin
- OpenSearch bootstrap for SIEM index templates, ISM policy, saved data view, and role mappings

## Deploy

From the repo root:

```bash
cd "/home/persoba/v-projects/DL-intership/Security (Copy)/infra"
terraform -chdir=envs/development init
terraform -chdir=envs/development plan
terraform -chdir=envs/development apply
```

After apply, capture useful outputs:

```bash
terraform -chdir=envs/development output
terraform -chdir=envs/development output -raw dashboard_bastion_public_dns
terraform -chdir=envs/development output -raw opensearch_vpc_endpoint
terraform -chdir=envs/development output -raw opensearch_dashboards_vpc_endpoint
```

Sensitive outputs may need `-raw` and may not print in the normal output table.

## Access OpenSearch Dashboards

The OpenSearch domain is VPC-only, so access it through the bastion.

Use local port forwarding:

```bash
OPENSEARCH_ENDPOINT="$(terraform -chdir=envs/development output -raw opensearch_vpc_endpoint)"
BASTION_DNS="$(terraform -chdir=envs/development output -raw dashboard_bastion_public_dns)"

ssh -i /home/persoba/.ssh/siem-key.pem \
  -o StrictHostKeyChecking=accept-new \
  -N \
  -L 8443:${OPENSEARCH_ENDPOINT}:443 \
  ec2-user@${BASTION_DNS}
```

Then open:

```text
https://localhost:8443/_dashboards/
```

Use the OpenSearch master username/password from `envs/development/terraform.tfvars`.

If the browser warns about the certificate, that is expected because the certificate is for the OpenSearch VPC endpoint hostname, not `localhost`.

## Verify Logs Are Flowing

Generate some CloudTrail events:

```bash
aws sts get-caller-identity --region us-east-1
aws s3 ls --region us-east-1
aws cloudtrail describe-trails --region us-east-1
```

Check CloudTrail delivery:

```bash
aws cloudtrail get-trail-status \
  --name development-security-trail \
  --region us-east-1
```

Check the Firehose stream:

```bash
aws firehose describe-delivery-stream \
  --delivery-stream-name development-cloudtrail-firehose-stream \
  --region us-east-1 \
  --query 'DeliveryStreamDescription.DeliveryStreamStatus'
```

Check Lambda transformer logs:

```bash
aws logs tail /aws/lambda/development-firehose-transformer \
  --region us-east-1 \
  --since 15m
```

Check Firehose delivery metrics:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Firehose \
  --metric-name DeliveryToAmazonOpenSearchService.Records \
  --dimensions Name=DeliveryStreamName,Value=development-cloudtrail-firehose-stream \
  --start-time "$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 60 \
  --statistics Sum \
  --region us-east-1
```

In OpenSearch Dashboards, use the `siem-events*` data view and set the time picker to a broad range such as “Last 24 hours”.

## SOC Dashboard

Terraform creates this CloudWatch dashboard:

```text
development-soc-operations
```

It shows:

- Firehose delivery to OpenSearch
- Lambda transformer invocations, duration, and errors
- GuardDuty finding ingestion
- Security Hub finding ingestion
- Incident queue depth

## Destroy

This practice stack should be destroyed when finished:

```bash
cd "/home/persoba/v-projects/DL-intership/Security (Copy)/infra"
terraform -chdir=envs/development destroy
```

If S3 buckets block deletion because they contain objects, empty them and rerun destroy:

```bash
aws s3 rm s3://development-log-archive-$(aws sts get-caller-identity --query Account --output text)-us-east-1 --recursive
aws s3 rm s3://development-firehose-backup-$(aws sts get-caller-identity --query Account --output text)-us-east-1 --recursive
terraform -chdir=envs/development destroy
```

## Cost Notes

The development defaults avoid NAT Gateways and customer-managed KMS keys, but this is not free. The main running costs can include:

- OpenSearch domain hourly and EBS storage
- EC2 bastion while running
- GuardDuty and Security Hub usage
- VPC Flow Logs ingestion and CloudWatch Logs storage
- Firehose delivery
- S3 storage for CloudTrail and failed Firehose records

For lowest cost, deploy only while practicing and destroy immediately after.

