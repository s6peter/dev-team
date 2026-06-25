# CloudTrail Detections

Store CloudTrail-driven detection logic and supporting notes here.

Recommended first detections:

- root account login
- failed authentication bursts
- `CreateAccessKey`
- `AttachRolePolicy`
- `PutUserPolicy`
- unusual cross-account `AssumeRole`
- `StopLogging`
- `DeleteTrail`
- `UpdateTrail`

Each detection should include:

- purpose
- severity
- tuning notes
- test event or validation method
- linked runbook
