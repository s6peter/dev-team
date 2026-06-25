# OpenSearch Infrastructure

This folder should hold the SIEM platform definitions for OpenSearch.

Expected scope:

- cluster provisioning
- index templates and lifecycle management
- ingest pipelines
- security and access model
- dashboard bootstrap assets

Engineers should design for:

- searchable CloudTrail first
- durable index management
- least-privilege access for analysts and operators
- clean separation between dev and production environments
