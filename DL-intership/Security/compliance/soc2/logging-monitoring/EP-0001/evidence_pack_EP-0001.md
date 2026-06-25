# Evidence Pack — SOC 2 Logging & Monitoring Controls

> **Document ID:** EP-0001
> **Version:** 1.0
> **Status:** [x] Draft &nbsp;&nbsp; [ ] Under Review &nbsp;&nbsp; [ ] Approved
> **Created By:** s10baffour
> **Created Date:** 2026-04-21
> **Approved By:**
> **Approval Date:**

---

## 1. Overview

| Field | Details |
|---|---|
| **Evidence Pack Name** | SOC 2 Logging & Monitoring — CloudTrail + SIEM Ingestion |
| **Related Ticket / Task** | #715 – Evidence Pack Template and Initial Evidence Collection |
| **Objective** | Define what evidence is needed for SOC 2-style logging and monitoring controls and collect initial proof |
| **Compliance Framework** | SOC 2 Type II |
| **Relevant Trust Service Criteria** | CC7.2 – Monitor system components for anomalies; CC7.3 – Evaluate security events |
| **Audit Period** | 2026-04-21 (Initial collection) |
| **Owner / Responsible Team** | WBFX-DevSecOps-CyberSecurity |
| **Reviewer** | |

---

## 2. Control Reference

| Field | Details |
|---|---|
| **Control ID** | CC7.2 / CC7.3 |
| **Control Name** | Logging & Monitoring |
| **Control Domain** | Security Operations |
| **Control Description** | The organization collects, retains, and monitors system logs to detect anomalous activity, unauthorized access, and security events in a timely manner |
| **Control Type** | [ ] Preventive &nbsp;&nbsp; [x] Detective &nbsp;&nbsp; [ ] Corrective |
| **Control Frequency** | [x] Continuous &nbsp;&nbsp; [ ] Daily &nbsp;&nbsp; [ ] Weekly &nbsp;&nbsp; [ ] Monthly &nbsp;&nbsp; [ ] Annually |
| **Risk(s) Addressed** | Unauthorized access going undetected; lack of audit trail; failure to identify and respond to security incidents |

---

## 3. Evidence Items

> This section answers **What** evidence is required.

| # | Evidence Item | Description | Format | Status |
|---|---|---|---|---|
| 1 | CloudTrail Enabled Screenshot | Shows CloudTrail trail list with status, multi-region, and org trail enabled | Screenshot | [x] Collected |
| 2 | CloudTrail Trail Detail | Full trail configuration including log validation, S3 bucket, CloudWatch integration | Screenshot | [x] Collected |
| 3 | CloudTrail S3 Bucket Access | Access attempt to log bucket — restricted (least privilege confirmed) | Screenshot | [x] Collected |
| 4 | CloudTrail Event History (Filtered) | 39 write events over 90 days showing multi-user API activity | Screenshot | [x] Collected |
| 5 | CloudTrail Event History (Unfiltered) | 50+ events as of 2026-04-21, logging in real time | Screenshot | [x] Collected |
| 6 | SIEM Ingestion Config | OpenSearch not yet configured as SIEM | ⚠️ Gap | [ ] Pending |
| 7 | SIEM Active Dashboard | OpenSearch dashboards not yet built | ⚠️ Gap | [ ] Pending |
| 8 | Log Retention Policy | Not yet documented | ⚠️ Gap | [ ] Pending |
| 9 | Access Control on Log Storage | S3 bucket access restricted by IAM (confirmed via access error) | Screenshot | [x] Collected |

---

## 4. Collection Details

> This section answers **Who**, **When**, and **How** evidence is collected.

### 4.1 CloudTrail Evidence

| Field | Details |
|---|---|
| **Who Collects** | s10baffour — WBFX-DevSecOps-CyberSecurity team |
| **When to Collect** | Monthly, or at the start of each audit cycle |
| **How to Collect** | 1. Log in to AWS Console → CloudTrail → Trails <br> 2. Screenshot trail list showing status, multi-region, org trail, log validation <br> 3. Click into trail for full detail screenshot <br> 4. Navigate to linked S3 bucket to confirm storage location <br> 5. Go to Event History → screenshot unfiltered recent events |
| **Automated Option** | Use AWS Config rule `cloud-trail-enabled` for continuous compliance checking |
| **Validation Step** | Security lead reviews screenshots to confirm coverage and no gaps |

### 4.2 SIEM Ingestion Evidence

| Field | Details |
|---|---|
| **Who Collects** | Security Operations / SIEM Administrator (TBD) |
| **When to Collect** | Once OpenSearch is configured and operational |
| **How to Collect** | 1. Log in to OpenSearch Dashboards <br> 2. Navigate to Management → Index Management → confirm CloudTrail index exists <br> 3. Screenshot data source configuration showing CloudTrail connected <br> 4. Export ingestion dashboard showing active log volume <br> 5. Check for ingestion errors or gaps |
| **Automated Option** | Set up OpenSearch alerting to notify if ingestion drops below threshold |
| **Validation Step** | Security lead confirms ingestion is continuous with no unexplained gaps |

---

## 5. Initial Evidence Collection — CloudTrail + SIEM

> First round of evidence collected as part of task #715 on 2026-04-21.

### 5.1 CloudTrail

| Field | Details |
|---|---|
| **Collected By** | s10baffour |
| **Collection Date** | 2026-04-21 |
| **CloudTrail Status** | [x] Enabled — All Regions |
| **Log Validation Enabled** | [x] Yes |
| **Trail Name** | WebfoxManagement-Setup-OrganizationTrail-KVR31g2jJTpc |
| **Organization Trail** | Enabled for all accounts |
| **S3 Bucket Name** | management-cloudtrail-logs-bucket |
| **S3 Bucket Path** | AWSLogs/597088047986/ |
| **CloudWatch Log Group** | /aws/cloudtrail/WebfoxManagement-Setup |
| **Last Log Delivered** | 2026-04-21, 21:50:21 UTC |
| **Last Validation Delivered** | 2026-04-21, 21:34:12 UTC |
| **Log Sample Date Range** | Last 90 days (50+ events confirmed) |
| **Findings / Notes** |  Logging active and real-time. ⚠️ SSE-KMS encryption not enabled on logs. ⚠️ CloudTrail Insights disabled. ⚠️ SNS notifications disabled. S3 bucket access restricted by IAM (least privilege — positive control). |
| **Evidence Files** | `EP-0001_CloudTrail_Status_2026-04-21.png` <br> `EP-0001_CloudTrail_Detail_2026-04-21.png` <br> `EP-0001_CloudTrail_S3_AccessRestricted_2026-04-21.png` <br> `EP-0001_CloudTrail_EventHistory_2026-04-21.png` <br> `EP-0001_CloudTrail_EventHistory_Unfiltered_2026-04-21.png` |

### 5.2 SIEM Ingestion (OpenSearch)

| Field | Details |
|---|---|
| **Collected By** | s10baffour |
| **Collection Date** | 2026-04-21 |
| **SIEM Platform** | Amazon OpenSearch Service (us-east-2) |
| **Ingestion Status** | [ ] Active &nbsp;&nbsp; [ ] Intermittent &nbsp;&nbsp; [x] Not Configured |
| **Log Source Connected** | ⚠️ None — OpenSearch not yet set up |
| **Ingestion Gap(s) Identified** | [x] Yes — OpenSearch SIEM has not been configured. No CloudTrail logs are currently being ingested into OpenSearch. Dashboard definitions exist in the repo (`dashboards/opensearch/`) as planned future work but have not been deployed. |
| **Findings / Notes** | IAM role `WBFX-DevSecOps-CyberSecurity` lacks `es:ListDomainNames` and `es:GetDefaultApplicationSetting` permissions, preventing AWS console access to OpenSearch. Direct Dashboards URL not yet provisioned. |
| **Evidence Files** | `EP-0001_OpenSearch_Console_AccessRestricted_2026-04-21.png` <br> `EP-0001_OpenSearch_UI_AccessRestricted_2026-04-21.png` |

---

## 6. Storage Location

| Field | Details |
|---|---|
| **Primary Storage Location** | Forgejo — git.edusuc.net/WEBFORX/Security |
| **Folder / Path** | `/compliance/soc2/logging-monitoring/EP-0001/` |
| **Access Control** | WEBFORX Security team + Auditors (read-only for auditors) |
| **Backup Location** | Forgejo repository history |
| **Retention Period** | Minimum 12 months (per SOC 2 requirements) |
| **Naming Convention** | `EP-[ID]_[ControlArea]_[YYYY-MM-DD]_[Description]` |

---

## 7. Quality & Completeness Checklist

- [x] CloudTrail evidence collected and documented
- [x] Evidence covers current state as of 2026-04-21
- [x] CloudTrail confirmed enabled across all regions and all org accounts
- [x] All files named per naming convention
- [ ] SIEM (OpenSearch) ingestion confirmed active — **BLOCKED: OpenSearch not yet configured**
- [ ] Log retention policy documented — **PENDING**
- [ ] KMS encryption enabled on CloudTrail logs — **GAP identified**
- [ ] Control owner has reviewed and signed off

---

## 8. Review & Approval Log

| Version | Date | Reviewed / Approved By | Role | Action | Comments |
|---|---|---|---|---|---|
| 1.0 | 2026-04-21 | s10baffour | DevSecOps Engineer | [x] Reviewed | Initial draft — CloudTrail evidence collected, OpenSearch gap documented |

---

## 9. Notes & Additional Comments

### ⚠️ Open Gaps — Follow-up Required

1. **OpenSearch SIEM not configured** — CloudTrail logs are not currently ingested into any SIEM. OpenSearch setup is planned (evidenced by `dashboards/opensearch/` in the Security repo) but not yet deployed. This must be addressed before full SOC 2 compliance can be claimed for CC7.2/CC7.3.

2. **CloudTrail SSE-KMS encryption not enabled** — Log files in S3 are not encrypted with a customer-managed KMS key. Default S3 encryption may apply but should be confirmed and upgraded to KMS for stronger compliance posture.

3. **CloudTrail Insights disabled** — Unusual API activity detection is not enabled. Consider enabling for anomaly detection coverage.

4. **Log retention policy not documented** — A formal policy defining the retention period for CloudTrail logs should be created and referenced here.

###  Positive Findings

- CloudTrail is active, multi-region, and applied across all organization accounts
- Log file validation is enabled and delivering successfully
- S3 log bucket access is restricted by IAM (least privilege confirmed)
- CloudWatch Logs integration is configured for real-time log streaming

---

*Maintained by the WBFX DevSecOps / Security Team. For questions, contact the Security team on Slack or via the Forgejo Security repo.*
