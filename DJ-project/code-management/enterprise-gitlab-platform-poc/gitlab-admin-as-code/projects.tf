resource "gitlab_project" "ci_templates" {
  name                   = "ci-templates"
  namespace_id           = gitlab_group.platform.id
  visibility_level       = "private"
  initialize_with_readme = true
  default_branch         = var.default_branch
}

resource "gitlab_project" "platform_infra" {
  name                   = "platform-infra"
  namespace_id           = gitlab_group.platform.id
  visibility_level       = "private"
  initialize_with_readme = true
  default_branch         = var.default_branch
}

resource "gitlab_project" "gitops_config" {
  name                   = "gitops-config"
  namespace_id           = gitlab_group.platform.id
  visibility_level       = "private"
  initialize_with_readme = true
  default_branch         = var.default_branch
}

resource "gitlab_project" "sample_api" {
  name                   = "sample-api"
  namespace_id           = gitlab_group.apps.id
  visibility_level       = "private"
  initialize_with_readme = true
  default_branch         = var.default_branch
}

