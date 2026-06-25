import json
import gzip
import base64
from datetime import datetime, timezone


VPC_FLOW_LOG_FIELDS = [
    "version",
    "account_id",
    "interface_id",
    "srcaddr",
    "dstaddr",
    "srcport",
    "dstport",
    "protocol",
    "packets",
    "bytes",
    "start",
    "end",
    "action",
    "log_status",
]


def _compact_list(values):
    """Return unique non-empty values in original order."""
    compacted = []
    seen = set()
    for value in values:
        if value in (None, "", []):
            continue
        normalized = json.dumps(value, sort_keys=True) if isinstance(value, (dict, list)) else str(value)
        if normalized not in seen:
            seen.add(normalized)
            compacted.append(value)
    return compacted


def _cloudtrail_user_name(event):
    identity = event.get("userIdentity", {})
    return (
        identity.get("userName")
        or identity.get("principalId")
        or identity.get("arn")
        or identity.get("accountId")
    )


def _cloudtrail_identity_type(event):
    return event.get("userIdentity", {}).get("type")


def _source_dataset(log_group, message):
    source = message.get("source") if isinstance(message, dict) else None
    detail_type = message.get("detail-type") if isinstance(message, dict) else None

    if source == "aws.guardduty" or detail_type == "GuardDuty Finding":
        return "aws.guardduty"
    if source == "aws.securityhub" or detail_type == "Security Hub Findings - Imported":
        return "aws.securityhub"
    if log_group and "vpc-flow" in log_group:
        return "aws.vpcflow"
    if isinstance(message, dict) and "eventSource" in message:
        return "aws.cloudtrail"
    return "aws.event"


def _parse_vpc_flow_log(message):
    parts = message.split()
    if len(parts) < len(VPC_FLOW_LOG_FIELDS):
        return None

    flow = dict(zip(VPC_FLOW_LOG_FIELDS, parts))
    for field in ("srcport", "dstport", "protocol", "packets", "bytes", "start", "end"):
        if flow.get(field) == "-":
            flow[field] = None
            continue
        try:
            flow[field] = int(flow[field])
        except (TypeError, ValueError):
            flow[field] = None
    return flow


def _severity(message):
    if not isinstance(message, dict):
        return None
    detail = message.get("detail", {})
    if isinstance(detail, dict):
        severity = detail.get("severity")
        if isinstance(severity, dict):
            return severity.get("Label") or severity.get("label") or severity.get("Normalized")
        return severity
    return None


def handler(event, context):
    """
    Transform CloudWatch Logs subscription filter records to OpenSearch-compatible JSON.
    
    Input format (from CloudWatch Logs subscription filter):
    {
      "records": [
        {
          "data": "base64-encoded gzip-compressed JSON"
        }
      ]
    }
    
    CloudWatch Logs compressed data structure:
    {
      "messageType": "DATA_MESSAGE",
      "owner": "account-id",
      "logGroup": "/aws/cloudtrail/organization",
      "logStream": "stream-name",
      "subscriptionFilters": ["filter-name"],
      "logEvents": [
        {
          "id": "event-id",
          "message": "JSON string (for CloudTrail, this is a CloudTrail event)",
          "timestamp": 1615500000000
        }
      ]
    }
    
    Output format (compatible with Firehose delivery to OpenSearch):
    {
      "records": [
        {
          "recordId": "record-id",
          "result": "Ok" | "ProcessingFailed",
          "data": "newline-delimited JSON string with enhanced fields"
        }
      ]
    }
    """
    output = []
    
    for record in event.get('records', []):
        try:
            transformed_events = []

            # Step 1: Decompress gzipped data
            compressed_data = base64.b64decode(record.get('data', ''))
            decompressed_data = gzip.decompress(compressed_data)
            
            # Step 2: Parse JSON payload
            payload = json.loads(decompressed_data)
            message_type = payload.get("messageType")
            log_events = payload.get("logEvents", [])
            print(
                json.dumps(
                    {
                        "level": "info",
                        "record_id": record.get("recordId"),
                        "message_type": message_type,
                        "log_group": payload.get("logGroup"),
                        "log_stream": payload.get("logStream"),
                        "log_event_count": len(log_events),
                    }
                )
            )
            
            # Step 3: Transform each log event
            for log_event in log_events:
                try:
                    # Parse the message (for CloudTrail, this is already a JSON string)
                    message_str = log_event.get('message', '{}')
                    try:
                        message = json.loads(message_str)
                    except json.JSONDecodeError:
                        flow_log = _parse_vpc_flow_log(message_str)
                        if flow_log:
                            message = {"vpc_flow_log": flow_log}
                        else:
                            raise

                    transformed_events.append({
                        "event": message,
                        "original_event_id": log_event.get("id"),
                        "original_timestamp": log_event.get("timestamp"),
                    })
                    
                except json.JSONDecodeError as e:
                    transformed_events.append({
                        "raw_message": message_str,
                        "parse_error": str(e),
                        "original_event_id": log_event.get("id"),
                        "original_timestamp": log_event.get("timestamp"),
                    })

            if transformed_events:
                parsed_events = [
                    item["event"]
                    for item in transformed_events
                    if isinstance(item.get("event"), dict)
                ]
                primary_event = parsed_events[0] if parsed_events else {}
                event_times = _compact_list([
                    event.get("eventTime") or event.get("time") for event in parsed_events
                ])
                datasets = _compact_list([
                    _source_dataset(payload.get("logGroup"), event) for event in parsed_events
                ])
                severities = _compact_list([_severity(event) for event in parsed_events])
                transformed_document = {
                    "@timestamp": event_times[0] if event_times else datetime.now(timezone.utc).isoformat(),
                    "event": {
                        "dataset": datasets[0] if datasets else "aws.event",
                        "module": "aws",
                    },
                    "cloud": {
                        "provider": "aws",
                        "account": {
                            "id": payload.get("owner"),
                        },
                    },
                    "message_type": message_type,
                    "owner": payload.get("owner"),
                    "log_group": payload.get("logGroup"),
                    "log_stream": payload.get("logStream"),
                    "subscription_filters": payload.get("subscriptionFilters", []),
                    "datasets": datasets,
                    "severities": severities,
                    "event_count": len(transformed_events),
                    "event_names": _compact_list([event.get("eventName") for event in parsed_events]),
                    "event_sources": _compact_list([event.get("eventSource") or event.get("source") for event in parsed_events]),
                    "event_regions": _compact_list([event.get("awsRegion") or event.get("region") for event in parsed_events]),
                    "event_times": event_times,
                    "source_ip_addresses": _compact_list([
                        event.get("sourceIPAddress")
                        or event.get("vpc_flow_log", {}).get("srcaddr")
                        for event in parsed_events
                    ]),
                    "destination_ip_addresses": _compact_list([
                        event.get("vpc_flow_log", {}).get("dstaddr")
                        for event in parsed_events
                    ]),
                    "user_agents": _compact_list([event.get("userAgent") for event in parsed_events]),
                    "user_names": _compact_list([_cloudtrail_user_name(event) for event in parsed_events]),
                    "identity_types": _compact_list([_cloudtrail_identity_type(event) for event in parsed_events]),
                    "error_codes": _compact_list([event.get("errorCode") for event in parsed_events]),
                    "read_only_values": _compact_list([event.get("readOnly") for event in parsed_events]),
                    "primary_event": primary_event,
                    "events": transformed_events,
                    "_firehose_metadata": {
                        "ingestion_timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "cloudwatch-logs",
                    },
                }

                print(
                    json.dumps(
                        {
                            "level": "info",
                            "record_id": record.get("recordId"),
                            "result": "Ok",
                            "transformed_document_count": 1,
                            "source_event_count": len(transformed_events),
                        }
                    )
                )
                output.append({
                    'recordId': record['recordId'],
                    'result': 'Ok',
                    'data': base64.b64encode(json.dumps(transformed_document).encode("utf-8")).decode("utf-8")
                })
            else:
                print(
                    json.dumps(
                        {
                            "level": "info",
                            "record_id": record.get("recordId"),
                            "result": "Dropped",
                            "reason": "no_transformable_log_events",
                            "message_type": message_type,
                        }
                    )
                )
                output.append({
                    'recordId': record['recordId'],
                    'result': 'Dropped',
                    'data': record.get('data', '')
                })
                    
        except Exception as e:
            # On critical error (decompression, payload parsing), mark as failed
            # Firehose will send to DLQ/backup S3
            print(
                json.dumps(
                    {
                        "level": "error",
                        "record_id": record.get("recordId"),
                        "result": "ProcessingFailed",
                        "error": str(e),
                    }
                )
            )
            output.append({
                'recordId': record['recordId'],
                'result': 'ProcessingFailed',
                'data': record.get('data', '')  # Return original data unchanged
            })
    
    return {'records': output}
