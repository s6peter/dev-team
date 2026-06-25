# Incident Remediation

## Common Manual Jobs

The pipeline template `ci-templates/ops.gitlab-ci.yml` provides protected manual jobs for:

- Deleting failed runner pods.
- Triggering an Argo CD sync.

## GitLab Unavailable

1. Use SSM Session Manager:

   ```bash
   aws ssm start-session --target <instance-id> --region us-east-1
   ```

2. Check containers:

   ```bash
   docker compose -f /opt/boa-platform/docker-compose.yml ps
   docker logs gitlab --tail 200
   ```

3. Restart GitLab if needed:

   ```bash
   docker compose -f /opt/boa-platform/docker-compose.yml restart gitlab
   ```

4. Check readiness:

   ```bash
   curl http://localhost/-/readiness
   ```

## Artifactory Unavailable

1. Check container status.
2. Check disk usage under `/opt/boa-platform/artifactory`.
3. Restart the service.
4. Re-run the failed publish job.

## SonarQube Unavailable

1. Check `vm.max_map_count`.
2. Check container logs.
3. Restart SonarQube.
4. Re-run the quality stage.

