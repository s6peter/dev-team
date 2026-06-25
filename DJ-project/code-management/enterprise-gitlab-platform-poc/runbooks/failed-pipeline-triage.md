# Failed Pipeline Triage

## First Five Minutes

1. Identify the failed stage.
2. Confirm whether the failure is app code, platform, scanner, registry, or deployment.
3. Check runner availability.
4. Check GitLab service health.
5. Check whether failures are isolated or platform-wide.

## Stage-Specific Triage

| Stage | Likely Causes | Checks |
|---|---|---|
| test | Bad code, missing dependency | pytest output, dependency lock file |
| quality | Quality gate failed, token invalid | SonarQube project, `SONAR_TOKEN` |
| security | Vulnerable dependency, scanner outage | GitLab security tab, Trivy output |
| publish | Artifactory credentials, registry path | `docker login`, Artifactory repo |
| deploy | GitOps token, manifest path | Git commit output, Argo CD sync |

## Escalation

Escalate to platform engineering if:

- Multiple projects fail in runner setup.
- GitLab readiness endpoint is unhealthy.
- Artifactory or SonarQube is unavailable.
- Argo CD cannot reach the cluster.

