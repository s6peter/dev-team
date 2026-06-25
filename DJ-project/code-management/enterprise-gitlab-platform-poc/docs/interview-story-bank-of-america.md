# Interview Story: Enterprise GitLab Software Factory for Bank of America

## 30-Second Version

"I built a proof-of-concept enterprise GitLab software factory on AWS for a banking environment. I used Terraform to provision the AWS foundation, Ansible for operational hardening and backups, GitLab admin-as-code for groups and branch protection, reusable GitLab CI templates for application onboarding, SonarQube for quality gates, Artifactory for artifact management, Xray-style vulnerability governance with a Trivy fallback, and optional EKS runners with Argo CD GitOps deployment."

## The Business Story

"The problem I was solving was tool fragmentation. Application teams need a consistent way to create projects, run tests, scan code, publish artifacts, and deploy safely. In a bank, that also has to be auditable, repeatable, and controlled by RBAC. So I designed the platform as a golden path: teams use standard GitLab groups, standard pipeline templates, standard security scans, standard artifact publishing, and standard GitOps deployment."

## Why I Chose This Installation Option

"For the POC, I chose Docker Compose on a single EC2 instance because it is the lowest-cost way to prove the integrations. I can show GitLab, SonarQube, Artifactory, Keycloak, Prometheus, and Grafana without standing up a full production HA architecture. I also included optional EKS so I can demonstrate Kubernetes executor runners and GitOps when needed."

"For production, I would not keep it all on one host. I would move GitLab behind an ALB, run in private subnets, use RDS PostgreSQL, ElastiCache Redis, S3 object storage, KMS encryption, WAF, ACM TLS, Route 53 DNS, and enterprise SAML/OIDC. The POC is deliberately small, but the design maps to the production architecture."

## Installation Options I Can Discuss

| Option | When I Would Choose It |
|---|---|
| GitLab SaaS | When the company wants the least operational burden and SaaS satisfies regulatory controls |
| GitLab Omnibus on EC2 | When the company wants self-managed control with straightforward Linux operations |
| GitLab Docker on EC2 | For a lab or POC that needs fast reproducibility and low cost |
| GitLab Helm on EKS/OpenShift | When the organization is mature in Kubernetes operations and wants pod-level scaling |
| GitLab Dedicated/Managed | When enterprise control is needed but the company wants vendor-operated infrastructure |

## Why Not Production HA for the POC

"The goal was proof of capability, not unnecessary spend. A full HA GitLab stack with ALB, RDS, Redis, EKS, NAT gateways, and multiple nodes is a better production pattern, but it is expensive for a portfolio project. I used the POC to prove the workflows and documented how to evolve it to production."

## How Each Tool Fits

| Tool | Role in the Story |
|---|---|
| GitLab | Source control, merge requests, CI/CD, groups, projects, RBAC |
| Terraform | Provisions AWS infrastructure and manages GitLab admin resources |
| Ansible | Hardens the host, performs service checks, runs backups |
| AWS EC2 | Runs the low-cost all-in-one platform host |
| AWS S3 | Stores GitLab backups and configuration copies |
| AWS IAM | Grants least-privilege backup and SSM permissions |
| AWS EKS | Optional runner and application workload cluster |
| GitLab Runner | Executes CI/CD jobs; optional Kubernetes executor creates isolated pods |
| SonarQube | Enforces code quality and maintainability gates |
| Artifactory | Central artifact and container repository |
| Xray | Production artifact vulnerability and license policy enforcement |
| Trivy | Open-source vulnerability scanning fallback for the POC |
| Keycloak | SAML/SSO lab identity provider |
| Argo CD | GitOps deployment and Kubernetes reconciliation |
| Prometheus/Grafana | Metrics and dashboards |

## End-to-End Flow I Would Explain

1. "A developer pushes code to GitLab and opens a merge request."
2. "Branch protection ensures nobody bypasses review on `main`."
3. "The project includes the standard platform CI templates."
4. "A runner picks up the pipeline. In the Kubernetes version, each job runs as an isolated pod."
5. "The test stage runs unit tests."
6. "SonarQube scans the code and enforces the quality gate."
7. "GitLab SAST, dependency scanning, secret detection, and container scanning add DevSecOps coverage."
8. "The Docker image is built and published to Artifactory."
9. "In production, Xray policies block promotion of vulnerable artifacts. In this POC, Trivy is the open-source fallback."
10. "The deploy job updates the GitOps manifest with the new image tag."
11. "Argo CD sees the Git change and syncs the Kubernetes environment."
12. "Prometheus and Grafana track platform and runner health."
13. "Backups are sent to S3 and restore steps are documented."

## Strong Interview Answer for GitLab Administration

"I managed GitLab as a platform, not just as a repo server. I created groups for platform engineering, application teams, and security engineering; created projects for CI templates, infrastructure, GitOps config, and a sample application; enforced protected branches; managed project variables; and documented onboarding. The idea was to make team onboarding repeatable and auditable."

## Strong Interview Answer for Runners at Scale

"For the POC I can run with a simple runner, but the design includes EKS-based runners using the Kubernetes executor. That model creates a clean pod per job, lets me isolate workloads with namespaces and resource limits, and scales better than running all builds on the GitLab server. In production, I would add autoscaling node groups, runner concurrency limits, cache tuning, and separate runner pools for privileged builds."

## Strong Interview Answer for Artifactory and Xray

"Artifactory is the system of record for build outputs. Instead of every pipeline pulling from the internet and pushing wherever it wants, dependencies and images go through a controlled repository. Xray then evaluates those artifacts for CVEs and license issues. If a critical vulnerability is found, promotion is blocked before deployment. Because Xray needs licensing, the POC uses Trivy to demonstrate the blocking pattern."

## Strong Interview Answer for GitOps

"CI should prove that the artifact is good. CD should reconcile the environment from a desired-state repository. That is why the pipeline updates a GitOps manifest and Argo CD performs the deployment. It gives audit history, rollback through Git, and clear separation between build and deploy."

## Failure Story You Can Tell

"One risk in platforms like this is runner saturation. If many teams push at 9 AM, jobs can get stuck and people think GitLab is down. I addressed that by separating GitLab from runners and using the Kubernetes executor so jobs run as short-lived pods. I also added runner troubleshooting and cleanup runbooks, plus manual protected remediation jobs. That turns an incident into a repeatable response instead of ad hoc debugging."

## Resume Bullet

Designed and implemented a proof-of-concept enterprise GitLab software factory on AWS using Terraform and Ansible, including GitLab administration as code, reusable CI/CD templates, SonarQube quality gates, Artifactory/Xray-style artifact governance, optional EKS Kubernetes runners, Argo CD GitOps deployments, S3 backups, RBAC guardrails, monitoring, and operational runbooks.

