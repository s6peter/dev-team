# AWS Infrastructure

This folder should hold AWS infrastructure definitions for the security program.

Expected scope:

- CloudTrail and log archive controls
- S3 bucket and lifecycle definitions
- KMS keys and policies
- CloudWatch log groups and retention
- supporting roles and queueing components for ingestion

Design rule:

The log archive and control plane protections are foundational. Do not optimize convenience ahead of durability and auditability.
