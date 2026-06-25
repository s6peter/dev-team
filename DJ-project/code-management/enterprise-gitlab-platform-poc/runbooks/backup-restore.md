# GitLab Backup and Restore Runbook

## Backup Scope

Back up both application data and configuration:

- Git repositories
- Database dump inside GitLab backup archive
- Artifacts, uploads, packages, and registry metadata
- `/etc/gitlab` configuration
- `gitlab-secrets.json`

## Manual Backup

On the EC2 host:

```bash
sudo /usr/local/bin/backup-gitlab-to-s3
```

Or from this repository:

```bash
BACKUP_BUCKET=<bucket> AWS_REGION=us-east-1 ./scripts/backup-gitlab-now.sh
```

## Automated Backup

The EC2 bootstrap creates `/etc/cron.d/gitlab-backup` and runs a nightly backup at 02:15 UTC.

Backups are synced to:

```text
s3://<backup-bucket>/gitlab/backups
s3://<backup-bucket>/gitlab/config
```

## Restore Practice

1. Launch a clean EC2 host with the same GitLab major/minor version.
2. Stop GitLab container:

   ```bash
   docker stop gitlab
   ```

3. Copy config and secrets from S3:

   ```bash
   aws s3 sync s3://<backup-bucket>/gitlab/config /opt/boa-platform/gitlab/config
   ```

4. Copy backup archive from S3:

   ```bash
   aws s3 sync s3://<backup-bucket>/gitlab/backups /opt/boa-platform/gitlab/data/backups
   ```

5. Start GitLab:

   ```bash
   docker compose -f /opt/boa-platform/docker-compose.yml up -d gitlab
   ```

6. Restore the backup:

   ```bash
   docker exec -it gitlab gitlab-backup restore BACKUP=<timestamp>
   docker exec -it gitlab gitlab-ctl reconfigure
   docker exec -it gitlab gitlab-rake gitlab:check
   ```

## Validation

- Log in as root.
- Confirm groups and projects exist.
- Clone and push a test branch over SSH port `2222`.
- Run a sample pipeline.
- Confirm runners are online.
- Confirm artifacts and container images are accessible.

