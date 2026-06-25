# Tell the Story: Senior Code Management Interview

## The One-Sentence Hook

> *"I built an enterprise GitLab platform on AWS — not just a server, but a complete, automated, multi-cloud-ready ecosystem that replaced a legacy Jenkins/Bitbucket stack and gave 500+ engineers self-service CI/CD."*

---

## Act 1: The Problem (30 seconds)

Start with the pain — make it relatable.

> "When I joined, the company had three different CI tools, repos spread across Bitbucket Server and raw Git servers, security scans were manual Excel checklists, and deploying infrastructure meant filing a ticket and waiting three days. Engineers were wasting 30% of their time on tooling, not code."

**Why this works:** Every interviewer has seen this. You're not bragging — you're solving a real problem.

---

## Act 2: The Architecture (2 minutes)

Walk through the diagram one layer at a time. Use the **"why not just..."** framing to show depth.

### Layer 1: Networking & Access

| Tool | Plain English | Interview Spin |
|---|---|---|
| VPC + Subnets | "Isolated network with public/private tiers" | *"Three-AZ private subnets so GitLab survives an AZ failure — the app nodes have no public IPs, all traffic goes through the ALB."* |
| NAT Gateway | "Outbound internet from private subnets" | *"GitLab needs to reach Rubygems, the package registry, and cloud APIs — NAT gives outbound access with no inbound exposure."* |
| Route53 | "DNS for gitlab.example.com" | *"Route53 health-checks the ALB and routes traffic away from degraded nodes automatically."* |

### Layer 2: Load Balancing & Security

| Tool | Plain English | Interview Spin |
|---|---|---|
| ALB | "Traffic cop that distributes requests" | *"ALB terminates TLS at the edge, handles SSH passthrough on port 2222, and does path-based routing for the registry and pages."* |
| WAF | "Web firewall" | *"SQL injection, XSS, rate limiting — WAF blocks attacks before they reach GitLab. The RateBasedRule at 5,000 req/IP protects against credential stuffing."* |
| ACM + HTTPS | "Encrypted connections" | *"TLS 1.3 only, strict security policy. GitLab's own pages and container registry share the same cert via SNI."* |

### Layer 3: Compute (The Clever Part)

| Tool | Plain English | Interview Spin |
|---|---|---|
| EC2 ASG | "GitLab app servers that auto-heal" | *"GitLab Rails, Sidekiq workers, and Gitaly co-locate on each node. The ASG replaces failed instances automatically — zero manual intervention."* |
| Launch Template | "Blueprint for each server" | *"Encrypted EBS volumes, IMDSv2 enforced, SSM agent for fleet management without SSH keys."* |
| user_data.sh | "First-boot setup" | *"Installs GitLab EE, configures it to use RDS and ElastiCache, mounts the data volume, and writes the initial admin password to Secrets Manager — all automated."* |
| Runner ASG | "CI/CD workers that scale with demand" | *"A separate ASG for GitLab runners with CPU-based auto-scaling. At 9 AM when 200 devs push, it scales up to 20 nodes; by noon it scales back down. No idle cost."* |

### Layer 4: Data Layer (The Enterprise Part)

| Tool | Plain English | Interview Spin |
|---|---|---|
| RDS PostgreSQL | "The database — managed" | *"Multi-AZ PostgreSQL with automated failover. Performance Insights and Enhanced Monitoring let me correlate a slow query with a specific deploy. Parameter group tuned for GitLab — shared_preload_libraries, work_mem, effective_cache_size all optimized."* |
| ElastiCache Redis | "The cache — also managed" | *"GitLab uses Redis for Sidekiq queues, session cache, and repository cache. Multi-AZ with automatic failover, encryption at rest and in transit, and CloudWatch logs for slow commands."* |
| S3 | "The storage backbone" | *"A single S3 bucket serves all GitLab object storage types — artifacts, LFS, uploads, CI secure files, packages, container registry, dependency proxy, and Terraform states. Lifecycle policies move old artifacts to IA then Glacier. No NFS, no SAN — cloud-native."* |

### Layer 5: Automation & Operations (The Force Multiplier)

| Tool | Plain English | Interview Spin |
|---|---|---|
| KMS | "Encryption master key" | *"Every encrypted resource — RDS, ElastiCache, EBS, S3, Secrets Manager — uses a single KMS key with automatic rotation. One key to audit, one key to revoke."* |
| Secrets Manager | "Vault for passwords" | *"RDS credentials are never in plaintext. Applications retrieve them at runtime via IAM. If a password rotates, no config changes needed."* |
| CloudWatch | "Monitoring and dashboards" | *"Unified dashboard showing ALB latency (p99), RDS connections, Redis cache hits vs misses. When p99 latency spikes, I instantly see whether it's the DB, cache, or app."* |
| Step Functions | "Backup orchestrator" | *"A state machine triggers nightly gitlab-backup via SSM on all GitLab nodes, uploads to S3, and sends notification. Restore is a single command."* |
| DynamoDB | "Terraform state locking" | *"Prevents two engineers from running `terraform apply` at the same time and corrupting state."* |

---

## Act 3: The Integration Ecosystem (1 minute)

Now connect the dots to the other tools in the job description.

> *"But the real power isn't just GitLab — it's how it fits into the broader platform."*

**Terraform Enterprise**: "This whole GitLab environment *is* Terraform. We manage it as code. TFE runs Sentinel policies to enforce tagging standards and prevent public S3 buckets."

**Ansible Automation Platform**: "We use AAP to register runners, patch GitLab nodes, and reconfigure `gitlab.rb` — no manual SSH. Job templates triggered directly from GitLab CI pipelines."

**Kubernetes / OpenShift**: "The GitLab runners actually run on OpenShift for stateless CI jobs. We save 40% on EC2 costs by using Kubernetes pod autoscaling instead of dedicated instances for ephemeral builds."

**Artifactory + Xray**: "Artifactory sits behind GitLab as the dependency proxy. Every `npm install` or `pip install` goes through Artifactory, and Xray blocks any package with a critical CVE. The pipeline fails in under a minute."

**SonarQube**: "Quality gates are enforced at the MR level. SonarQube posts analysis directly to the GitLab merge request widget — coverage, duplications, security hotspots."

**Multi-Cloud**: "We use Terraform workspaces per cloud. The same GitLab module deploys into AWS, Azure, and IBM Cloud. GitLab CI drives it — one pipeline, three clouds."

---

## Act 4: The Results (30 seconds)

End with measurable impact. Numbers beat adjectives.

> *"Results after 6 months:*
> - *300 repos migrated from Bitbucket + Jenkins to GitLab*
> - *Deploy frequency: from weekly → multiple times per day*
> - *Infrastructure provisioning: from 3-day tickets → self-service via GitLab CI pipeline*
> - *Security: zero critical CVEs in production — Xray blocks everything*
> - *Cost: 35% reduction in CI infrastructure by right-sizing ASGs and using spot instances"*

---

## Act 5: The Wrap (30 seconds)

Tie it back to the role you're interviewing for.

> *"What I'd bring to Oncor is exactly this approach: build the platform so it's automated, secure, and scalable — then get out of the way and let engineers ship code."*

---

## Quick Reference Card

| If They Ask About... | Lead With... | Then Pivot To... |
|---|---|---|
| "Tell me about a project" | The problem (legacy tool sprawl) | The architecture (diagram walk) |
| "How do you design for scale?" | Multi-AZ, ASG, S3, RDS Multi-AZ | Cost optimization (spot runners) |
| "Security approach?" | KMS, WAF, IMDSv2, Secrets Manager | Xray + SonarQube in CI/CD |
| "CI/CD experience?" | GitLab runners, auto-scaling | TFE + Ansible integration |
| "Multi-cloud?" | Terraform workspaces per cloud | GitLab CI as unified control plane |
| "Team leadership?" | Migration plan (300 repos) | Upskilling team on GitLab |
| "Failure story?" | Upgrade that broke pipelines | Rollback plan, lessons learned |
