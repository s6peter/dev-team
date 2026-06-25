import base64
import json
import os
import urllib.error
import urllib.request


def request(method, path, body=None):
    endpoint = os.environ["OPENSEARCH_ENDPOINT"].rstrip("/")
    username = os.environ["OPENSEARCH_USERNAME"]
    password = os.environ["OPENSEARCH_PASSWORD"]
    auth = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    data = None if body is None else json.dumps(body).encode("utf-8")

    req = urllib.request.Request(
        f"https://{endpoint}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "osd-xsrf": "terraform-bootstrap",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            payload = response.read().decode("utf-8")
            return response.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8")
        if exc.code == 400 and "resource_already_exists_exception" in payload:
            return exc.code, {"already_exists": True}
        raise RuntimeError(f"{method} {path} failed with {exc.code}: {payload}") from exc


def best_effort(method, path, body=None):
    try:
        return request(method, path, body)
    except Exception as exc:
        print(json.dumps({"level": "warn", "path": path, "error": str(exc)}))
        return None, {"error": str(exc)}


def handler(event, context):
    firehose_role_arn = os.environ["FIREHOSE_ROLE_ARN"]
    analyst_role_arn = os.environ.get("SOC_ANALYST_ROLE_ARN", "")
    responder_role_arn = os.environ.get("INCIDENT_RESPONDER_ROLE_ARN", "")
    admin_role_arn = os.environ.get("SIEM_ADMIN_ROLE_ARN", "")
    replica_count = int(os.environ.get("OPENSEARCH_REPLICA_COUNT", "0"))

    health_status, health = request("GET", "/_cluster/health")

    role_body = {
        "cluster_permissions": [
            "cluster_composite_ops",
            "cluster_monitor"
        ],
        "index_permissions": [
            {
                "index_patterns": [
                    "siem-events*",
                    "cloudtrail-logs*",
                    "guardduty-findings*",
                    "securityhub-findings*",
                    "vpc-flow-logs*",
                    "security-signals*",
                    "incident-cases*"
                ],
                "allowed_actions": ["indices_all"]
            }
        ],
        "tenant_permissions": []
    }
    request("PUT", "/_plugins/_security/api/roles/firehose_ingest", role_body)

    mapping_body = {
        "backend_roles": [firehose_role_arn],
        "hosts": [],
        "users": []
    }
    request("PUT", "/_plugins/_security/api/rolesmapping/firehose_ingest", mapping_body)

    security_roles = {
        "soc_analyst": {
            "cluster_permissions": ["cluster_composite_ops_ro", "cluster_monitor"],
            "index_permissions": [
                {
                    "index_patterns": ["siem-events*", "cloudtrail-logs*", "guardduty-findings*", "securityhub-findings*", "vpc-flow-logs*", "security-signals*", "incident-cases*"],
                    "allowed_actions": ["read", "search", "indices_monitor"]
                }
            ],
            "tenant_permissions": [
                {"tenant_patterns": ["global_tenant"], "allowed_actions": ["kibana_all_read"]}
            ]
        },
        "incident_responder": {
            "cluster_permissions": ["cluster_composite_ops", "cluster_monitor"],
            "index_permissions": [
                {
                    "index_patterns": ["siem-events*", "security-signals*", "incident-cases*"],
                    "allowed_actions": ["read", "search", "crud", "indices_monitor"]
                }
            ],
            "tenant_permissions": [
                {"tenant_patterns": ["global_tenant"], "allowed_actions": ["kibana_all_read"]}
            ]
        },
        "siem_admin": {
            "cluster_permissions": ["cluster_all"],
            "index_permissions": [
                {
                    "index_patterns": ["siem-events*", "cloudtrail-logs*", "guardduty-findings*", "securityhub-findings*", "vpc-flow-logs*", "security-signals*", "incident-cases*"],
                    "allowed_actions": ["indices_all"]
                }
            ],
            "tenant_permissions": [
                {"tenant_patterns": ["global_tenant"], "allowed_actions": ["kibana_all_write"]}
            ]
        }
    }
    for role_name, body in security_roles.items():
        request("PUT", f"/_plugins/_security/api/roles/{role_name}", body)

    role_mappings = {
        "soc_analyst": [arn for arn in [analyst_role_arn] if arn],
        "incident_responder": [arn for arn in [responder_role_arn] if arn],
        "siem_admin": [arn for arn in [admin_role_arn] if arn],
    }
    for role_name, backend_roles in role_mappings.items():
        if backend_roles:
            request("PUT", f"/_plugins/_security/api/rolesmapping/{role_name}", {
                "backend_roles": backend_roles,
                "hosts": [],
                "users": []
            })

    pipeline_body = {
        "description": "Normalize AWS security telemetry for OpenSearch SIEM dashboards and alerting.",
        "processors": [
            {"set": {"field": "event.module", "value": "aws", "override": False}},
            {"set": {"field": "cloud.provider", "value": "aws", "override": False}}
        ],
        "on_failure": [
            {"set": {"field": "ingest.failure_message", "value": "{{ _ingest.on_failure_message }}"}}
        ]
    }
    request("PUT", "/_ingest/pipeline/aws-siem-enrichment", pipeline_body)

    ism_policy = {
        "policy": {
            "description": "Practice SIEM index lifecycle. Hot searchable data while the environment exists; destroy Terraform after practice.",
            "default_state": "hot",
            "states": [
                {
                    "name": "hot",
                    "actions": [
                        {"rollover": {"min_index_age": "1d", "min_size": "30gb"}}
                    ],
                    "transitions": []
                }
            ],
            "ism_template": [
                {"index_patterns": ["siem-events*"], "priority": 200},
                {"index_patterns": ["security-signals*"], "priority": 210},
                {"index_patterns": ["incident-cases*"], "priority": 210}
            ]
        }
    }
    best_effort("PUT", "/_plugins/_ism/policies/siem-practice-hot", ism_policy)

    template_body = {
        "index_patterns": ["siem-events*", "cloudtrail-logs*", "guardduty-findings*", "securityhub-findings*", "vpc-flow-logs*"],
        "priority": 200,
        "template": {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": replica_count,
                "plugins.index_state_management.policy_id": "siem-practice-hot",
                "refresh_interval": "30s"
            },
            "mappings": {
                "dynamic": True,
                "properties": {
                    "@timestamp": {"type": "date"},
                    "event_names": {"type": "keyword"},
                    "event_sources": {"type": "keyword"},
                    "event_regions": {"type": "keyword"},
                    "datasets": {"type": "keyword"},
                    "severities": {"type": "keyword"},
                    "source_ip_addresses": {"type": "ip", "ignore_malformed": True},
                    "destination_ip_addresses": {"type": "ip", "ignore_malformed": True},
                    "user_names": {"type": "keyword", "ignore_above": 512},
                    "identity_types": {"type": "keyword"},
                    "error_codes": {"type": "keyword"},
                    "event": {"type": "object", "dynamic": True},
                    "cloud": {"type": "object", "dynamic": True},
                    "primary_event": {"type": "object", "dynamic": True},
                    "events": {"type": "nested", "dynamic": True}
                }
            }
        }
    }
    request("PUT", "/_index_template/siem-events", template_body)
    request("PUT", "/siem-events-000001", {"aliases": {"siem-events": {"is_write_index": True}}})

    signals_template = {
        "index_patterns": ["security-signals*", "incident-cases*"],
        "priority": 210,
        "template": {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": replica_count,
                "plugins.index_state_management.policy_id": "siem-practice-hot"
            },
            "mappings": {
                "dynamic": True,
                "properties": {
                    "@timestamp": {"type": "date"},
                    "rule_name": {"type": "keyword"},
                    "severity": {"type": "keyword"},
                    "status": {"type": "keyword"},
                    "owner": {"type": "keyword"},
                    "source": {"type": "keyword"},
                    "summary": {"type": "text"}
                }
            }
        }
    }
    request("PUT", "/_index_template/security-signals", signals_template)
    request("PUT", "/security-signals-000001", {"aliases": {"security-signals": {"is_write_index": True}}})
    request("PUT", "/incident-cases-000001", {"aliases": {"incident-cases": {"is_write_index": True}}})

    dashboard_headers_doc = {
        "attributes": {
            "title": "siem-events*",
            "timeFieldName": "@timestamp"
        }
    }
    best_effort("POST", "/_dashboards/api/saved_objects/index-pattern/siem-events-pattern?overwrite=true", dashboard_headers_doc)

    detection_rules = [
        {
            "rule_name": "Root account activity",
            "severity": "high",
            "source": "cloudtrail",
            "query": 'identity_types:"Root"'
        },
        {
            "rule_name": "IAM policy or access key change",
            "severity": "medium",
            "source": "cloudtrail",
            "query": 'event_names:(CreateAccessKey OR PutUserPolicy OR AttachUserPolicy OR CreatePolicyVersion OR DeletePolicy)'
        },
        {
            "rule_name": "GuardDuty high severity finding",
            "severity": "high",
            "source": "guardduty",
            "query": 'datasets:"aws.guardduty" AND severities:(HIGH OR CRITICAL OR 7 OR 8 OR 9 OR 10)'
        },
        {
            "rule_name": "Security Hub failed control",
            "severity": "medium",
            "source": "securityhub",
            "query": 'datasets:"aws.securityhub" AND primary_event.detail.findings.Compliance.Status:FAILED'
        }
    ]
    for rule in detection_rules:
        best_effort("POST", "/security-signals/_doc", {
            "@timestamp": "1970-01-01T00:00:00Z",
            "rule_name": rule["rule_name"],
            "severity": rule["severity"],
            "status": "enabled",
            "source": rule["source"],
            "summary": f"Detection seed for query: {rule['query']}"
        })

    _, search = request("GET", "/siem-events*/_search?size=1")

    return {
        "cluster_health_status": health_status,
        "cluster_status": health.get("status"),
        "firehose_role_mapped": firehose_role_arn,
        "soc_roles_mapped": role_mappings,
        "siem_index_hits": search.get("hits", {}).get("total", {}),
    }
