# AWS OpenSearch SIEM Implementation Report

## 1. Executive Summary

This project implements a Terraform-managed AWS SIEM practice environment centered on Amazon OpenSearch Service. It collects security telemetry from CloudTrail, GuardDuty, Security Hub, and VPC Flow Logs, normalizes those events through a Lambda transformer, delivers them through Kinesis Data Firehose, and indexes them into a private OpenSearch domain for investigation through OpenSearch Dashboards.

The stack also includes enterprise-style operational features:

- Detection rules and alerts
- SOC operations dashboard
- GuardDuty and Security Hub ingestion
- VPC Flow Logs ingestion
- Incident workflow through SQS
- Index lifecycle management in OpenSearch
- Least-privilege SOC roles
- Private dashboard access through a bastion host

The `development` environment is intentionally a practice-sized deployment. It looks like an enterprise SIEM architecture, but it is not sized for production high availability. It uses one OpenSearch data node, one AZ, no NAT Gateway, no customer-managed KMS keys by default, and no explicit retention because the intended workflow is deploy, demonstrate, and destroy.

## 2. High-Level Architecture

```text
                         +----------------------+
                         | AWS API Activity     |
                         | CloudTrail           |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | CloudWatch Logs      |
                         | /aws/cloudtrail/...  |
                         +----------+-----------+
                                    |
                                    v
+-------------+       +-------------+------------+       +-------------------+
| GuardDuty   +------>| EventBridge -> CW Logs   |       | VPC Flow Logs     |
+-------------+       +-------------+------------+       +---------+---------+
                                    |                              |
+-------------+       +-------------+------------+                 |
| SecurityHub +------>| EventBridge -> CW Logs   |                 |
+-------------+       +-------------+------------+                 |
                                    |                              |
                                    +--------------+---------------+
                                                   |
                                                   v
                                      +------------------------+
                                      | Kinesis Data Firehose  |
                                      +-----------+------------+
                                                  |
                                                  v
                                      +------------------------+
                                      | Lambda Transformer     |
                                      +-----------+------------+
                                                  |
                                                  v
                                      +------------------------+
                                      | OpenSearch siem-events |
                                      +-----------+------------+
                                                  |
                                                  v
                                      +------------------------+
                                      | OpenSearch Dashboards  |
                                      +------------------------+
```

Detection and response workflow:

```text
CloudTrail / GuardDuty events
        |
        v
EventBridge detection rules
        |
        +--> SNS topic: development-siem-alerts
        |
        +--> SQS queue: development-siem-incidents
```

Operations workflow:

```text
Firehose metrics + Lambda metrics + Log ingestion metrics + SQS queue depth
        |
        v
CloudWatch dashboard: development-soc-operations
```

## 3. Terraform Environment

Main environment:

```text
infra/envs/development
```

Important files:

- `main.tf`: Main environment wiring and AWS resources.
- `variables.tf`: Environment input variables and feature toggles.
- `terraform.tfvars`: Current development values.
- `outputs.tf`: Useful values after deployment.
- `providers.tf`: AWS provider and provider aliases.
- `aws_resource_exists.sh`: Helper used by external data sources to detect existing resources.

Current deployment profile:

- `create_vpc = true`
- `vpc_enable_nat_gateway = false`
- `opensearch_data_node_count = 1`
- `opensearch_instance_type = "t3.small.search"`
- `opensearch_ebs_volume_size = 10`
- `create_customer_managed_kms_keys = false`
- `enable_enterprise_siem_features = true`
- `enable_guardduty_ingestion = true`
- `enable_securityhub_ingestion = true`
- `enable_vpc_flow_logs_ingestion = true`
- `enable_detection_alerts = true`

## 4. Network Design

The practice VPC is created by:

```text
infra/modules/test-vpc-bation/vpc
```

Resources:

- VPC: `development-vpc`
- Public subnet: used by the bastion host
- Private subnet: used by OpenSearch and Firehose VPC ENIs
- Internet Gateway
- Public route table
- No NAT Gateway by default

Why no NAT Gateway:

- NAT Gateways are one of the largest costs in a small AWS demo.
- The OpenSearch domain and Firehose ENIs do not require private subnet outbound internet for the basic demo flow.
- The bootstrap Lambda runs inside the VPC and talks privately to OpenSearch.

Security group:

- OpenSearch security group allows HTTPS/443 from the VPC CIDR.
- Bastion security group allows SSH only from `dashboard_bastion_allowed_ssh_cidrs`.

## 5. Core Data Flow

### 5.1 CloudTrail Flow

CloudTrail captures AWS API activity and writes to CloudWatch Logs.

```text
CloudTrail -> CloudWatch Logs -> Subscription Filter -> Firehose -> Lambda -> OpenSearch
```

Resources:

- `aws_cloudtrail.this`
- `aws_cloudwatch_log_group.cloudtrail_source`
- `aws_cloudwatch_log_subscription_filter.cloudtrail_to_firehose_created`
- `module.firehose_stream`
- `module.firehose_transformer`
- `module.opensearch`

CloudTrail settings in the low-cost profile:

- Single-region trail
- Global service events disabled
- Log file validation disabled
- S3 archive enabled
- CloudWatch Logs delivery enabled

### 5.2 GuardDuty Flow

GuardDuty is enabled and findings are sent into the same SIEM ingestion path.

```text
GuardDuty Finding -> EventBridge -> CloudWatch Logs -> Subscription Filter -> Firehose -> Lambda -> OpenSearch
```

Resources:

- `aws_guardduty_detector.siem`
- `aws_cloudwatch_event_rule.guardduty_findings`
- `aws_cloudwatch_event_target.guardduty_findings_log_group`
- `aws_cloudwatch_log_group.guardduty_findings`
- `aws_cloudwatch_log_subscription_filter.guardduty_to_firehose`

### 5.3 Security Hub Flow

Security Hub findings are captured with EventBridge and sent into the SIEM path.

```text
Security Hub Finding -> EventBridge -> CloudWatch Logs -> Subscription Filter -> Firehose -> Lambda -> OpenSearch
```

Resources:

- `aws_securityhub_account.siem`
- `aws_cloudwatch_event_rule.securityhub_findings`
- `aws_cloudwatch_event_target.securityhub_findings_log_group`
- `aws_cloudwatch_log_group.securityhub_findings`
- `aws_cloudwatch_log_subscription_filter.securityhub_to_firehose`

### 5.4 VPC Flow Logs Flow

The VPC emits flow logs to CloudWatch Logs. Those records are then sent through Firehose.

```text
VPC Flow Logs -> CloudWatch Logs -> Subscription Filter -> Firehose -> Lambda -> OpenSearch
```

Resources:

- `aws_flow_log.siem_vpc`
- `aws_cloudwatch_log_group.vpc_flow_logs`
- `aws_iam_role.vpc_flow_logs`
- `aws_iam_role_policy.vpc_flow_logs`
- `aws_cloudwatch_log_subscription_filter.vpc_flow_logs_to_firehose`

## 6. Firehose Delivery Stream

Module:

```text
infra/modules/firehose-stream
```

Purpose:

- Accept CloudWatch Logs subscription events.
- Invoke the Lambda transformer.
- Deliver transformed JSON documents to OpenSearch.
- Backup failed documents to S3.
- Publish Firehose delivery logs to CloudWatch.

Important configuration:

- Destination: OpenSearch
- Index name: `siem-events`
- S3 backup mode: failed documents only
- Processing: Lambda processor enabled
- VPC config: Firehose ENIs are placed in selected private subnets
- CloudWatch logging: enabled

IAM role:

`development-firehose-stream-role`

Permissions:

- Write to OpenSearch domain
- Write failed records to backup S3 bucket
- Invoke Lambda transformer
- Write Firehose delivery logs to CloudWatch
- Use KMS only when a KMS key is configured

## 7. Lambda Transformer

Module:

```text
infra/modules/firehose
```

Source:

```text
infra/modules/firehose/src/index.py
```

Purpose:

- Decode base64 Firehose records.
- Decompress CloudWatch Logs gzip payloads.
- Parse individual log events.
- Normalize CloudTrail events.
- Normalize GuardDuty and Security Hub EventBridge events.
- Parse VPC Flow Log text records.
- Emit OpenSearch-compatible JSON documents.

Important normalized fields:

- `@timestamp`
- `event.dataset`
- `event.module`
- `cloud.provider`
- `cloud.account.id`
- `datasets`
- `severities`
- `event_names`
- `event_sources`
- `event_regions`
- `source_ip_addresses`
- `destination_ip_addresses`
- `user_names`
- `identity_types`
- `error_codes`
- `primary_event`
- `events`

IAM role:

Lambda execution role from the Firehose module.

Permissions:

- Write logs to the Lambda CloudWatch log group.

## 8. OpenSearch Domain

Module:

```text
infra/modules/opensearch
```

Purpose:

- Host private OpenSearch domain.
- Enable HTTPS.
- Enable node-to-node encryption.
- Enable at-rest encryption.
- Enable fine-grained access control with an internal master user.
- Place the domain in private subnets.

Practice sizing:

- 1 data node
- `t3.small.search`
- 10 GiB gp3 EBS
- Single AZ
- No OpenSearch service log publishing by default

Primary index:

```text
siem-events*
```

Supporting indices:

```text
security-signals*
incident-cases*
```

## 9. OpenSearch Bootstrap

Source:

```text
infra/opensearch/vpc_bootstrap_lambda.py
```

Terraform resources:

- `aws_lambda_function.opensearch_bootstrap`
- `aws_cloudwatch_log_group.opensearch_bootstrap`
- `aws_iam_role.opensearch_bootstrap`
- `aws_iam_role_policy.opensearch_bootstrap`
- `terraform_data.opensearch_bootstrap`

What it does:

- Checks OpenSearch cluster health.
- Creates Firehose ingestion role inside OpenSearch Security.
- Maps the Firehose IAM role to the OpenSearch ingest role.
- Creates SOC roles inside OpenSearch Security:
  - `soc_analyst`
  - `incident_responder`
  - `siem_admin`
- Maps AWS IAM SOC roles to OpenSearch backend roles.
- Creates ingest pipeline `aws-siem-enrichment`.
- Creates ISM policy `siem-practice-hot`.
- Creates index template `siem-events`.
- Creates index template `security-signals`.
- Creates aliases:
  - `siem-events`
  - `security-signals`
  - `incident-cases`
- Creates Dashboards data view for `siem-events*`.
- Seeds detection documents into `security-signals`.

Why this Lambda exists:

OpenSearch Security role mappings and Dashboards objects must be created through OpenSearch APIs. Because the OpenSearch endpoint is private, the bootstrap Lambda runs inside the VPC and can reach the domain directly.

## 10. Detection Rules And Alerts

Detection rules are implemented with EventBridge for AWS-native real-time alerting.

Rules:

- `development-detect-root-activity`
- `development-detect-iam-changes`
- `development-detect-cloudtrail-changes`
- `development-detect-guardduty-findings`

Alert destinations:

- SNS topic: `development-siem-alerts`
- SQS queue: `development-siem-incidents`

SNS is for notification fanout. SQS is for incident workflow and triage demonstrations.

Optional email subscriptions:

Set this in `terraform.tfvars`:

```hcl
siem_alert_email_endpoints = ["you@example.com"]
```

AWS sends a confirmation email. The subscription does not become active until confirmed.

## 11. SOC Dashboard

Terraform creates:

```text
development-soc-operations
```

Type:

```text
AWS CloudWatch dashboard
```

Dashboard widgets:

- Firehose delivery to OpenSearch
- Lambda transformer errors, invocations, and duration
- GuardDuty findings ingested
- Security Hub findings ingested
- SQS incident queue depth

This dashboard is for pipeline health and SOC operations. OpenSearch Dashboards remains the investigation/search interface.

## 12. IAM Roles In The Project

### 12.1 CloudTrail To CloudWatch Role

Resource:

```text
aws_iam_role.cloudtrail_to_cloudwatch
aws_iam_role_policy.cloudtrail_to_cloudwatch
```

Purpose:

Allows CloudTrail to write events into the CloudWatch log group.

Trusted service:

```text
cloudtrail.amazonaws.com
```

Key permissions:

- `logs:CreateLogStream`
- `logs:PutLogEvents`

### 12.2 CloudWatch Logs To Firehose Role

Resource:

```text
aws_iam_role.cloudwatch_logs_to_firehose
aws_iam_role_policy.cloudwatch_logs_to_firehose
```

Purpose:

Allows CloudWatch Logs subscription filters to put records into Firehose.

Trusted service:

```text
logs.us-east-1.amazonaws.com
```

Key permissions:

- `firehose:PutRecord`
- `firehose:PutRecordBatch`

### 12.3 Firehose Stream Role

Resource:

```text
module.firehose_stream.aws_iam_role.firehose_stream
module.firehose_stream.aws_iam_role_policy.*
```

Purpose:

Allows Firehose to deliver transformed events to OpenSearch, invoke Lambda, log delivery status, and write failed records to S3.

Trusted service:

```text
firehose.amazonaws.com
```

Key permissions:

- `es:ESHttp*`
- `lambda:InvokeFunction`
- `s3:PutObject`
- `s3:AbortMultipartUpload`
- `logs:PutLogEvents`

### 12.4 Lambda Transformer Role

Resource:

```text
module.firehose_transformer.aws_iam_role.lambda
module.firehose_transformer.aws_iam_role_policy.lambda
```

Purpose:

Allows the transformer Lambda to write logs.

Trusted service:

```text
lambda.amazonaws.com
```

Key permissions:

- `logs:CreateLogStream`
- `logs:PutLogEvents`

### 12.5 OpenSearch Bootstrap Lambda Role

Resource:

```text
aws_iam_role.opensearch_bootstrap
aws_iam_role_policy.opensearch_bootstrap
```

Purpose:

Allows the bootstrap Lambda to run in the VPC and write logs.

Trusted service:

```text
lambda.amazonaws.com
```

Key permissions:

- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `ec2:CreateNetworkInterface`
- `ec2:DescribeNetworkInterfaces`
- `ec2:DescribeSubnets`
- `ec2:DeleteNetworkInterface`
- `ec2:AssignPrivateIpAddresses`
- `ec2:UnassignPrivateIpAddresses`

### 12.6 VPC Flow Logs Role

Resource:

```text
aws_iam_role.vpc_flow_logs
aws_iam_role_policy.vpc_flow_logs
```

Purpose:

Allows VPC Flow Logs to publish records to CloudWatch Logs.

Trusted service:

```text
vpc-flow-logs.amazonaws.com
```

Key permissions:

- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `logs:DescribeLogGroups`
- `logs:DescribeLogStreams`

### 12.7 OpenSearch Logs Role

Resource:

```text
aws_iam_role.opensearch_logs
aws_iam_role_policy.opensearch_logs
```

Purpose:

Used when OpenSearch service log publishing is enabled.

Trusted service:

```text
es.amazonaws.com
```

Key permissions:

- `logs:PutLogEventsBatch`
- `logs:CreateLogStream`
- `logs:CreateLogGroup`

In the current low-cost profile, OpenSearch service log publishing is disabled.

### 12.8 SOC Analyst Role

Resource:

```text
aws_iam_role.soc_analyst
aws_iam_role_policy.soc_analyst
```

Purpose:

Read-only SOC investigation role.

Key permissions:

- Read/search OpenSearch HTTP access
- Read CloudWatch logs
- Read SQS queue attributes

OpenSearch role mapping:

```text
AWS role -> OpenSearch role soc_analyst
```

### 12.9 Incident Responder Role

Resource:

```text
aws_iam_role.incident_responder
aws_iam_role_policy.incident_responder
```

Purpose:

Allows incident responders to search SIEM data, update incident/signal indices, and process incident queue messages.

Key permissions:

- Read/write OpenSearch HTTP access for SIEM response data
- Receive and delete SQS incident messages

OpenSearch role mapping:

```text
AWS role -> OpenSearch role incident_responder
```

### 12.10 SIEM Admin Role

Resource:

```text
aws_iam_role.siem_admin
aws_iam_role_policy.siem_admin
```

Purpose:

Administrative role for SIEM configuration and OpenSearch administration.

Key permissions:

- `es:ESHttp*`
- CloudWatch read access
- SQS administrative access

OpenSearch role mapping:

```text
AWS role -> OpenSearch role siem_admin
```

## 13. S3 Buckets

### 13.1 Log Archive Bucket

Name pattern:

```text
development-log-archive-<account-id>-us-east-1
```

Purpose:

Stores CloudTrail archive files.

Current settings:

- Server-side encryption enabled
- Public access block enabled
- Versioning disabled in practice profile
- No lifecycle retention rule in practice profile

### 13.2 Firehose Backup Bucket

Name pattern:

```text
development-firehose-backup-<account-id>-us-east-1
```

Purpose:

Stores failed Firehose delivery records for troubleshooting.

Current settings:

- Server-side encryption enabled
- Public access block enabled
- Versioning disabled
- No lifecycle retention rule in practice profile

## 14. OpenSearch Index Model

Primary alias:

```text
siem-events
```

Primary index pattern:

```text
siem-events*
```

Supporting aliases:

```text
security-signals
incident-cases
```

Fields useful in Dashboards:

- `@timestamp`
- `event.dataset`
- `datasets`
- `event_names`
- `event_sources`
- `event_regions`
- `source_ip_addresses`
- `destination_ip_addresses`
- `user_names`
- `identity_types`
- `error_codes`
- `severities`
- `primary_event`
- `events`

Expected datasets:

- `aws.cloudtrail`
- `aws.guardduty`
- `aws.securityhub`
- `aws.vpcflow`

## 15. Deployment Procedure

From the repo root:

```bash
cd "/home/persoba/v-projects/DL-intership/Security (Copy)/infra"
terraform -chdir=envs/development init
terraform -chdir=envs/development validate
terraform -chdir=envs/development plan
terraform -chdir=envs/development apply
```

Save outputs:

```bash
terraform -chdir=envs/development output
terraform -chdir=envs/development output -raw dashboard_bastion_public_dns
terraform -chdir=envs/development output -raw opensearch_vpc_endpoint
terraform -chdir=envs/development output -raw opensearch_dashboards_vpc_endpoint
```

## 16. Dashboard Access Procedure

Create an SSH tunnel through the bastion:

```bash
cd "/home/persoba/v-projects/DL-intership/Security (Copy)/infra"

OPENSEARCH_ENDPOINT="$(terraform -chdir=envs/development output -raw opensearch_vpc_endpoint)"
BASTION_DNS="$(terraform -chdir=envs/development output -raw dashboard_bastion_public_dns)"

ssh -i /home/persoba/.ssh/siem-key.pem \
  -o StrictHostKeyChecking=accept-new \
  -N \
  -L 8443:${OPENSEARCH_ENDPOINT}:443 \
  ec2-user@${BASTION_DNS}
```

Open:

```text
https://localhost:8443/_dashboards/
```

Login using:

- Username: value of `opensearch_master_username`
- Password: value of `opensearch_master_password`

In Dashboards:

1. Go to Discover.
2. Select the `siem-events*` data view.
3. Set time range to “Last 24 hours” or wider.
4. Search/filter on fields such as `datasets`, `event_names`, `source_ip_addresses`, or `user_names`.

## 17. Verification Checklist

### 17.1 AWS Resource Checks

```bash
aws opensearch describe-domain \
  --domain-name development-siem \
  --region us-east-1 \
  --query 'DomainStatus.{Processing:Processing,Created:Created,Endpoint:Endpoint,VPCOptions:VPCOptions}'

aws firehose describe-delivery-stream \
  --delivery-stream-name development-cloudtrail-firehose-stream \
  --region us-east-1 \
  --query 'DeliveryStreamDescription.DeliveryStreamStatus'

aws cloudtrail get-trail-status \
  --name development-security-trail \
  --region us-east-1
```

### 17.2 Generate Test Events

```bash
aws sts get-caller-identity --region us-east-1
aws s3 ls --region us-east-1
aws iam list-users --region us-east-1
aws cloudtrail describe-trails --region us-east-1
```

### 17.3 Check Transformer Logs

```bash
aws logs tail /aws/lambda/development-firehose-transformer \
  --region us-east-1 \
  --since 15m
```

Look for:

```text
"result": "Ok"
"transformed_document_count": 1
```

### 17.4 Check Firehose Delivery Metrics

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

### 17.5 Check Subscriptions

```bash
aws logs describe-subscription-filters \
  --log-group-name /aws/cloudtrail/organization \
  --region us-east-1

aws logs describe-subscription-filters \
  --log-group-name /aws/events/development/guardduty-findings \
  --region us-east-1

aws logs describe-subscription-filters \
  --log-group-name /aws/events/development/securityhub-findings \
  --region us-east-1

aws logs describe-subscription-filters \
  --log-group-name /aws/vpc-flow-logs/development/siem \
  --region us-east-1
```

### 17.6 Check Incident Queue

```bash
aws sqs get-queue-attributes \
  --queue-url "$(terraform -chdir=envs/development output -raw siem_incident_queue_url)" \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1
```

## 18. How The Code Fits Together

Terraform creates AWS infrastructure first:

1. VPC, subnets, security groups, and bastion.
2. S3 buckets and policies.
3. CloudWatch log groups.
4. IAM roles and policies.
5. OpenSearch domain.
6. Lambda transformer.
7. Firehose stream.
8. CloudTrail, GuardDuty, Security Hub, and VPC Flow Logs sources.
9. Subscription filters into Firehose.
10. Detection rules, alert topic, incident queue, and SOC dashboard.
11. Bootstrap Lambda invocation.

The bootstrap Lambda runs after OpenSearch and Firehose exist. It needs the Firehose role ARN so it can map that IAM role into OpenSearch Security. Without that mapping, Firehose can reach the domain but OpenSearch rejects writes.

The Firehose Lambda transformer is shared by all CloudWatch Logs sources. It inspects the log group and event shape to determine whether data is CloudTrail, GuardDuty, Security Hub, VPC Flow Logs, or generic AWS event data.

## 19. Important Operational Notes

### OpenSearch Endpoint Is Private

The OpenSearch endpoint will not open directly from the public internet. Use the bastion tunnel, VPN, or another internal access method.

### Browser Certificate Warning Is Expected

When accessing `https://localhost:8443/_dashboards/`, the TLS certificate belongs to the OpenSearch hostname, not `localhost`.

### GuardDuty And Security Hub May Need Time

GuardDuty and Security Hub findings only appear when findings are generated or imported. The infrastructure path can be working even if no findings exist yet.

### VPC Flow Logs Need Traffic

VPC Flow Logs require network traffic in the VPC. The bastion SSH traffic and OpenSearch/Firehose VPC activity can generate records.

### SQS Is A Workflow Queue, Not A Case Management Product

The incident queue is a simple enterprise-style workflow primitive. A production system would normally integrate this with Jira, ServiceNow, PagerDuty, Slack, Teams, Lambda automation, or a SOAR platform.

## 20. Destroy Procedure

Destroy when finished:

```bash
cd "/home/persoba/v-projects/DL-intership/Security (Copy)/infra"
terraform -chdir=envs/development destroy
```

If S3 bucket deletion fails because buckets contain objects:

```bash
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
aws s3 rm "s3://development-log-archive-${ACCOUNT_ID}-us-east-1" --recursive
aws s3 rm "s3://development-firehose-backup-${ACCOUNT_ID}-us-east-1" --recursive
terraform -chdir=envs/development destroy
```

If security group deletion waits after Lambda deletion, check for Lambda ENIs:

```bash
aws ec2 describe-network-interfaces \
  --region us-east-1 \
  --filters Name=description,Values='AWS Lambda VPC ENI*' \
  --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Status:Status,Description:Description}'
```

Usually AWS releases them automatically after a short wait.

## 21. Production Gaps And Future Improvements

This stack demonstrates SIEM architecture, but production would need more:

- Multi-AZ OpenSearch with at least two or three data nodes
- NAT Gateway or VPC endpoints where needed
- Customer-managed KMS keys with rotation
- Longer CloudWatch and S3 retention
- OpenSearch snapshots and restore testing
- OpenSearch alerting plugin monitors for index-based detections
- Real SOC dashboards saved in OpenSearch Dashboards
- Centralized identity federation for SOC roles
- Slack, Teams, PagerDuty, or ticketing integration
- Additional sources such as Route 53 Resolver logs, ALB logs, EKS audit logs, AWS Config, and IAM Access Analyzer
- Better data normalization to ECS or OCSF
- CI/CD pipeline and remote Terraform state locking

## 22. Summary

The project now deploys a working AWS SIEM practice environment. It collects cloud security telemetry, normalizes it, indexes it into OpenSearch, provides dashboard access, creates detection and alerting paths, supports a simple incident workflow, and defines least-privilege SOC roles. It is intentionally low-cost and short-lived, but the architecture maps directly to enterprise SIEM concepts.

