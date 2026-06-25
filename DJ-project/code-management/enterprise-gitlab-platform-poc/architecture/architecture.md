# Architecture

```text
Developer
  |
  v
GitLab Self-Managed on AWS EC2
  |-- Groups, projects, RBAC, protected branches
  |-- CI/CD templates
  |-- Backup to S3
  |-- SAML/SSO lab through Keycloak
  |
  v
GitLab Runner
  |-- POC: local/shared runner or optional EKS runner
  |-- EKS: Kubernetes executor creates one pod per job
  |
  v
Pipeline Controls
  |-- Unit tests
  |-- SonarQube quality scan
  |-- GitLab SAST, dependency, secret, and container scanning
  |-- Artifactory image publish
  |-- Xray design or Trivy fallback
  |
  v
GitOps
  |-- GitLab CI updates manifest image tag
  |-- Argo CD watches gitops/dev, gitops/stage, gitops/prod
  |-- EKS runs application workloads
  |
  v
Operations
  |-- Prometheus/Grafana monitoring
  |-- Ansible hardening and backups
  |-- Manual protected incident remediation jobs
```

## POC AWS Resources

```text
VPC
  Public subnet A
  Public subnet B
  Internet Gateway
  Route table

EC2 all-in-one platform host
  Docker Compose
    GitLab CE
    SonarQube Community
    Artifactory OSS
    Keycloak
    Prometheus
    Grafana

S3 backup bucket
IAM role and instance profile
Security group restricted by admin_cidr
Optional EKS cluster and managed node group
```

