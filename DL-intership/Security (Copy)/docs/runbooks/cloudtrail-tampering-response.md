# CloudTrail Tampering Response Runbook

## Overview

| Field | Value |
|-------|-------|
| **Runbook ID** | RB-CT-001 |
| **Name** | CloudTrail Tampering Response |
| **Ticket** | #687 - Alert on CloudTrail stop/delete/update events |
| **Severity** | Critical |
| **Owner** | Security Operations |
| **Response Time** | Immediate (within 15 minutes) |
| **Created** | 2026-07-12 |
| **Last Updated** | 2026-07-12 |

## Trigger

This runbook is triggered when:
- CloudWatch Event Rule `detect-cloudtrail-changes` fires
- Alert received via SNS topic `siem-alerts`
- Detection: CloudTrail `StopLogging`, `DeleteTrail`, `UpdateTrail`, or `PutEventSelectors` API call detected

## Alert Context

The alert will contain:
- **Event Name**: Which API call was made
- **User Identity**: Who made the call (ARN, type, userName)
- **Source IP Address**: Where the call originated
- **Request Parameters**: What was changed
- **Event Time**: When it happened
- **AWS Region**: Which region

## Immediate Response Steps

### Step 1: Initial Triage (5 minutes)

**Objective:** Determine if this is a true positive or false positive

1. **Review alert details**
   - Who made the change? (user identity)
   - What specific action was taken?
   - When did it occur?
   - From what IP address?

2. **Check if change was authorized**
   - Was there a change ticket? (Check ITSM system)
   - Is this person authorized to modify CloudTrail?
   - Is this during a maintenance window?

3. **Quick validation**
   ```bash
   # Get current trail status
   aws cloudtrail describe-trails --region <REGION>
   
   # Check trail status
   aws cloudtrail get-trail-status --name <TRAIL_NAME> --region <REGION>
   ```

**Decision Point:**
- If **authorized change** with ticket → Document and close as false positive
- If **unauthorized change** or no ticket → Proceed to Step 2 (Containment)

### Step 2: Containment (10 minutes)

**Objective:** Stop the attack and preserve evidence

**If trail was stopped:**
```bash
# IMMEDIATELY restart logging
aws cloudtrail start-logging --name <TRAIL_NAME> --region <REGION>

# Verify logging is active
aws cloudtrail get-trail-status --name <TRAIL_NAME> --region <REGION>
```

**If trail was deleted:**
```bash
# Check if trail exists in S3 bucket
aws s3 ls s3://<TRAIL_BUCKET>/AWSLogs/<ACCOUNT_ID>/CloudTrail/

# Recreate trail with original configuration
aws cloudtrail create-trail \
  --name <TRAIL_NAME> \
  --s3-bucket-name <TRAIL_BUCKET> \
  --is-multi-region-trail \
  --enable-log-file-validation
```

**If trail was updated:**
```bash
# Review what changed
aws cloudtrail describe-trails --region <REGION>

# Restore original configuration if needed
aws cloudtrail update-trail --name <TRAIL_NAME> [ORIGINAL_PARAMETERS]
```

**Additional Containment Actions:**
1. Enable MFA on the compromised account (if applicable)
2. Revoke active sessions for the user
3. Check for other suspicious activity in the same timeframe

### Step 3: Investigation (30 minutes)

**Objective:** Determine scope and impact

1. **Review CloudTrail event history**
   ```bash
   # Get recent events from CloudTrail
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=StopLogging \
     --max-results 20 \
     --region <REGION>
   ```

2. **Check for related suspicious activity**
   - Look for privilege escalation attempts
   - Check for data exfiltration indicators
   - Review GuardDuty findings in the same timeframe
   - Check for unauthorized API calls

3. **Interview the user** (if internal)
   - Confirm they made the change
   - Understand their reasoning
   - Document their explanation

4. **Review access patterns**
   - Check IAM Access Analyzer findings
   - Review CloudTrail Insights (if enabled)
   - Look for unusual source IP addresses

### Step 4: Eradication & Recovery (1 hour)

**Objective:** Remove threat and restore secure state

1. **If account was compromised:**
   - Rotate access keys
   - Reset password
   - Review and remove unauthorized IAM policies
   - Check for backdoor users or roles

2. **If insider threat:**
   - Escalate to HR and management
   - Review access privileges
   - Implement additional monitoring

3. **Verify logging is operational:**
   ```bash
   # Confirm trail is logging
   aws cloudtrail get-trail-status --name <TRAIL_NAME> --region <REGION>
   
   # Check S3 bucket for new log files
   aws s3 ls s3://<TRAIL_BUCKET>/AWSLogs/<ACCOUNT_ID>/CloudTrail/ --recursive | tail -10
   ```

### Step 5: Documentation (30 minutes)

**Objective:** Document incident for compliance and future reference

1. **Update ticket with:**
   - Timeline of events
   - Actions taken
   - Evidence collected
   - Root cause analysis
   - Remediation steps

2. **Preserve evidence:**
   ```bash
   # Export CloudTrail events for the incident timeframe
   aws cloudtrail lookup-events \
     --start-time <INCIDENT_START> \
     --end-time <INCIDENT_END> \
     --region <REGION> \
     --output json > cloudtrail-events-$(date +%Y%m%d).json
   ```

3. **Update detection rules** if needed:
   - Tune false positives
   - Add new indicators
   - Update alert thresholds

## Escalation Matrix

| Severity | Escalation Path | Contact |
|----------|-----------------|---------|
| Critical | Security Lead → CISO | security-lead@company.com |
| High | Security Team Lead | security-team@company.com |
| Medium | SOC Analyst | soc@company.com |

## Evidence to Preserve

| Evidence Type | Location | Retention |
|---------------|----------|-----------|
| CloudTrail event logs | S3 bucket | 1 year |
| Alert notifications | SNS/SQS | 90 days |
| Incident ticket | ITSM system | 3 years |
| Investigation notes | Confluence | 3 years |
| Screenshots | Evidence pack | 3 years |

## Post-Incident Actions

1. **Immediate (24 hours):**
   - Complete incident report
   - Brief security team
   - Update detection rules if needed

2. **Short-term (1 week):**
   - Conduct post-incident review
   - Update runbooks based on lessons learned
   - Implement additional controls if needed

3. **Long-term (1 month):**
   - Review access policies
   - Implement additional monitoring
   - Update training materials

## Related Documentation

- [CloudTrail Tampering Detection](../../detections/cloudtrail/cloudtrail-tampering-detection.md)
- [Engineering Guidelines](../../docs/standards/engineering-guidelines.md)
- [SOC 2 Evidence Pack](../../compliance/soc2/logging-monitoring/EP-0001/evidence_pack_EP-0001.md)

## References

- [AWS CloudTrail Documentation](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/Welcome.html)
- [Incident Response Best Practices](https://docs.aws.amazon.com/whitepapers/latest/incident-response-forensic-analysis/welcome.html)
- [SOC 2 CC7.2 - System Monitoring](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report)
