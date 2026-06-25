#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_BUCKET:?Set BACKUP_BUCKET to the S3 backup bucket name}"
: "${AWS_REGION:=us-east-1}"

docker exec gitlab gitlab-backup create STRATEGY=copy
aws s3 sync /opt/boa-platform/gitlab/data/backups "s3://${BACKUP_BUCKET}/gitlab/backups" --region "${AWS_REGION}"
aws s3 sync /opt/boa-platform/gitlab/config "s3://${BACKUP_BUCKET}/gitlab/config" --region "${AWS_REGION}"

