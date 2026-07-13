# CloudTrail Detections

Store CloudTrail-driven detection logic and supporting notes here.

## Active Detections

| Detection ID | Name | Severity | Status | Runbook |
|--------------|------|----------|--------|---------|
| DET-CT-001 | CloudTrail Tampering Detection | Critical | Implemented | [RB-CT-001](../../docs/runbooks/cloudtrail-tampering-response.md) |

## Detection Details

### DET-CT-001: CloudTrail Tampering Detection

**Ticket:** #687 - Alert on CloudTrail stop/delete/update events

**Monitored Events:**
- `StopLogging` - Stops logging for a CloudTrail trail
- `DeleteTrail` - Deletes a CloudTrail trail
- `UpdateTrail` - Modifies trail configuration
- `PutEventSelectors` - Changes event selectors

**Infrastructure:** `aws_cloudwatch_event_rule.detect_cloudtrail_changes` in `infra/envs/development/main.tf:1295-1315`

**Full Documentation:** [CloudTrail Tampering Detection](cloudtrail-tampering-detection.md)

## Recommended Future Detections

- root account login
- failed authentication bursts
- `CreateAccessKey`
- `AttachRolePolicy`
- `PutUserPolicy`
- unusual cross-account `AssumeRole`

## Detection Format

Each detection should include:

- purpose
- severity
- tuning notes
- test event or validation method
- linked runbook
