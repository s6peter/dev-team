A Reference Architecture is GitLab’s blueprint for how to build a scalable, production GitLab environment. The GitLab Environment Toolkit uses these blueprints, then Terraform provisions the infrastructure and Ansible configures GitLab based on the selected architecture.  
   
**GitLab Reference Architectures** are GitLab’s official recommended designs for running  **self-managed GitLab at scale**.  
They tell you things like:  
- How many servers or nodes you need  
- What GitLab components should run separately  
- How much CPU/RAM each component needs  
- Whether the setup supports High Availability  
- What size environment it supports, such as 1,000, 3,000, 10,000, 25,000, or 50,000 users  
- Example VM sizes for AWS, GCP, and Azure  
- When to use Omnibus/Linux Package vs Cloud Native Hybrid/Kubernetes  
   
**Terraform Project Walkthrough: File-by-File Interview Guide**  
This guide breaks down every file in the terraform-gitlab-aws/ project and explains what to say about it in an interview.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OQQmAABRAsad4FSNY9ecwnkms4E2ELcGWmTmrKwAA/uLeqrU6vp4AAPDa/gD9EAM/fQiNUgAAAABJRU5ErkJggg==)  
providers.tf** — Foundation & Guardrails**  
**What it does:** Declares Terraform version, AWS provider, and remote S3 backend.  
**Why it matters to an interviewer:**  
- Version pinning shows you understand breaking changes  
- S3 backend + DynamoDB locking = team collaboration, not cowboy apply  
- Region-agnostic via variable → reusable for multi-region DR  
**Say this:**  
*"I pin the AWS provider to ~> 5.0 so we don't get surprise breaking changes. The S3 backend with DynamoDB locking means the whole platform team can run Terraform safely — no stepping on each other."*  
**Counter question they might ask:** "Why not Terraform Cloud?"  
   
 **Your answer:** *"TFE is in the stack too — we use TFE for higher-level orchestration workspaces. This state lives in S3 because it's the foundational infrastructure that even TFE depends on. Bootstrap pattern."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OQQmAABRAsSfYxZo/khWsYQLPJrCCNxG2BFtmZquOAAD4i3Ot7mr/egIAwGvXA4qjBdKlX6OKAAAAAElFTkSuQmCC)  
variables.tf** — Configuration Surface**  
**What it does:** All tunable knobs with sensible defaults.  
**Hot variables to highlight:**  
| | |  
|-|-|  
| **Variable** | **Why Interviewers Care** |   
| gitlab_instance_count = 2 | You know GitLab needs HA (minimum 2 nodes for zero-downtime upgrades) |   
| db_multi_az = true | You understand databases need automatic failover |   
| runner_min/max_count | You've thought about CI burst scaling, not just fixed capacity |   
| backup_retention_days = 30 | You have an actual backup strategy with recovery objectives |   
| gitlab_trusted_ips | You know about GitLab RCE risks — admin UI should be restricted |   
   
**Say this:**  
*"Every parameter is variab* *le-driven. When we onboarded a new team, we'd adjust runner_max_count per environment. The defaults encode production best practices — Multi-AZ RDS, encrypted storage, 30-day retention — but every team can tune their own instance sizes and scaling limits."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAM0lEQVR4nO3OUQmAQBBAwSdcjsu6HYxoDsEK/okwk2COmdnVGQAAf3GtalX76wkAAK/dDxFWBDkFf6+SAAAAAElFTkSuQmCC)  
main.tf** — Networking (The Foundation)**  
**What it does:** VPC, 4 subnet tiers (public/private/database/elasticache), NAT gateways, route tables.  
**The story to tell:**  
*"Most people throw everything in one subnet. I separate int* *o four tiers so the database and Redis are in isolated subnets — no app node can directly reach them, only via the security group. NAT gateways in each AZ prevent cross-AZ data transfer costs. The database subnet group lets RDS choose any AZ for failover."*  
**Interview depth-chart:**  
| | |  
|-|-|  
| **If they ask...** | **You say...** |   
| "Why 3 AZs?" | *"AWS recommends 3 for production. GitLab's Sidekiq queues need at least 2 nodes to drain during rolling upgrades."* |   
| "Why separate database subnets?" | *"RDS creates read replicas in any AZ within the subnet group. Isolating DB subnets means I can apply different network ACLs and VPC endpoints."* |   
| "NAT in every AZ vs one shared?" | *"Per-AZ NAT avoids a single point of failure and keeps cross-AZ data transfer at zero. Worth the extra NAT Gateway cost for production."* |   
   
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OQQmAABRAsSeYxZw/lVeDGMACBrCCNxG2BFtmZquOAAD4i3Ot7mr/egIAwGvXA6fOBdd+dKAKAAAAAElFTkSuQmCC)  
security.tf** — Defense in Depth**  
**What it does:** KMS key, 4 security groups, ingress/egress rules.  
**The story to tell:**  
*"Four security groups with least-privilege rules. The ALB only allows 443 and 2222 from the internet. The GitLab app group only* * accepts traffic from the ALB. The RDS group only allows PostgreSQL from the gitlab group. Redis only allows 6379 from gitlab. No 'allow all' rules — even outbound is the only one that's open, because GitLab needs to reach package registries and webhooks."*  
**KMS key detail:**  
*"I conditionally create a K* *MS key if one isn't provided — you might already have a central key. Rotation is enabled, so compliance audits are happy. This single key encrypts RDS, ElastiCache, EBS volumes, S3 buckets, and Secrets Manager secrets. One key to manage, one key to audit."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OQQmAUBBAwSd8bOHVnBvBkAaxgjcRZhLMNjNHdQUAwF/cq9qr8+sJAACvrQctgQNH4A++9QAAAABJRU5ErkJggg==)  
database.tf** — Enterprise PostgreSQL**  
**What it does:** RDS PostgreSQL 16, custom parameter group, Secrets Manager, Enhanced Monitoring IAM role.  
**The story to tell:**  
*"GitLab recommends PostgreSQL 16 with specific tuning. The* * parameter group enables pg_stat_statements for query monitoring, sets work_mem to 64MB for complex queries, and configures effective_cache_size to 75% of instance memory. These aren't default values — they come from GitLab's own production documentation."*  
**Secrets Manager detail:**  
*"Credentials are generated randomly at apply time and stored in Secrets Manager. No hardcoded passwords in gitlab.rb or CI variables. The password is 32 characters of entropy — meets any compliance requirement."*  
**When they push back:**  
| | |  
|-|-|  
| **Challenge** | **Response** |   
| "Why not Aurora?" | *"Aurora PostgreSQL is great, but GitLab's documented reference architecture uses standard RDS with Multi-AZ. Aurora's I/O costs can surprise teams with high CI artifact traffic. We stay with RDS for predictable pricing."* |   
| "Why not the GitLab bundled PostgreSQL?" | *"Bundled PG ties GitLab upgrades to DB upgrades and doesn't support Multi-AZ. Managed RDS gives us point-in-time recovery, automated backups, and read replicas for CI load."* |   
   
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OUQmAABBAsSdYxKbXxlpGEAOIFfwTYUuwZWa2ag8AgL841uquzq8nAAC8dj05VAYO3phhoQAAAABJRU5ErkJggg==)  
cache.tf** — Redis Without the Ops**  
**What it does:** ElastiCache Redis 7.1, cluster mode disabled, Multi-AZ, encryption.  
**The story to tell:**  
*"GitLab uses Redis for three things: Sidekiq job queues, session state, and repository cache.* * Cluster mode is overkill for most GitLab deployments — a single large node with 13GB RAM handles thousands of users. Multi-AZ with automatic failover is non-negotiable because if Redis goes down, Sidekiq stops processing jobs and merge requests queue up."*  
**Parameter tuning:**  
*"I set maxmemory-policy to allkeys-lru and enable keyspace notifications for GitLab's real-time features. The timeout=60 prevents stale connections from accumulating."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OQQmAABRAsSd49m4v6wg/pwmMYQVvImwJtszMXp0BAPAX91pt1fH1BACA164Hoq8EQMMPmF8AAAAASUVORK5CYII=)  
storage.tf** — The Cloud-Native Bet**  
**What it does:** 3 S3 buckets (GitLab storage, Terraform state, CI cache), DynamoDB lock table, lifecycle rules.  
**The story to tell:**  
*"The single biggest decision: I moved ALL GitLab storage to S3. Artifacts, LFS objects, uploads, CI secure files, packages, container registry, dependency proxy, Terraform states, Pages — every blob goes to S3. No NFS filer, no EFS, no SAN. This means:"*  
- *Zero storage capacity planning*  
- *Automatic 11 9s durability*  
- *Lifecycle policies move old artifacts to IA (30 days) then Glacier (90 days)*  
- *No data loss if an EC2 instance terminates*  
**Terraform state bucket:**  
*"The second bucket holds Terraform state for ALL our infrastructure — not just GitLab. The DynamoDB lock table means no concurrent applies. Point-in-time recovery means I can undo a bad state change."*  
**CI cache bucket:**  
*"The third bucket is ephemeral CI cache with a 7-day TTL. npm/node_modules, pip packages, Maven dependencies — cached for speed, expired automatically so stale caches don't pile up."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAM0lEQVR4nO3OQQmAUBBAwSeILbyYdDP8jAaxgjcRZhLMNjNntQIA4C/uvTqq6+sJAADvPS2NA0FrXqf/AAAAAElFTkSuQmCC)  
compute.tf** — Where GitLab Lives**  
**What it does:** Launch templates, ASGs, IAM roles, CloudWatch dashboard, Step Function backup.  
**The most important file — spend time here.**  
**The GitLab ASG**  
*"GitLab runs on EC2 behind an ASG. Two instances minimum, up to four during upgrades. Rolling instance refresh with 75% min healthy means zero-downtime deployments — instances are replaced one at a time while the ALB drains connections."*  
**The user-data integration**  
*"The user_data.sh is * *a full GitLab Omnibus bootstrap. It installs GitLab EE, mounts an EBS data volume, and renders gitlab.rb from template variables. The configuration is generated by Terraform at apply time — the RDS endpoint, Redis endpoint, and S3 bucket are all injected."*  
**Launch template details**  
*"Each instance gets two EBS volumes: 100GB root encrypted with KMS, 200GB for /var/opt/gitlab data. IMDSv2 is enforced — no SSRF attacks via the metadata service. The SSM agent lets the platform team run commands without SSH keys."*  
**Runner ASG**  
*"A separate ASG for GitLab runners with CPU-based target tracking at 70%. When CI load spikes at 9 AM, it scales from 2 to 20 instances. When load drops at lunch, it scales back down. No idle compute cost."*  
**CloudWatch Dashboard**  
*"The dashboard puts ALB p99 latency, RDS connections, and Redis cache hit ratio on a single pane of glass. When something breaks, I don't guess — I look at the dashboard and see whether it's the app, the DB, or the cache."*  
**Backup Step Function**  
*"A nightly Step Function triggers gitlab-backup via SSM Run Command on all GitLab nodes. The backup is uploaded to S3. If GitLab is down, I restore with one command — no SSH, no manual tarball management."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OQQmAABRAsSd4NIGJjPWxpgGsYQVvImwJtszMXp0BAPAX91pt1fH1BACA164HhZwEOFrXVOsAAAAASUVORK5CYII=)  
loadbalancer.tf** — The Front Door**  
**What it does:** ALB, HTTPS/HTTP/SSH listeners, target groups, WAF.  
**The story to tell:**  
*"The ALB handles three protocols: HTTPS (web UI and API), HTTP (redirects to HTTPS), and TCP 2222 (Git-over-SSH). The HTTPS listener uses TLS 1.3 with a strong security policy. Access logs go to S3 for audit trails."*  
**WAF for production:**  
*"WAF is conditional — only for production. The AWS-managed Common Rule Set blocks SQL injection, XSS, and path traversal. A rate-based rule at 5,000 requests per IP protects against credential stuffing and DoS."*  
**Why two target groups:**  
*"HTTP and SSH need different health checks — HTTP checks /users/sign_in for a 200/302 response, SSH checks the TCP port. Separate target groups let the ALB route traffic based on protocol correctly."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANElEQVR4nO3OQQmAABRAsSdYxKa/i8WMIR7ECt5E2BJsmZmt2gMA4C+Otbqr8+sJAACvXQ85PAYartXEogAAAABJRU5ErkJggg==)  
dns.tf** — Making It Findable**  
**What it does:** Route53 A records for main domain, registry, and Pages.  
**The story to tell:**  
*"Three DNS records: gitlab.examp* *le.com for the web UI, registry.gitlab.example.com for the container registry, and pages.gitlab.example.com for GitLab Pages. All point to the same ALB with alias records and health check evaluation. If the ALB is unhealthy, Route53 stops sending traffic."*  
**Why conditional:**  
*"The * *count = var.gitlab_hosted_zone_id != "" ? 1 : 0* * pattern means DNS is optional. In a dev environment, you might not have a real domain — just test via the ALB DNS name. Production gets the full DNS setup."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhZscZXlheJwqQgQU2QtIq6DIze3UGAMBf3Gu1VcfXEwAAXrseop8EQrmJduIAAAAASUVORK5CYII=)  
outputs.tf** — What You Get**  
**What it does:** Exposes all connection strings, names, and ARNs.  
**Say this:**  
*"Outputs serve as the contract between Terraform and downstream consumers. The* * GitLab URL, RDS endpoint, Redis address, and S3 bucket names are all exported. The Ansible playbook that registers runners reads the gitlab_url and runner_asg_name outputs. The backup monitoring system reads the secretsmanager_rds_arn. No manual lookups."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OMQ2AABAAsSNBCkJfFEIwwIgHRiywEZJWQZeZ2ao9AAD+4lyruzq+ngAA8Nr1AOHsBegrsOrIAAAAAElFTkSuQmCC)  
user_data.sh** — The Boot Script**  
**What it does:** Full GitLab EE Omnibus installation and configuration.  
**The story to tell:**  
*"This is the automation backbone. When a new GitLab instance boots, it:*  
1. *Installs system dependencies and GitLab EE*  
2. *Mounts the EBS data volume*  
3. *Renders gitlab.rb with Terraform-injected values for RDS, Redis, S3*  
4. *Runs gitlab-ctl reconfigure*  
5. *Sets the root password from Secrets Manager*  
6. *Runs a health check — waits up to 5 minutes for GitLab to respond*  
*No SSH, no manual config, no 'works on my machine.' Every instance is born identical."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhwgJmkPYLLpnRgQU2QtIq6DIze3UGAMBf3Gu1VcfHEQAA3rseaHkEMn1wK7sAAAAASUVORK5CYII=)  
terraform.tfvars.example** — Onboarding Accelerator**  
**What it does:** Documentation-as-code for new environments.  
**Say this:**  
*"New environments are copy-paste-and-edit. The example tfvars file documents every choice: why m6i.4xlarge, why db.r6g.xlarge, why 3 AZs. A new platform engineer can spin up a staging environment in 30 minutes."*  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANklEQVR4nO3OYQ1AABSAwc8mi5wvlAB6CKCAACr4Z7a7BLfMzFYdAQDwF+da3dX+9QQAgNeuB6fWBdZMUxZ2AAAAAElFTkSuQmCC)  
**How to Talk About the Whole Project**  
**The 30-second version (for "Tell me about a project")**  
*"I designed and built an enterprise GitLab platform on AWS using Terraform. The architecture uses EC2 Auto Scaling behind an ALB with WAF, RDS PostgreSQL for the database, ElastiCache Redis fo* *r caching, and S3 for all object storage — artifacts, LFS, registry, backups. Everything is encrypted with KMS, credentials are in Secrets Manager, and monitoring is unified in CloudWatch. The whole thing deploys in under an hour with one terraform apply."*  
**The 2-minute version (for architecture deep-dive)**  
*"The key decision was to go fully cloud-native — no NFS, no standalone Redis, no manual failover. Every layer uses a managed AWS service with a Terrafo* *rm resource. The ASG provides instance-level HA, RDS Multi-AZ provides database HA, ElastiCache Multi-AZ provides cache HA, and S3 provides storage HA. The ALB handles TLS termination, SSH passthrough, and WAF filtering. GitLab runners live in a separate A* *SG that auto-scales based on CPU — we only pay for what we use during CI bursts. Backups are automated via a Step Function that runs nightly. The entire platform is about 400 lines of Terraform — every resource is deliberate, every variable has a purpose."*  
**The 5-minute version (the full interview story)**  
See storytelling-guide.md Acts 1–5 for a complete narrative arc.  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnEAAAACCAYAAAA3pIp+AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVR4nO3OMQ2AABAAsSNhZscYahheJwqQgQU2QtIq6DIze3UGAMBf3Gu1VcfXEwAAXrseoqcEQXyAWBgAAAAASUVORK5CYII=)  
**Conversation Starters (by Interview Topic)**  
| | |  
|-|-|  
| **Topic** | **What You Lead With** |   
| **Infrastructure as Code** | *"I use Terraform for all GitLab infrastructure. The whole platform is ~400 lines of HCL across 11 resource files."* |   
| **High Availability** | *"Three AZs, Multi-AZ RDS, Multi-AZ Redis, ASG with cross-AZ distribution — no single point of failure."* |   
| **Security** | *"KMS key with rotation, IMDSv2, Secrets Manager for credentials, WAF with rate limiting, no public S3 buckets."* |   
| **CI/CD** | *"GitLab runners auto-scale from 2 to 20 based on CPU — developers get fast feedback without idle costs."* |   
| **Cost Optimization** | *"S3 lifecycle policies move old artifacts to IA/Glacier, runner ASG scales to zero at night, only pay for what you use."* |   
| **Disaster Recovery** | *"Daily backups via Step Function → S3. RDS point-in-time recovery. ASG replaces failed instances. No data loss if a full AZ goes down."* |   
| **Multi-Cloud** | *"The same Terraform module deploys GitLab on AWS, Azure, or IBM Cloud by swapping providers and variable values."* |   
| **Platform Engineering** | *"Self-service via GitLab CI pipeline + Terraform workspaces — engineers create environments, I maintain the platform."* |   
   
