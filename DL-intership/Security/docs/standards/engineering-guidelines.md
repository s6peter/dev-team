# Engineering Guidelines

These are the working standards for engineers contributing to the Webforx security platform repository.

## Core Mindset

- optimize for security, traceability, and maintainability
- assume auditors, responders, and future engineers will read your work
- prefer simple, explicit, reviewable designs over clever shortcuts
- make rollback, evidence, and ownership obvious

## Repository Conduct

- do not commit secrets, tokens, certificates with private material, or real credentials
- do not commit one-off experiments to the default branch
- do not disable scanning or guardrails without an approved exception path
- do not merge architecture changes that break evidence collection or operational visibility

## How To Place New Work

- put AWS and platform building blocks in `infra/`
- put organizational controls in `guardrails/`
- put ingestion workflows in `pipelines/ingestion/`
- put CI security automation in `pipelines/ci/`
- put detection content in `detections/`
- put dashboards and saved queries in `dashboards/`
- put runbooks in `docs/runbooks/`
- put evidence instructions and templates in `docs/evidence/`
- put inventories and snapshots in `inventory/current-state/`
- put roadmap or planning material in `program/`

## Required Companions For High-Value Changes

The following changes should not land alone:

- new detection: include severity, owner, routing expectation, and runbook reference
- new guardrail: include validation steps and evidence guidance
- new ingestion path: include data-flow notes, retry behavior, and failure handling
- new dashboard: include audience and refresh expectation
- new compliance control: include control objective and evidence collection steps

## Pull Request Expectations

Every meaningful PR should answer:

- what risk is reduced or what control is improved
- what systems are affected
- how the change was validated
- what evidence or runbook updates were made
- what follow-up work remains

## Naming Guidance

- use clear, domain-based paths instead of personal or temporary names
- prefer names that describe the control or capability, not the contributor
- use date-stamped evidence and inventory artifacts when snapshots are point-in-time

## Security Review Triggers

Request deeper review when a change affects:

- identity and access control
- CloudTrail, S3 log archive, or KMS configuration
- alert routing or incident response procedures
- CI/CD trust boundaries
- evidence retention or auditor-visible controls

## Operational Expectations

- weekly: tune detections and review false positives
- bi-weekly: review backlog, sprint output, and control gaps
- monthly: review privileged access and break-glass pathways
- quarterly: refresh account scans, vulnerability scans, and evidence packs

## Quality Bar

Good contributions in this repo are:

- easy to audit
- easy to operate
- easy to hand off
- tied to a security or compliance objective
- safe to run more than once
