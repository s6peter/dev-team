# Webforx Security Platform Repository

This repository is the working home for Webforx Global Inc.'s security engineering program. It exists to help the company build a robust DevSecOps and cybersecurity foundation, stand up a durable SIEM capability, and produce the evidence needed to support SOC 2 readiness by the end of 2026.

The guidance in this repository is based on the current-state and target-state program materials reviewed on March 14, 2026, including the SIEM walkdown, onboarding guide, current-state inventory, sprint plan, and program deck. The source summary is captured in [program/source-reference.md](/Users/ocheme/Desktop/WebForx/Repos/Security/program/source-reference.md).

## Mission

Build and operate a security platform that:

- cannot lose critical logs
- can search and investigate security telemetry quickly
- can detect and respond to high-risk events with runbooks
- can prove logging, monitoring, access control, and change management to auditors

## Program Outcomes

The expected maturity path for this repository and program is:

1. Logs cannot be lost.
2. Logs are searchable.
3. Alerts and response exist.
4. Compliance evidence exists.

## Current Baseline

Based on the reviewed reference documents, the environment already has:

- organization-wide CloudTrail enabled
- S3 log archive delivery in place
- CloudWatch Logs delivery in place
- CloudTrail log file validation enabled
- AWS Identity Center in use for access

The most important gaps still in front of the team are:

- KMS encryption for CloudTrail log delivery and related key controls
- anti-tamper guardrails for CloudTrail, log buckets, and KMS keys
- operational OpenSearch SIEM deployment
- real-time and archive ingestion pipelines
- alert routing, runbooks, and detection coverage
- SOC 2 evidence collection and control mapping

## What Belongs In This Repo

- AWS and cloud security guardrails
- SIEM infrastructure and ingestion patterns
- detection engineering content
- dashboards and reporting definitions
- incident runbooks and response playbooks
- compliance evidence structure and control narratives
- inventories, current-state snapshots, and roadmap artifacts
- CI/CD security automation and scanning workflows

## What Must Not Be Committed

- private keys, certificates with private material, or break-glass secrets
- long-lived credentials, tokens, passwords, or access keys
- production-only environment values in tracked files
- ad hoc evidence files without context, dates, and ownership
- scripts with no operational owner or purpose

If a change requires sensitive data, reference a secure secret source and document how it is provided at deploy or runtime.

## Target Architecture

The working target architecture for this program is documented in [docs/architecture/README.md](/Users/ocheme/Desktop/WebForx/Repos/Security/docs/architecture/README.md). At a high level:

- CloudTrail remains the system of record
- S3 archive ingestion provides durable replay and backfill
- CloudWatch ingestion provides low-latency detections
- OpenSearch is the central SIEM and analytics plane
- guardrails protect trails, log storage, and encryption keys
- detections map to runbooks, alerts, and evidence

## Repository Layout

The structure below is the default contract for future work:

```text
.
├── dashboards/
│   └── opensearch/
├── detections/
│   ├── cloudtrail/
│   └── guardduty/
├── docs/
│   ├── architecture/
│   ├── evidence/
│   ├── runbooks/
│   └── standards/
├── guardrails/
│   ├── iam/
│   └── scp/
├── image-scan/
├── infra/
│   ├── aws/
│   ├── identity/
│   └── opensearch/
├── inventory/
│   └── current-state/
├── pipelines/
│   ├── ci/
│   └── ingestion/
└── program/
```

## Folder Ownership Model

- `infra/`: deployable platform building blocks such as OpenSearch, logging accounts, identity integrations, and security tooling
- `guardrails/`: preventive controls such as SCPs, IAM boundaries, log bucket protections, and key governance
- `pipelines/`: CI security automation and SIEM ingestion components
- `detections/`: detection logic, tuning notes, mappings, and tests
- `dashboards/`: dashboard definitions, saved searches, and reporting packs
- `docs/runbooks/`: triage and incident handling instructions
- `docs/evidence/`: auditor-facing evidence templates, export guides, and collection instructions
- `inventory/`: current-state inventories, reviewed assets, and periodic snapshots
- `program/`: roadmap, milestones, decisions, and planning artifacts

## Engineering Rules

All engineers working in this repository should follow these rules:

1. Treat this repository as security-critical infrastructure, not as a scratch space.
2. Default to infrastructure as code and versioned policy as code.
3. Keep documentation close to the control, pipeline, or detection it describes.
4. Pair every meaningful detection change with a runbook or a runbook update.
5. Pair every meaningful control change with evidence guidance.
6. Never weaken logging, encryption, or anti-tamper controls without an approved exception.
7. Prefer temporary access, federated roles, and least privilege over static credentials.
8. Preserve auditability in every workflow: pull requests, reviews, and artifact history matter.

Detailed working guidance lives in [docs/standards/engineering-guidelines.md](/Users/ocheme/Desktop/WebForx/Repos/Security/docs/standards/engineering-guidelines.md).

## Role Expectations

### DevOps and Platform Engineers

- build and operate durable, repeatable infrastructure
- encode guardrails and policy in automation
- protect CI/CD, registries, and deployment paths
- keep observability, retention, and reliability in scope

### DevSecOps Engineers

- integrate security gates into delivery workflows
- own scanning, policy checks, and deployment hygiene
- make secure defaults the easiest path for engineering teams
- ensure security controls are testable and auditable

### Cybersecurity and SecOps Engineers

- define detections, severities, and tuning standards
- write and maintain runbooks
- validate alert routing and escalation paths
- curate evidence needed for SOC 2 and internal reviews

## Definition Of Done For Security Work

A change is not done just because code merged. For high-value security work, done means:

- the change is documented
- ownership is clear
- rollback or containment steps are known
- detection or monitoring impact is understood
- evidence expectations are documented where relevant
- required reviews have happened

## Near-Term Priorities

The next priority areas for this repository should remain aligned with the reviewed program documents:

1. Protect CloudTrail and the log archive with KMS, SCPs, and storage hardening.
2. Stand up OpenSearch and at least one stable ingestion path.
3. Add core detections for authentication, privilege escalation, and logging tampering.
4. Route alerts to collaboration and ticketing systems with enough context to act.
5. Build runbooks and an evidence pack for SOC 2 logging and monitoring controls.

## Legacy Content

The existing `image-scan/` directory is part of the current CI security baseline. Do not remove or break it without replacing its coverage in a reviewed migration plan.

## Start Here

- Read [docs/architecture/README.md](/Users/ocheme/Desktop/WebForx/Repos/Security/docs/architecture/README.md)
- Read [docs/standards/engineering-guidelines.md](/Users/ocheme/Desktop/WebForx/Repos/Security/docs/standards/engineering-guidelines.md)
- Review [program/README.md](/Users/ocheme/Desktop/WebForx/Repos/Security/program/README.md)
- Store new current-state snapshots under [inventory/current-state/README.md](/Users/ocheme/Desktop/WebForx/Repos/Security/inventory/current-state/README.md)
- Put runbooks under [docs/runbooks/README.md](/Users/ocheme/Desktop/WebForx/Repos/Security/docs/runbooks/README.md)
- Put evidence collection guidance under [docs/evidence/README.md](/Users/ocheme/Desktop/WebForx/Repos/Security/docs/evidence/README.md)
