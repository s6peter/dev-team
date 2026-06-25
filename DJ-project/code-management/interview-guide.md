# Senior Code Management Interview Guide

## Role Context
Enterprise team modernizing software delivery ecosystem → automated, scalable GitLab-centric platform.

---

## 1. GitLab Self-Managed (Core)

### Architecture & Administration
- **Horizontal scaling**: Describe GitLab architecture (Puma, Sidekiq, Gitaly, Rails). How would you scale each component?
- **Reference architectures**: Walk through Omnibus vs Helm Chart vs GitLab Operator deployments. When would you choose each?
- **PostgreSQL**: GitLab requires Patroni (or cloud-managed PG). How do you handle HA, failover, point-in-time recovery?
- **Redis**: Sentinel vs Cluster mode. Persistent vs cache Redis for GitLab.
- **Gitaly Cluster**: Praefect, virtual storage, reconciliation. When does Gitaly become the bottleneck?
- **Backup/Restore**: `gitlab-backup create`, object storage sync, disaster recovery across regions.
- **Upgrades**: Zero-downtime upgrade paths, version pinning, rollback strategy.

### Troubleshooting Scenarios
- "Sidekiq queue is backed up — what do you check?"
- "Users report 502 errors after a GitLab upgrade."
- "A push is rejected with 'internal API unreachable'."
- "Repository replication lag between Gitaly nodes."

### CI/CD
- **Runners**: shared vs specific, autoscaling with Docker Machine or Kubernetes, cache strategies.
- **CI/CD pipeline design**: multi-stage, parallel jobs, needs/artifacts, DAG.
- **Security scanning**: SAST/DAST/secret detection/license compliance integration.
- **Deployment strategies**: canary, blue-green via GitLab environments and review apps.

**Sample question**: "Design an auto-scaling GitLab runner fleet for 200 developers with peak load at 9 AM and 2 PM."

---

## 2. Terraform Enterprise

### Core Concepts
- **TFE vs OSS**: Sentinel policies, private module registry, RBAC, workspaces, run tasks.
- **State management**: remote state, locking, migration strategies. How do you handle state in TFE?
- **Module design**: composition vs inheritance, versioning, registry structure.
- **Policy as Code**: Sentinel policies for cost control, security compliance, tagging standards.
- **Run Tasks**: integrating external tools (e.g., Infracost, Checkov) into the Terraform run lifecycle.

### Multi-Cloud Patterns
- **Workspace strategy**: one workspace per environment vs per component vs per team. Trade-offs.
- **Remote operations**: how TFE executes plans/applies, agent pools for private network access.
- **VCS integration**: monorepo vs multi-repo, branch-based workflows, merge queue.

**Sample question**: "How would you structure Terraform workspaces and modules for a multi-account AWS + Azure environment used by 10 product teams?"

---

## 3. Ansible Automation Platform

### Automation Patterns
- **AAP components**: controller, hub, execution environments, automation mesh.
- **Execution environments**: containerized runtimes, custom EE build process, dependency management.
- **Inventory management**: dynamic inventories from cloud (AWS EC2, Azure VMSS), GitLab CI integration.
- **Job templates**: survey-based templates, credential injection, workflow templates.
- **Role strategy**: Ansible Galaxy vs private automation hub, collection lifecycle.

### Integration with GitLab
- Trigger AAP job templates from GitLab CI via webhook/tower-cli.
- GitLab as inventory source (projects → hosts mapping).
- AAP managing GitLab infrastructure (runner registration, config drift).

**Sample question**: "You need to patch 500 servers across 3 clouds with zero downtime. Design the AAP workflow."

---

## 4. Kubernetes / OpenShift

### GitLab on K8s
- **GitLab Helm Chart**: resource sizing, persistent volumes, ingress, Sidekiq PodDisruptionBudget.
- **GitLab Operator**: Custom Resource Definitions, reconciliation loop, upgrades.
- **Runner on K8s**: executor=kubernetes, RBAC, node selectors, tolerations, pod overcommit.
- **CI/CD integration**: deploy to OpenShift via `oc` / `kubectl` in GitLab CI, ArgoCD integration.

### Operational Knowledge
- **Pod networking**: CNI (Calico, Cilium), network policies, service mesh (Istio/OpenShift Service Mesh).
- **Storage**: CSI drivers, RWX vs RWO, PVC lifecycle, backup (Velero).
- **Security**: Pod Security Standards, OPA/Gatekeeper, container image scanning with Xray.
- **OpenShift specifics**: SCC, Routes vs Ingress, OperatorHub, machine management.

**Sample question**: "A GitLab CI job running on a Kubernetes executor fails with `error: container has runAsNonRoot but image has no specified user`. Debug and fix."

---

## 5. Artifactory, SonarQube & Xray

### Artifactory
- **Repository types**: local, remote, virtual. When to use each.
- **Binary management**: Docker registry, Helm repo, Maven/NPM/PyPI repos.
- **High availability**: Multi-node HA, database replication, filestore (NFS vs S3).
- **Cleanup policies**: AQL queries, binary retention, artifact lifecycle.
- **GitLab integration**: artifactory as CI/CD pipeline cache/dependency proxy/deploy target.

### SonarQube
- **Quality gates**: define "green" builds, condition thresholds (coverage, duplications, security hotspots).
- **Branch analysis**: PR decoration, long-lived vs short-lived branch analysis.
- **GitLab integration**: MR status checks via SonarQube webhook, `sonar-scanner` in CI.
- **Scalability**: compute engine workers, Elasticsearch cluster, external DB.

### Xray
- **Binary analysis**: impact analysis, dependency graph, license compliance.
- **Policies & watches**: severity-based blocking, nightly scans, build-triggered scans.
- **Integration with Artifactory**: indexing, fail-build policies.
- **GitLab integration**: Xray scan results blocking merge requests via API.

**Sample question**: "A critical CVE is published for Log4j. Walk through how you'd identify impact across all artifacts in Artifactory using Xray and block deployments."

---

## 6. Multi-Cloud (AWS, Azure, IBM Cloud)

### Strategy
- **Cloud-agnostic vs native services**: GitLab on EC2 vs RDS for PG vs AWS S3 for storage. Trade-offs.
- **Cost management**: reserved instances, storage tiering (S3 Standard → Glacier), spot instances for runners.
- **Network topology**: cross-cloud connectivity (Direct Connect, VPN, Transit Gateway).
- **Identity federation**: OIDC for GitLab CI to access AWS/Azure/IBM without static keys.

### Platform Engineering
- **GitLab as control plane**: GitLab CI driving Terraform + Ansible to provision multi-cloud infra.
- **Self-service patterns**: GitLab templates + Terraform workspaces for developer environments.
- **Observability**: CloudWatch + Azure Monitor + Datadog dashboards for GitLab infra.

**Sample question**: "Engineers need temporary dev environments in any cloud. Design a self-service platform using GitLab, Terraform, and Ansible."

---

## 7. Behavioral / Leadership

- **Incident response**: "A GitLab outage is blocking deployments for 300 engineers. Walk through your response."
- **Migration**: "Migrating 500 repos from Bitbucket Server + Jenkins to GitLab in 6 months. Your plan?"
- **Team maturity**: "Your team has no CI/CD experience. How do you upskill and introduce automated pipelines?"
- **Platform trade-offs**: Custom vs vendor solution. When do you build vs buy?

---

## 8. Mock Interview Questions to Practice

| Category | Question |
|---|---|
| GitLab | "How would you migrate 10TB of Git data from Bitbucket to GitLab with zero data loss?" |
| Terraform | "Design a Terraform module structure for a 3-environment, 2-cloud deployment." |
| Ansible | "How do you manage secrets across 2000 hosts with App automation?" |
| K8s | "A pod is in CrashLoopBackOff. Walk through your debugging process." |
| SonarQube | "Your quality gate passes but production crashes due to a bug. What's wrong with your quality process?" |
| Xray | "How do you enforce 'no open-source library with a critical CVE' across all builds?" |
| Multi-Cloud | "Compare GitLab's cloud-native deployment on EKS vs AKS vs IBM Cloud Code Engine." |
