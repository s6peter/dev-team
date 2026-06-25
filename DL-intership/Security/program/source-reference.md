# Source Reference

This repository guidance was synthesized from the following source materials reviewed on March 14, 2026:

- `webforx_current_to_target_walkdown_2026-03-04.docx`
- `webforx_devsecops_onboarding_walkthrough_2026-03-04.docx`
- `webforx_siem_current_state_inventory_2026-03-04.csv`
- `webforx_siem_next_two_sprints_plan_2026-03-04.docx`
- `Webforx-DevSecOps-and-Cybersecurity-Program.pptx`

## Distilled Program Direction

### Current State

- organization-wide CloudTrail is already enabled
- S3 archive delivery and CloudWatch delivery both exist
- CloudTrail digest validation exists
- KMS encryption and anti-tamper controls still need to be tightened
- OpenSearch SIEM is still planned, not yet operational

### Target State

- dual-ingestion SIEM architecture
- centralized OpenSearch-based security analytics
- durable log archive with strong tamper resistance
- high-signal detections with alert routing and runbooks
- recurring SOC 2 evidence generation

### Immediate Priorities

1. protect logging and archive durability
2. implement anti-tamper guardrails
3. stand up SIEM ingestion and search
4. operationalize detections and response
5. build evidence-friendly operating practices
