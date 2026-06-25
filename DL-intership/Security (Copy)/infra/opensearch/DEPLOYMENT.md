# Deployment & Configuration Guide

## Prerequisites

**Infrastructure (User story [#693](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/us/693?milestone=505535) / ticket [#694](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/task/694)):**
- [COMPLETE] OpenSearch domain deployed via Terraform (see `/infra/envs/development/terraform apply`)
- [COMPLETE] Domain reachable on private subnet (test: `curl https://opensearch-dev:9200/_cluster/health`)
- [COMPLETE] Master credentials configured in `terraform.tfvars`

**Configuration Requirements:**
- Kibana access with admin privileges
- AWS CloudTrail enabled and sending logs to S3 or OpenSearch
- Ingest role created (`aws_iam_role.opensearch_logs` exists)

## Ticket Context

**This guide covers Ticket #712** (dashboards & data configurations)

**Completed prerequisite: User story [#693](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/us/693?milestone=505535)/ticket [#694](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/task/694)** (infrastructure foundation)
- OpenSearch domain with VPC isolation [COMPLETE]
- Customer-managed KMS encryption (at rest + in transit) [COMPLETE]
- CloudWatch audit logging enabled [COMPLETE]
- Least-privilege IAM + security groups [COMPLETE]
- See: `/infra/modules/opensearch/` and `/infra/envs/development/main.tf`

**Deployment sequence:**
1. Deploy infrastructure (Terraform) — deliverable from user story [#693](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/us/693?milestone=505535) and ticket [#694](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/task/694)
2. Deploy dashboards (this guide) — #712 deliverable
3. Ingest CloudTrail/security data → indices automatically created
4. Verify dashboards show data → ready for analyst use

## Enterprise Deployment Path

The Terraform stack now deploys the AWS control plane pieces for a private SIEM:

- VPC-only OpenSearch domain with KMS encryption, fine-grained access control, HTTPS, node-to-node encryption, off-peak maintenance, automated service software updates, and automated snapshots.
- CloudWatch audit, application, index slow, and search slow log groups with an OpenSearch resource policy.
- CloudTrail to CloudWatch Logs to Firehose ingestion with S3 failed-record backup.
- Firehose Lambda transformation that preserves raw CloudTrail records and exposes top-level fields for analyst filtering.

Run this first:

```bash
cd ../envs/development
terraform init
terraform validate
terraform apply
```

Then apply the OpenSearch-side SIEM assets:

```bash
cd ../../opensearch
export OPENSEARCH_URL="https://$(terraform -chdir=../envs/development output -raw opensearch_vpc_endpoint)"
export OPENSEARCH_USERNAME="admin"
export OPENSEARCH_PASSWORD="<master-password>"
./bootstrap.sh
```

## Step-by-Step Deployment

### 1. Create Index Templates (Required)

Templates define field mappings and settings before data arrives.

**Via Kibana Dev Tools:**
```
# Navigate to: Management → Dev Tools → Console
# Copy/paste contents of index-templates/cloudtrail-logs.json

PUT _index_template/cloudtrail-logs
{
  "index_patterns": ["cloudtrail-logs*"],
  "template": { ... }
}
```

**Or via curl:**
```bash
curl -X PUT "$OPENSEARCH_URL/_index_template/cloudtrail-logs" \
  -H 'Content-Type: application/json' \
  -d @index-templates/cloudtrail-logs.json
```

### 2. Create Ingest Pipeline

Enriches CloudTrail events with geolocation and threat metadata.

**Via Kibana Dev Tools:**
```
PUT _ingest/pipeline/cloudtrail-enrichment
{
  "description": "...",
  "processors": [ ... ]
}
```

Use when configuring CloudTrail ingestion:
```
PUT cloudtrail-*/_settings
{
  "index": {
    "default_pipeline": "cloudtrail-enrichment"
  }
}
```

### 3. Create Index State Management Policy

Manages index rotation and retention (hot → warm → delete). OpenSearch uses ISM rather than Elasticsearch ILM.

**Via Kibana Dev Tools:**
```
PUT _plugins/_ism/policies/siem-hot-warm-delete
{
  "policy": { ... }
}
```

**Attach to template:**
```
PUT _index_template/cloudtrail
{
  "index_patterns": ["cloudtrail-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "siem-retention",
      "index.lifecycle.rollover_alias": "cloudtrail"
    }
  }
}
```

### 4. Create Initial Indexes

**Via Kibana Dev Tools:**
```
# Create with rollover alias
PUT cloudtrail-logs-000001
{
  "aliases": {
    "cloudtrail-logs": {
      "is_write_index": true
    }
  }
}
```

### 5. Configure CloudTrail → OpenSearch

**In AWS Console:**
1. Go to CloudTrail → S3 bucket → SNS topic
2. Configure Lambda or Filebeat to forward logs to OpenSearch
3. Point to ingestion endpoint with pipeline reference

**Example Filebeat config:**
```yaml
# filebeat.yml
filebeat.inputs:
  - type: s3
    enabled: true
    bucket_name: cloudtrail-logs
    paths: ["AWSLogs/*"]

output.elasticsearch:
  hosts: ["opensearch-dev.security-siem:9200"]
  pipeline: cloudtrail-enrichment
  ssl.verification_mode: full
  auth.username: filebeat_user
  auth.password: ${FILEBEAT_PASSWORD}

```

### 6. Create Dashboards

**Via Kibana UI:**
Create an index pattern for `cloudtrail-logs*`, then build dashboards around:

- `event_names`
- `event_sources`
- `event_regions`
- `user_names`
- `identity_types`
- `source_ip_addresses`
- `error_codes`
- `primary_event`
- nested `events`

### 7. Import Saved Searches

**Via Kibana UI:**
1. Stack Management → Saved Objects → Import
2. Select saved-searches/*.json files

**Verify searches:**
- Kibana Discover → Saved searches selector
- All 4 searches should appear (unauthorized-api-calls, root-account-activity, etc.)

### 8. Test Data Flow

**Send test event:**
```bash
curl -X POST "localhost:9200/cloudtrail-2026.03.16-000001/_doc?pipeline=cloudtrail-enrichment" \
  -H 'Content-Type: application/json' \
  -d '{
    "eventName": "PutBucketPolicy",
    "eventSource": "s3.amazonaws.com",
    "sourceIPAddress": "203.0.113.42",
    "userIdentity": {"userName": "test-user", "principalId": "AIDACKCEVSQ6C2EXAMPLE"},
    "@timestamp": "2026-03-16T10:30:00Z"
  }'
```

**Verify in dashboard:**
- Open: Cloudtrail Activity Overview dashboard
- Should see event in "Recent activity" panel within 10 seconds

## Role-Based Access Control

### Kibana Roles (Configure in Management → Security)

**security-analyst**
- Can view: security-signals, cloudtrail-activity dashboards + searches
- Cannot view: compliance-audit

**compliance-auditor**
- Can view: compliance-audit dashboard + audit searches
- Cannot view: security-signals (raw data)

**siem-admin**
- Full access to all dashboards and configuration

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| "No indices found" in dashboard | Verify index templates applied and first document ingested |
| "Field not found" errors | Check index mapping matches document structure |
| Slow searches | Check ILM policy is moving warm/cold indices appropriately |
| Pipeline errors | Review error.message field in document; adjust processors |

## Operations

### Monitor Dashboard Health
```
GET cloudtrail-*/_stats
GET .ilm-history-*/_search?size=100&sort=[@timestamp]
```

### Manually Rotate Index
```
POST cloudtrail-000001/_rollover
```

### Reindex with New Pipeline
```
POST _reindex
{
  "source": {"index": "cloudtrail-old"},
  "dest": {"index": "cloudtrail-new", "pipeline": "cloudtrail-enrichment"}
}
```

## Acceptance Criteria ([Ticket #712](https://tree.taiga.io/project/engineering_edusuc-devops-easy-learning/us/712?milestone=505535))

- [COMPLETE] Dashboard 1: cloudtrail-activity.json (filters: account, region, user)
- [COMPLETE] Dashboard 2: security-signals.json (severity, status, assignment)
- [COMPLETE] Dashboard 3: compliance-audit.json (30-day evidence trail)
- [COMPLETE] Saved searches: 4 templates for common investigations
- [PENDING] Screenshots: (add after deployment)
- [PENDING] Share links: (add after deployment)

**Next Steps:**
1. Deploy using this guide
2. Document screenshot links in ticket comments
3. Mark ticket #712 as complete
4. Link user story #693 and ticket #694 (infrastructure) for reference
