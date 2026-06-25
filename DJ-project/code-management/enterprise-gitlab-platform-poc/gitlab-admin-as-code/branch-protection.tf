locals {
  protected_projects = {
    ci_templates   = gitlab_project.ci_templates.id
    platform_infra = gitlab_project.platform_infra.id
    gitops_config  = gitlab_project.gitops_config.id
    sample_api     = gitlab_project.sample_api.id
  }
}

resource "gitlab_branch_protection" "main" {
  for_each = local.protected_projects

  project                = each.value
  branch                 = var.default_branch
  push_access_level      = "maintainer"
  merge_access_level     = "developer"
  unprotect_access_level = "maintainer"
}

