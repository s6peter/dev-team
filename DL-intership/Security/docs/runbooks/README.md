# Runbooks

Store incident triage and response procedures here.

Each runbook should answer:

- what triggered the alert
- how to validate the event
- what data sources to query
- what immediate containment actions are allowed
- when and how to escalate
- what evidence should be preserved

Recommended runbooks to add first:

- root account login
- suspicious `AssumeRole`
- `CreateAccessKey`
- `AttachRolePolicy`
- `StopLogging`
- log bucket tampering
