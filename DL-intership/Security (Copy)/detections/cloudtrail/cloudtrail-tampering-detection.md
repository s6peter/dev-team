**CloudTrail Tampering Detection**  
**Detection Overview**  
| | |  
|-|-|  
| **Field** | **Value** |   
| **Detection ID** | DET-CT-001 |   
| **Name** | CloudTrail Tampering Detection |   
| **Ticket** | #687 - Alert on CloudTrail stop/delete/update events |   
| **Severity** | Critical |   
| **Owner** | Security Operations |   
| **Status** | Implemented (Infrastructure) |   
| **Created** | 2026-07-12 |   
| **Last Updated** | 2026-07-12 |   
   
**Purpose**  
Detect attempts to tamper with CloudTrail logging configuration, which could indicate an attacker trying to cover their tracks by stopping or modifying audit logs.  
**Monitored Events**  
This detection monitors the following CloudTrail API events:  
| | | |  
|-|-|-|  
| **Event Name** | **Risk Level** | **Description** |   
| StopLogging | Critical | Stops logging for a CloudTrail trail - immediate investigation required |   
| DeleteTrail | Critical | Deletes a CloudTrail trail - immediate investigation required |   
| UpdateTrail | High | Modifies trail configuration (bucket, ARN, settings) - investigate immediately |   
| PutEventSelectors | High | Changes event selectors - may indicate attempt to reduce logging scope |   
   
**Infrastructure Implementation**  
**Terraform Resource:** aws_cloudwatch_event_rule.detect_cloudtrail_changes  
**Location:** infra/envs/development/main.tf:1295-1315  
**Event Pattern:**  
{  
   "source": ["aws.cloudtrail"],  
   "detail-type": ["AWS API Call via CloudTrail"],  
   "detail": {  
     "eventSource": ["cloudtrail.amazonaws.com"],  
     "eventName": [  
       "DeleteTrail",  
       "PutEventSelectors",  
       "StopLogging",  
       "UpdateTrail"  
     ]  
   }  
 }  
   
**Alert Routing**  
| | | |  
|-|-|-|  
| **Channel** | **Destination** | **Condition** |   
| SNS Topic | siem-alerts | Always |   
| Incident Queue | SQS queue | Always |   
| CloudWatch Dashboard | Detection metrics | Always |   
   
**Tuning Notes**  
**False Positive Sources**  
1. **Legitimate trail maintenance** - AWS administrators may update trail configurations during planned maintenance  
2. **Infrastructure automation** - CI/CD pipelines may modify trails during deployment  
3. **Trail rotation** - Automated trail rotation policies  
**Tuning Recommendations.**  
1. **Baseline normal activity** - Document who typically modifies CloudTrail and when  
2. **Add exception patterns** - Create suppression rules for known maintenance windows  
3. **Correlate with change tickets** - Cross-reference with ITSM change records  
4. **Monitor frequency** - Alert on unusual patterns rather than single events  
**Validation Methods**  
**Test Event Creation**  
# Create a test trail (DO NOT use in production)  
 aws cloudtrail create-trail --name test-trail --s3-bucket-name test-bucket  
   
 # Test detection by stopping logging (CAUTION: This will stop logging)  
 aws cloudtrail stop-logging --name test-trail  
   
 # Verify detection fires in CloudWatch console  
   
 # Clean up  
 aws cloudtrail delete-trail --name test-trail  
   
**Validation Checklist**  
- Detection rule exists in CloudWatch Events  
- Event pattern matches target API calls  
- SNS topic receives notifications  
- Incident queue receives messages  
- Alert contains sufficient context (who, when, what)  
- Runbook is linked and accessible  
**Related Controls**  
| | |  
|-|-|  
| **Control** | **Description** |   
| SCP: DenyStopLogging | Service Control Policy denying cloudtrail:StopLogging |   
| SCP: DenyDeleteTrail | Service Control Policy denying cloudtrail:DeleteTrail |   
| SCP: RestrictUpdateTrail | Service Control Policy restricting cloudtrail:UpdateTrail |   
   
**Evidence Requirements**  
For SOC 2 compliance (CC7.2, CC7.3):  
1. Screenshot of CloudWatch Event rule configuration  
2. Sample alert notification with full context  
3. Runbook for response procedures  
4. Tuning notes showing false positive reduction  
5. Alert history showing detection effectiveness  
**Linked Runbook**  
- [CloudTrail Tampering Response Runbook](../../docs/runbooks/cloudtrail-tampering-response.md "../../docs/runbooks/cloudtrail-tampering-response.md")  
**Reference**  
- [AWS CloudTrail API Reference](https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/Welcome.html "https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/Welcome.html")  
- [CloudTrail Logging Best Practices](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-and-data-events-with-cloudtrail.html "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-and-data-events-with-cloudtrail.html")  
- [SOC 2 CC7.2 - System Monitoring](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report "https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report")  
