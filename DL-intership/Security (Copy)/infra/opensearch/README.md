# OpenSearch SIEM Configuration

This directory contains the OpenSearch-side configuration that sits on top of the Terraform infrastructure in `../envs/development`.

## Contents

- `index-templates/cloudtrail-logs.json`: mappings and index defaults for CloudTrail batches delivered by Firehose.
- `ism-policies/siem-hot-warm-delete.json`: OpenSearch ISM policy for rollover, warm retention, and deletion.
- `ingest-pipelines/cloudtrail-enrichment.json`: basic normalization pipeline for SIEM dashboards and alerting.
- `security/roles.json`: starter OpenSearch Security roles for analysts and SIEM administrators.
- `bootstrap.sh`: idempotent helper that applies the policy, pipeline, template, and initial rollover index.

## Deploy

Provision the AWS layer first:

```bash
cd ../envs/development
terraform init
terraform apply
```

Apply OpenSearch configuration from a host that can reach the private domain endpoint:

```bash
cd ../../opensearch
export OPENSEARCH_URL="https://$(terraform -chdir=../envs/development output -raw opensearch_vpc_endpoint)"
export OPENSEARCH_USERNAME="admin"
export OPENSEARCH_PASSWORD="<master-password>"
./bootstrap.sh
```

Apply roles manually through the OpenSearch Security API or Dashboards Security UI:

```bash
curl -u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" \
  -H "Content-Type: application/json" \
  -X PUT "$OPENSEARCH_URL/_plugins/_security/api/roles/security_analyst" \
  -d @<(jq '.security_analyst' security/roles.json)

curl -u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" \
  -H "Content-Type: application/json" \
  -X PUT "$OPENSEARCH_URL/_plugins/_security/api/roles/siem_admin" \
  -d @<(jq '.siem_admin' security/roles.json)
```

## Verify

```bash
curl -u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" "$OPENSEARCH_URL/_cluster/health?pretty"
curl -u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" "$OPENSEARCH_URL/_index_template/cloudtrail-logs?pretty"
curl -u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" "$OPENSEARCH_URL/_plugins/_ism/policies/siem-hot-warm-delete?pretty"
curl -u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" "$OPENSEARCH_URL/cloudtrail-logs*/_search?size=1&pretty"
```

## Enterprise Notes

- Keep the OpenSearch endpoint private and access Dashboards through VPN, SSM port forwarding, or a controlled bastion.
- Replace the development master password with a Secrets Manager sourced value before production use.
- Use at least three data nodes and three private subnets for production; the current development environment intentionally uses two smaller data nodes.
- CloudWatch audit logs retain 365 days; application logs retain 90 days; slow logs retain 30 days.
- The Firehose transformer exposes searchable top-level fields for common SIEM filters while preserving original CloudTrail events under `events`.
