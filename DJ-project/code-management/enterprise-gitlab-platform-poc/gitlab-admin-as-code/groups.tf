resource "gitlab_group" "platform" {
  name             = "platform-engineering"
  path             = "platform-engineering"
  description      = "Owns GitLab, runners, pipeline templates, IaC, and operational runbooks."
  visibility_level = "private"
}

resource "gitlab_group" "apps" {
  name             = "application-teams"
  path             = "application-teams"
  description      = "Application delivery teams onboarded to the golden-path CI/CD workflow."
  visibility_level = "private"
}

resource "gitlab_group" "security" {
  name             = "security-engineering"
  path             = "security-engineering"
  description      = "Security governance, vulnerability management, and quality gates."
  visibility_level = "private"
}

