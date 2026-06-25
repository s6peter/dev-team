resource "gitlab_project_variable" "sample_sonar_host" {
  project = gitlab_project.sample_api.id
  key     = "SONAR_HOST_URL"
  value   = "http://sonarqube.example.internal:9000"
  masked  = false
}

resource "gitlab_project_variable" "sample_artifactory_registry" {
  project = gitlab_project.sample_api.id
  key     = "ARTIFACTORY_DOCKER_REGISTRY"
  value   = "artifactory.example.internal/docker"
  masked  = false
}

resource "gitlab_project_variable" "sample_environment" {
  project = gitlab_project.sample_api.id
  key     = "ENVIRONMENT"
  value   = "dev"
  masked  = false
}

