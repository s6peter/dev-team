#!/bin/bash
# GitLab Enterprise Installation Script
# Used as EC2 user-data for GitLab application nodes
set -euo pipefail

exec > >(tee /var/log/gitlab-bootstrap.log | logger -t gitlab-bootstrap) 2>&1

# ---------------------------------------------------------------
# Configuration (populated by Terraform templatefile)
# ---------------------------------------------------------------
GITLAB_DOMAIN="${gitlab_domain}"
GITLAB_SSH_PORT="${gitlab_ssh_port}"
RDS_ENDPOINT="${rds_endpoint}"
RDS_PASSWORD="${rds_password}"
RDS_USERNAME="${rds_username}"
RDS_DATABASE="${rds_database}"
REDIS_ENDPOINT="${redis_endpoint}"
S3_STORAGE_BUCKET="${s3_storage_bucket}"
AWS_REGION="${aws_region}"
GITLAB_TRUSTED_IPS="${gitlab_trusted_ips_joined}"
GITLAB_EDITION="gitlab-ee"
GITLAB_VERSION="17.0.0"

install_dependencies() {
  dnf update -y
  dnf install -y curl policycoreutils openssh-server openssh-clients postfix perl jq awscli

  # Enable EPEL
  dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-2023.noarch.rpm || true

  # Enable postfix for email notifications
  systemctl enable postfix
  systemctl start postfix
}

install_gitlab() {
  local download_url="https://packages.gitlab.com/install/repositories/gitlab/gitlab-ee/script.rpm.sh"

  curl -sS "${download_url}" | bash

  dnf install -y "${GITLAB_EDITION}-${GITLAB_VERSION}" || dnf install -y "${GITLAB_EDITION}"
}

configure_gitlab() {
  mkdir -p /etc/gitlab /var/opt/gitlab /var/log/gitlab

  # Attach and format data volume
  if [ -e /dev/xvdf ] && ! blkid /dev/xvdf; then
    mkfs.xfs /dev/xvdf
  fi

  if [ -e /dev/xvdf ]; then
    mkdir -p /var/opt/gitlab
    mount /dev/xvdf /var/opt/gitlab 2>/dev/null || true
    echo "/dev/xvdf /var/opt/gitlab xfs defaults,nofail 0 2" >> /etc/fstab
  fi

  cat > /etc/gitlab/gitlab.rb << GITLAB_RB
external_url "https://${GITLAB_DOMAIN}"
gitlab_rails['gitlab_ssh_host'] = "${GITLAB_DOMAIN}"
gitlab_rails['gitlab_shell_ssh_port'] = ${GITLAB_SSH_PORT}
registry_external_url "https://registry.${GITLAB_DOMAIN}"
pages_external_url "https://pages.${GITLAB_DOMAIN}"

gitlab_rails['db_adapter'] = 'postgresql'
gitlab_rails['db_encoding'] = 'unicode'
gitlab_rails['db_host'] = '${RDS_ENDPOINT}'
gitlab_rails['db_port'] = 5432
gitlab_rails['db_username'] = '${RDS_USERNAME}'
gitlab_rails['db_password'] = '${RDS_PASSWORD}'
gitlab_rails['db_database'] = '${RDS_DATABASE}'
gitlab_rails['db_pool'] = 25
gitlab_rails['db_prepared_statements'] = true
postgresql['enable'] = false

gitlab_rails['redis_host'] = '${REDIS_ENDPOINT}'
gitlab_rails['redis_port'] = 6379
gitlab_rails['redis_ssl'] = true
redis['enable'] = false

gitlab_rails['object_store']['enabled'] = true
gitlab_rails['object_store']['proxy_download'] = true
gitlab_rails['object_store']['connection'] = {
  'provider' => 'AWS',
  'region' => '${AWS_REGION}',
  'aws_access_key_id' => '',
  'aws_secret_access_key' => '',
  'use_iam_profile' => true
}
gitlab_rails['artifacts_enabled'] = true
gitlab_rails['artifacts_object_store']['enabled'] = true
gitlab_rails['artifacts_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['lfs_enabled'] = true
gitlab_rails['lfs_object_store']['enabled'] = true
gitlab_rails['lfs_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['uploads_object_store']['enabled'] = true
gitlab_rails['uploads_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['ci_secure_files_object_store']['enabled'] = true
gitlab_rails['ci_secure_files_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['packages_object_store']['enabled'] = true
gitlab_rails['packages_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['dependency_proxy_object_store']['enabled'] = true
gitlab_rails['dependency_proxy_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['terraform_state_object_store']['enabled'] = true
gitlab_rails['terraform_state_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['pages_object_store']['enabled'] = true
gitlab_rails['pages_object_store']['remote_directory'] = '${S3_STORAGE_BUCKET}'

registry['enabled'] = true
registry['storage']['s3']['accesskey'] = ''
registry['storage']['s3']['secretkey'] = ''
registry['storage']['s3']['region'] = '${AWS_REGION}'
registry['storage']['s3']['bucket'] = '${S3_STORAGE_BUCKET}'
registry['storage']['s3']['usesdk'] = true

puma['worker_processes'] = [[(node['memory']['total'].to_i / (1024**2) / 4).to_i, 8].max, 2].max
puma['max_threads'] = 8
sidekiq['max_concurrency'] = 25
sidekiq['min_concurrency'] = 10

gitlab_rails['monitoring_whitelist'] = ['${GITLAB_TRUSTED_IPS}']
prometheus_monitoring['enable'] = true
node_exporter['enable'] = true
redis_exporter['enable'] = false
postgres_exporter['enable'] = false

gitlab_shell['ssh_port'] = ${GITLAB_SSH_PORT}

gitaly['configuration'] = {
  storage: [{ name: 'default', path: '/var/opt/gitlab/git-data/repositories' }]
}
gitlab_pages['enable'] = true
gitlab_pages['access_control'] = true
mattermost['enable'] = false

gitlab_rails['backup_upload_connection'] = {
  'provider' => 'AWS',
  'region' => '${AWS_REGION}',
  'use_iam_profile' => true
}
gitlab_rails['backup_upload_remote_directory'] = '${S3_STORAGE_BUCKET}'
gitlab_rails['backup_archive_permissions'] = 0640
gitlab_rails['backup_keep_time'] = 604800

logging['log_directory'] = '/var/log/gitlab'
gitlab_rails['log_directory'] = '/var/log/gitlab/gitlab-rails'
sidekiq['log_directory'] = '/var/log/gitlab/sidekiq'
GITLAB_RB

  echo "gitaly['configuration'] = {
    storage: [
      {
        name: 'default',
        path: '/var/opt/gitlab/git-data/repositories'
      }
    ]
  }" >> /etc/gitlab/gitlab.rb

  # Reconfigure GitLab
  gitlab-ctl reconfigure

  # Create initial admin password from Secrets Manager
  local admin_password
  admin_password=$(aws secretsmanager get-secret-value \
    --secret-id "${project_name}-${environment}-rds-credentials" \
    --query SecretString --output text | jq -r '.password' || echo "CHANGE_ME_ADMIN_PASSWORD")

  gitlab-rails runner "user = User.find_by(username: 'root'); user&.update!(password: '$admin_password', password_confirmation: '$admin_password')" || true
}

health_check() {
  local retries=30
  local interval=10

  for i in $(seq 1 $retries); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost/users/sign_in" | grep -qE "200|302"; then
      echo "GitLab is healthy after $((i * interval)) seconds"
      return 0
    fi
    echo "Waiting for GitLab to start... attempt $i/$retries"
    sleep $interval
  done

  echo "GitLab failed to start within timeout"
  journalctl -u gitlab-runsvdir --no-pager -n 50
  return 1
}

main() {
  install_dependencies
  install_gitlab
  configure_gitlab
  health_check
}

main "$@"
