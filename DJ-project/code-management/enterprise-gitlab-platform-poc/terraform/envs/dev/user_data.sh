#!/usr/bin/env bash
set -euo pipefail

exec > >(tee /var/log/boa-platform-bootstrap.log | logger -t boa-platform-bootstrap) 2>&1

GITLAB_ROOT_PASSWORD='${gitlab_root_password}'
CONFIGURED_EXTERNAL_URL='${gitlab_external_url}'
BACKUP_BUCKET='${backup_bucket}'
AWS_REGION='${aws_region}'
ENABLE_LAB_SERVICES='${enable_lab_services}'

apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg lsb-release awscli jq unzip apt-transport-https software-properties-common

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" > /etc/sysctl.d/99-sonarqube.conf

mkdir -p /opt/boa-platform/{gitlab/config,gitlab/logs,gitlab/data,sonarqube/data,sonarqube/extensions,artifactory,etc,keycloak,prometheus,grafana/provisioning/datasources,artifactory-postgres}
chmod -R 777 /opt/boa-platform/sonarqube /opt/boa-platform/artifactory

mkdir -p /opt/boa-platform/artifactory/etc/security
if [ ! -f /opt/boa-platform/artifactory/etc/security/master.key ]; then
  openssl rand -hex 16 > /opt/boa-platform/artifactory/etc/security/master.key
fi
if [ ! -f /opt/boa-platform/artifactory/etc/security/join.key ]; then
  openssl rand -hex 16 > /opt/boa-platform/artifactory/etc/security/join.key
fi
ARTIFACTORY_MASTER_KEY=$(cat /opt/boa-platform/artifactory/etc/security/master.key)
ARTIFACTORY_JOIN_KEY=$(cat /opt/boa-platform/artifactory/etc/security/join.key)
cat > /opt/boa-platform/artifactory/etc/system.yaml <<ARTIFACTORY_SYSTEM
shared:
  database:
    type: postgresql
    driver: org.postgresql.Driver
    url: jdbc:postgresql://artifactory-postgres:5432/artifactory
    username: artifactory
    password: artifactory-poc-password
  security:
    masterKey: $${ARTIFACTORY_MASTER_KEY}
    joinKey: $${ARTIFACTORY_JOIN_KEY}
ARTIFACTORY_SYSTEM
chown -R 1030:1030 /opt/boa-platform/artifactory
chmod 600 /opt/boa-platform/artifactory/etc/security/*.key

TOKEN=$(curl -sS -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
PUBLIC_DNS=$(curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-hostname)
PUBLIC_IP=$(curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)

if [ -n "$CONFIGURED_EXTERNAL_URL" ]; then
  GITLAB_EXTERNAL_URL="$CONFIGURED_EXTERNAL_URL"
else
  GITLAB_EXTERNAL_URL="http://$PUBLIC_DNS"
fi

cat > /opt/boa-platform/prometheus/prometheus.yml <<PROMETHEUS
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: gitlab
    metrics_path: /-/metrics
    static_configs:
      - targets: ['gitlab:80']
  - job_name: sonarqube
    metrics_path: /api/system/status
    static_configs:
      - targets: ['sonarqube:9000']
PROMETHEUS

cat > /opt/boa-platform/grafana/provisioning/datasources/prometheus.yml <<GRAFANA
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
GRAFANA

cat > /opt/boa-platform/docker-compose.yml <<COMPOSE
services:
  gitlab:
    image: gitlab/gitlab-ce:latest
    container_name: gitlab
    restart: unless-stopped
    hostname: $${PUBLIC_DNS}
    shm_size: '256m'
    ports:
      - "80:80"
      - "443:443"
      - "2222:22"
      - "5050:5050"
    environment:
      GITLAB_ROOT_PASSWORD: "$${GITLAB_ROOT_PASSWORD}"
      GITLAB_OMNIBUS_CONFIG: |
        external_url "$${GITLAB_EXTERNAL_URL}"
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
        registry_external_url "$${GITLAB_EXTERNAL_URL}:5050"
        gitlab_rails['backup_keep_time'] = 1209600
        prometheus_monitoring['enable'] = true
        gitlab_rails['monitoring_whitelist'] = ['0.0.0.0/0']
        letsencrypt['enable'] = false
    volumes:
      - /opt/boa-platform/gitlab/config:/etc/gitlab
      - /opt/boa-platform/gitlab/logs:/var/log/gitlab
      - /opt/boa-platform/gitlab/data:/var/opt/gitlab
COMPOSE

if [ "$ENABLE_LAB_SERVICES" = "true" ]; then
  cat >> /opt/boa-platform/docker-compose.yml <<COMPOSE

  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    restart: unless-stopped
    depends_on:
      - gitlab
    ports:
      - "9000:9000"
    volumes:
      - /opt/boa-platform/sonarqube/data:/opt/sonarqube/data
      - /opt/boa-platform/sonarqube/extensions:/opt/sonarqube/extensions

  artifactory:
    image: releases-docker.jfrog.io/jfrog/artifactory-oss:latest
    container_name: artifactory
    restart: unless-stopped
    depends_on:
      - gitlab
      - artifactory-postgres
    ports:
      - "8081:8081"
      - "8082:8082"
    volumes:
      - /opt/boa-platform/artifactory:/var/opt/jfrog/artifactory

  artifactory-postgres:
    image: postgres:16-alpine
    container_name: artifactory-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: artifactory
      POSTGRES_USER: artifactory
      POSTGRES_PASSWORD: artifactory-poc-password
    volumes:
      - /opt/boa-platform/artifactory-postgres:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: keycloak
    restart: unless-stopped
    command: start-dev --http-enabled=true --hostname-strict=false --hostname=http://$${PUBLIC_DNS}:8080
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin-change-me
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME_STRICT: "false"
      KC_HOSTNAME: "http://$${PUBLIC_DNS}:8080"
    ports:
      - "8080:8080"

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - /opt/boa-platform/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro

  grafana:
    image: grafana/grafana-oss:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin-change-me
    ports:
      - "3000:3000"
    volumes:
      - /opt/boa-platform/grafana/provisioning:/etc/grafana/provisioning
COMPOSE
fi

cat > /usr/local/bin/backup-gitlab-to-s3 <<BACKUP
#!/usr/bin/env bash
set -euo pipefail
docker exec gitlab gitlab-backup create CRON=1
aws s3 sync /opt/boa-platform/gitlab/data/backups "s3://$${BACKUP_BUCKET}/gitlab/backups" --region "$${AWS_REGION}"
aws s3 sync /opt/boa-platform/gitlab/config "s3://$${BACKUP_BUCKET}/gitlab/config" --region "$${AWS_REGION}"
BACKUP
chmod +x /usr/local/bin/backup-gitlab-to-s3

cat > /etc/cron.d/gitlab-backup <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 2 * * * root /usr/local/bin/backup-gitlab-to-s3 >> /var/log/gitlab-backup.log 2>&1
CRON

cd /opt/boa-platform
docker compose up -d

cat > /opt/boa-platform/README-FIRST.txt <<INFO
Bank of America DevSecOps POC bootstrap complete.

GitLab URL: $${GITLAB_EXTERNAL_URL}
GitLab root username: root
GitLab root password: stored as Terraform sensitive output gitlab_root_password
Git over SSH port: 2222
Public IP: $${PUBLIC_IP}

Lab services enabled: $${ENABLE_LAB_SERVICES}
SonarQube: http://$${PUBLIC_DNS}:9000
Artifactory: http://$${PUBLIC_DNS}:8082
Keycloak: http://$${PUBLIC_DNS}:8080
Grafana: http://$${PUBLIC_DNS}:3000

Backups sync nightly to s3://$${BACKUP_BUCKET}/gitlab/.
INFO
