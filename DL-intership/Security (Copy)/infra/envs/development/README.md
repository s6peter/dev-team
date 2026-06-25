#no repo guardrails




# Development OpenSearch Environment

This environment deploys the development OpenSearch security logging stack with Terraform.

Terraform is run from:

`/home/persoba/Documents/Security/infra/envs/development`

## Structure

- `main.tf` - environment resources and module wiring
- `variables.tf` - variable declarations
- `terraform.tfvars` - environment-specific values, including existing network inputs
- `providers.tf` - AWS provider configuration
- `backend.tf` - Terraform state backend
- `outputs.tf` - useful deployment outputs

## Deployment

```bash
terraform init
terraform plan -var-file terraform.tfvars
terraform apply -var-file terraform.tfvars
```

## Network Prerequisites

This environment uses an existing VPC and existing private subnets instead of creating a new network. The network values must be supplied in `terraform.tfvars`.

Required inputs include:

- `existing_vpc_id`
- `existing_vpc_cidr_block`
- `existing_private_subnet_ids`

These values tell Terraform which existing AWS network to use for the OpenSearch domain and related resources.

## Resources Created

This deployment creates and configures:

- OpenSearch domain
- OpenSearch security group
- KMS keys for encryption
- CloudWatch log groups
- S3 log archive bucket
- S3 Firehose backup bucket
- Kinesis Data Firehose delivery stream
- Lambda transformer function
- CloudTrail trail and log forwarding resources
- GuardDuty and Security Hub event ingestion hooks
- VPC Flow Logs ingestion
- EventBridge detection rules, SNS alerts, and SQS incident queue
- CloudWatch SOC operations dashboard
- Least-privilege SOC analyst, incident responder, and SIEM admin IAM roles
- OpenSearch SIEM index template, ISM policy, role mappings, and detection seed data

## Personal Account Cost Profile

The development defaults are intentionally sized for a short-lived personal demo, not production:

- 1 public subnet and 1 private subnet in a single AZ
- No NAT gateway
- 1 OpenSearch `t3.small.search` node with 10 GiB gp3 storage
- No customer-managed KMS keys by default
- OpenSearch service log publishing disabled by default
- No explicit CloudWatch or S3 retention rules; destroy the stack after practice
- Single-region CloudTrail with global service events and log validation disabled
- `t3.nano` dashboard bastion with an 8 GiB root volume

Enterprise-style SIEM features are enabled in this practice profile, but they are wired for demonstration rather than long retention. GuardDuty, Security Hub, VPC Flow Logs, EventBridge rules, SNS, SQS, and extra CloudWatch log ingestion can add usage-based charges while the stack is running.

The biggest remaining hourly cost is the OpenSearch domain. For the lowest bill, destroy the stack when the demo is finished:

```bash
terraform destroy
```

For production or a team environment, raise the OpenSearch node count, use multiple AZs, enable customer-managed KMS keys, enable OpenSearch log publishing, and restore longer log retention.

## What The Resources Do

- **OpenSearch domain**  
  Stores and indexes security and audit logs for search and analysis.

- **OpenSearch security group**  
  Restricts access to the domain to approved internal network ranges.

- **KMS keys**  
  Encrypt OpenSearch and related logging data at rest.

- **CloudWatch Logs**  
  Receives service logs and acts as part of the ingestion pipeline.

- **S3 log archive bucket**  
  Stores CloudTrail archive data.

- **S3 Firehose backup bucket**  
  Stores Firehose backup and failed-delivery records.

- **Firehose delivery stream**  
  Buffers and delivers logs into OpenSearch.

- **Lambda transformer**  
  Transforms incoming records into a format OpenSearch can index.

- **CloudTrail**  
  Captures AWS API activity and sends it into the logging pipeline.

## Log Flow

The primary CloudTrail ingestion path is:

`CloudTrail -> CloudWatch Logs -> Firehose -> Lambda transform -> OpenSearch siem-events*`

Additional SIEM telemetry paths are:

- `GuardDuty -> EventBridge -> CloudWatch Logs -> Firehose -> Lambda transform -> OpenSearch siem-events*`
- `Security Hub -> EventBridge -> CloudWatch Logs -> Firehose -> Lambda transform -> OpenSearch siem-events*`
- `VPC Flow Logs -> CloudWatch Logs -> Firehose -> Lambda transform -> OpenSearch siem-events*`

Detection and incident workflow:

- EventBridge detects root activity, IAM changes, CloudTrail changes, and GuardDuty findings.
- Detection events publish to the SIEM SNS topic.
- Detection events are also copied into the SIEM SQS incident queue for triage workflow demonstrations.
- OpenSearch bootstrap creates `security-signals*` and `incident-cases*` index aliases with seed detection documents.
- CloudWatch dashboard `${environment}-soc-operations` shows Firehose delivery, Lambda transformer health, finding ingestion, and incident queue depth.

SOC access model:

- `development-soc-analyst-role`: read/search access for SIEM indices and read-only supporting AWS logs.
- `development-incident-responder-role`: SIEM read/write access for signals/incidents and SQS incident queue processing.
- `development-siem-admin-role`: administrative OpenSearch HTTP access for the SIEM domain.

## Internal Access

The OpenSearch domain is deployed into private subnets and is not publicly reachable.

To access OpenSearch Dashboards from outside the VPC without SSM, use a bastion EC2 instance in the same VPC and create an SSH local port forward:

```bash
ssh -i ~/.ssh/siem-key.pem -L 9200:<opensearch-vpc-endpoint>:443 ec2-user@<bastion-public-ip>
```

Then open:

```text
https://localhost:9200/_dashboards/
```

Note:

- The SSH key must match the key pair attached to the bastion.
- The bastion must have network connectivity to the private OpenSearch endpoint.
- A browser certificate warning on `localhost` is expected because the certificate is issued for the OpenSearch endpoint hostname, not `localhost`.

## Ticket Requirement Mapping

Ticket:

`Create domain + VPC access + encryption + logs via Terraform.`

Acceptance Criteria:

`Domain reachable internally + security controls verified.`

This environment meets the requirement as follows:

- **Create domain**  
  Terraform creates the OpenSearch domain.

- **VPC access**  
  The domain is deployed into existing private subnets in the target VPC.

- **Encryption**  
  Encryption at rest is enabled with KMS, node-to-node encryption is enabled, and HTTPS/TLS is enforced.

- **Logs via Terraform**  
  Terraform provisions CloudTrail, CloudWatch Logs, Firehose, Lambda, S3, and supporting log-ingestion resources.

- **Domain reachable internally**  
  Verified by accessing the VPC-only Dashboards endpoint through a bastion host inside the VPC.

- **Security controls verified**  
  Verified through private subnet placement, security group restrictions, encryption, HTTPS enforcement, authentication, and audit/log configuration.

## Post-Deployment Note

OpenSearch role mapping for Firehose access is handled as a manual post-deployment activity in this environment. Without this step, Firehose can process records but OpenSearch will reject writes and the `cloudtrail-logs*` index will not appear.

Map the Firehose IAM role into OpenSearch by connecting through the bastion host and updating the OpenSearch Security API:

```bash
ssh -i ~/.ssh/siem-key.pem ec2-user@<bastion-public-ip>

curl -sk -X PUT \
  -u '<opensearch-admin-username>:<opensearch-admin-password>' \
  -H 'Content-Type: application/json' \
  https://<opensearch-vpc-endpoint>/_plugins/_security/api/rolesmapping/all_access \
  -d '{
    "backend_roles": [
      "arn:aws:iam::<account-id>:role/development-firehose-stream-role"
    ],
    "users": ["admin"],
    "hosts": []
  }'
```

Example with the current development environment values:

```bash
ssh -i ~/.ssh/siem-key.pem ec2-user@3.85.18.146

curl -sk -X PUT \
  -u 'admin:ChangeMeNow1!' \
  -H 'Content-Type: application/json' \
  https://vpc-development-siem-nqmu4b5f64dqhmiobqkybvozha.us-east-1.es.amazonaws.com/_plugins/_security/api/rolesmapping/all_access \
  -d '{
    "backend_roles": [
      "arn:aws:iam::152617279670:role/development-firehose-stream-role"
    ],
    "users": ["admin"],
    "hosts": []
  }'
```

To verify the mapping:

```bash
curl -sk \
  -u '<opensearch-admin-username>:<opensearch-admin-password>' \
  https://<opensearch-vpc-endpoint>/_plugins/_security/api/rolesmapping/all_access
```

After the mapping is applied, wait briefly for Firehose retries and then confirm the index exists:

```bash
curl -sk \
  -u '<opensearch-admin-username>:<opensearch-admin-password>' \
  https://<opensearch-vpc-endpoint>/_cat/indices?v
```
