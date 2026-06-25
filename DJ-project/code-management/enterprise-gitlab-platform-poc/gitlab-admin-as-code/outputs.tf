output "groups" {
  value = {
    platform = gitlab_group.platform.full_path
    apps     = gitlab_group.apps.full_path
    security = gitlab_group.security.full_path
  }
}

output "projects" {
  value = {
    ci_templates   = gitlab_project.ci_templates.web_url
    platform_infra = gitlab_project.platform_infra.web_url
    gitops_config  = gitlab_project.gitops_config.web_url
    sample_api     = gitlab_project.sample_api.web_url
  }
}

