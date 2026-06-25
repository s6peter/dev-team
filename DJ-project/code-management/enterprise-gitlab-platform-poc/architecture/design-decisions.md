# Design Decisions

## Decision 1: EC2 All-In-One for the POC

Chosen for cost and speed. GitLab, SonarQube, Artifactory OSS, Keycloak, Prometheus, and Grafana run as Docker Compose services on one EC2 instance.

Production alternative: GitLab reference architecture with ALB, private EC2 or EKS, RDS PostgreSQL, ElastiCache Redis, S3 object storage, WAF, Route 53, ACM, and KMS.

## Decision 2: Optional EKS

EKS is disabled by default because the control plane has hourly cost. When enabled, it proves Kubernetes runner execution, app namespaces, Argo CD GitOps, and Kubernetes deployment skills.

Production alternative: private EKS nodes, managed node groups or Karpenter, IRSA, network policies, managed add-ons, and centralized observability.

## Decision 3: SonarQube Community

SonarQube Community is enough to demonstrate code quality gates in a POC.

Production alternative: SonarQube Developer or Enterprise for branch analysis, pull request decoration, and enterprise governance.

## Decision 4: Artifactory OSS plus Trivy as Xray Fallback

Xray typically requires a commercial or trial license. This POC uses Artifactory OSS for artifact repository concepts and Trivy/GitLab scanning as the open-source vulnerability scanning fallback.

Production alternative: JFrog Platform with Artifactory HA and Xray policies/watches that block promotion of vulnerable artifacts.

## Decision 5: Keycloak for SAML/SSO Lab

Keycloak demonstrates the identity integration pattern without requiring a corporate IdP.

Production alternative: Bank enterprise SAML or OIDC provider, LDAP integration, SCIM lifecycle management, and RBAC mapped from identity groups.

## Decision 6: GitOps with Argo CD

GitLab CI builds and validates; Argo CD deploys from the GitOps repository. This separates CI from cluster reconciliation and provides rollback/audit history.

Production alternative: Argo CD app-of-apps, separate environment repos, signed commits, sync windows, and promotion approvals.

