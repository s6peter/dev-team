# Peter Oysten

Dallas, TX | +1 605 690 1809 | oystenpeter@outlook.com

## Professional Summary

DevSecOps and Platform Automation Engineer with 6+ years of experience building secure cloud-native software delivery platforms across AWS, Kubernetes, GitLab CI/CD, Terraform, ArgoCD, Ansible, SonarQube, Artifactory, and observability tooling. Experienced designing GitLab-centric platform architecture using self-managed GitLab, EKS-based runners, GitOps workflows, infrastructure as code, and secure software supply chain controls. Strong background in application security, CI/CD security automation, Kubernetes platform engineering, SBOM automation, vulnerability management, and developer enablement. Adept at partnering with engineering, security, and infrastructure teams to modernize delivery ecosystems and improve speed, governance, reliability, and compliance.

## Core Competencies

- GitLab Self-Managed, GitLab CI/CD, GitLab Runner, Kubernetes executor, runner tags, protected runners
- Cloud Native GitLab architecture, EKS, Helm, Terraform Enterprise, AWS infrastructure automation
- GitOps with ArgoCD, Ansible configuration management, Kubernetes platform add-ons
- SonarQube quality gates, Artifactory artifact workflows, secure container delivery
- SAST, SCA, DAST, SBOM, dependency scanning, secret detection, container scanning
- AWS VPC, IAM, IRSA, ALB, ACM, WAF, KMS, S3, Secrets Manager, CloudWatch
- Prometheus, Grafana, Datadog, OpenSearch, platform dashboards, alerting, incident response
- Secure SDLC, OWASP Top 10, API security, compliance alignment, developer enablement

## Technical Skills

Cloud and Platform: AWS, Amazon EKS, Kubernetes, GKE, VMware, Hyper-V

GitLab and CI/CD: GitLab Self-Managed, GitLab CI/CD, GitLab Runner, GitHub Actions, CI/CD templates, pipeline security gates

Infrastructure as Code: Terraform, Terraform Enterprise, Helm, Ansible, Bash, Python, Groovy

GitOps and Deployment: ArgoCD, Kubernetes manifests, Helm values, environment promotion, deployment automation

Security and DevSecOps: SAST, SCA, DAST, SBOM, WAF, API Security, Secure Code Review, Dependency Scanning, Secret Detection

Security Tools: SonarQube, StackHawk, Dependency-Track, DefectDojo, Syft, CycloneDX, SPDX, Trivy

Artifact and Supply Chain: Artifactory, container image scanning, Chainguard Images, Wolfi, SLSA, open-source risk management

Observability: Prometheus, Grafana, Datadog, PagerDuty, Jira, Confluence, OpenSearch

Governance: CIS Benchmarks, SOC 2, ISO 27001, NIST, PCI-DSS, GDPR

## Professional Experience

## DevSecOps Engineer | EK Tech Solutions, TX

June 2020 - Present

- Built reusable CI/CD security pipeline templates for application and AI application workloads, automating SAST, SCA, DAST, dependency scanning, secret detection, SBOM generation, model evaluation, prompt testing, and deployment approval controls.
- Partnered with engineering and platform teams to embed security gates into GitHub Actions and GitLab-style CI/CD workflows, preventing releases with unresolved critical vulnerabilities and improving policy adherence by 50%.
- Automated CycloneDX and SPDX SBOM generation to improve software supply chain visibility, dependency tracking, license risk management, and vulnerability response.
- Implemented secure container pipelines using Wolfi and Chainguard hardened images, reducing container attack surface and improving continuous CVE patching.
- Architected a defense-in-depth API security framework on AWS using EKS, Istio service mesh, Amazon Cognito, API Gateway, AWS WAF, JWT validation, service-level authorization, and encrypted workload communication.
- Strengthened Kubernetes service-to-service security using Istio mTLS and AWS Certificate Manager integration, eliminating unencrypted east-west traffic between workloads.
- Implemented least-privilege IAM with IRSA to restrict AWS resource access from Kubernetes workloads and reduce lateral movement risk.
- Built executive and engineering dashboards for vulnerability trends, scan coverage, remediation aging, policy exceptions, and team compliance, reducing manual reporting effort by 12 hours per month.
- Improved developer adoption by tuning false positives, refining severity thresholds, creating remediation guidance, and delivering secure coding training, reducing repeated findings by 40%.
- Supported governance for AI-assisted development by documenting acceptable use, onboarding controls, data handling requirements, and security review criteria.

## Platform Automation Engineer | EK Tech Solutions, TX

May 2018 - May 2020

- Supported an enterprise platform modernization initiative focused on building a scalable GitLab-centric software delivery ecosystem across AWS, Kubernetes, Terraform Enterprise, ArgoCD, Ansible, SonarQube, and Artifactory.
- Designed a production-aligned Cloud Native GitLab target architecture on Amazon EKS, separating GitLab application components, runner manager pods, temporary CI job pods, object storage, secrets, and managed data services into clear operational boundaries.
- Built Terraform and Terraform Enterprise modules for AWS platform foundations, including VPC, private subnets, IAM, security groups, EKS node groups, ALB ingress, ACM TLS, WAF integration, KMS keys, S3 buckets, and Secrets Manager patterns.
- Automated GitLab Runner deployment on EKS using Helm and the Kubernetes executor, allowing jobs to run as short-lived pods with runner tags, resource controls, cache configuration, and namespace isolation.
- Designed runner operating models for shared runners, group runners, project runners, protected deployment runners, and specialized image-build/security runners to support scalable and governed CI/CD execution.
- Implemented GitOps workflows with ArgoCD so Kubernetes environments were reconciled from Git repositories, reducing manual deployment effort and cutting deployment time by 60%.
- Used Ansible to automate host configuration, Linux hardening, service setup, package installation, and operational runbooks across platform components.
- Integrated SonarQube quality scans and Artifactory artifact publishing into CI/CD workflows, supporting test, quality gate, build, security scan, publish, and deployment stages.
- Implemented Kubernetes platform add-ons such as Istio, Kyverno, Cluster Autoscaler, CNI drivers, and CSI drivers to improve service mesh security, policy enforcement, scalability, and workload resilience.
- Implemented metrics-driven autoscaling using Istio Envoy metrics and KEDA to scale workloads based on request throughput and latency, reducing latency incidents by 30% and improving reliability under peak load by 50%.
- Built Prometheus, Grafana, Datadog, and OpenSearch integrations for platform observability, runner utilization, CI/CD health, workload metrics, logs, and operational alerting.
- Collaborated with security and infrastructure stakeholders to define production readiness patterns for TLS, WAF, least-privilege IAM, Kubernetes network segmentation, secrets management, backup strategy, and auditability.

## IT Support Specialist | University of Cape Coast, Ghana

June 2014 - June 2016

- Resolved 30+ weekly support tickets for hardware, software, networking, workstation, and account access issues.
- Supported endpoint imaging, backup, restoration, and troubleshooting procedures in accordance with university IT policies.
- Assisted faculty, staff, and students with operating system support, productivity tools, and network connectivity.

## Selected Project Narrative

Enterprise GitLab Platform Modernization: Designed and documented a production-ready GitLab platform model using Cloud Native GitLab on EKS, Route 53, ALB, ACM TLS, WAF, RDS PostgreSQL, ElastiCache Redis, S3 object storage, KMS, Secrets Manager, GitLab Runner Kubernetes executor, ArgoCD GitOps, SonarQube, Artifactory, Prometheus, and Grafana. The architecture separated GitLab application pods from CI job pods, used dedicated runner namespaces and node groups, and supported scalable pipeline execution through ephemeral Kubernetes job pods.

## Education

- Master of Science in Mathematics, South Dakota State University, USA, 2016 - 2018
- Bachelor of Science in Mathematics with Economics, University of Cape Coast, Ghana, 2010 - 2014

## Certifications

- HashiCorp Certified Terraform Associate
- AWS Certified AI Practitioner, in progress
