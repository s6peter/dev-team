# SCP Guardrails

Store organization-level preventive controls here.

Initial focus areas:

- deny `cloudtrail:StopLogging`
- deny `cloudtrail:DeleteTrail`
- restrict `cloudtrail:UpdateTrail`
- protect log archive buckets from deletion or weakening
- restrict KMS key deletion for logging keys

Every SCP change should include:

- intended blast radius
- exception model
- test approach
- rollback plan
