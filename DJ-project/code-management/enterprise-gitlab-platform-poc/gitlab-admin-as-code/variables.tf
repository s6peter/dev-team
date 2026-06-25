variable "gitlab_base_url" {
  description = "GitLab API base URL, for example http://ec2-host/api/v4/."
  type        = string
}

variable "gitlab_token" {
  description = "Admin personal access token."
  type        = string
  sensitive   = true
}

variable "default_branch" {
  description = "Default branch protected by platform guardrails."
  type        = string
  default     = "main"
}

