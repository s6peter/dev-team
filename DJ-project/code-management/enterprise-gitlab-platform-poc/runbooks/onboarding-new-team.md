# Onboarding a New Application Team

Use this runbook when a team wants to move into the GitLab software factory.

## Intake

1. Confirm application name, owner, support contact, and data classification.
2. Confirm target environments: dev, stage, prod.
3. Confirm required languages, package managers, and base images.
4. Confirm quality gate expectations and security exception process.

## GitLab Setup

1. Create or select the business group under `application-teams`.
2. Create the project from `sample-app` or another approved template.
3. Assign RBAC:
   - Maintainer: application technical leads.
   - Developer: active engineers.
   - Reporter: audit/read-only consumers.
4. Protect `main`.
5. Require merge requests for changes.
6. Add CODEOWNERS if the application has platform/security ownership boundaries.

## CI/CD Setup

1. Add standard includes from `platform-engineering/ci-templates`.
2. Add CI/CD variables:
   - `SONAR_HOST_URL`
   - `SONAR_TOKEN`
   - `ARTIFACTORY_DOCKER_REGISTRY`
   - `ARTIFACTORY_USER`
   - `ARTIFACTORY_PASSWORD`
   - `GITOPS_REPO_URL`
   - `ENVIRONMENT`
3. Confirm the project uses runner tags `eks,kubernetes`.
4. Run the first pipeline from a merge request.

## Tooling Setup

1. Create the SonarQube project and token.
2. Create the Artifactory repository path.
3. Configure Xray policy or Trivy fallback severity threshold.
4. Create GitOps manifests for each environment.
5. Add the Argo CD application.

## Exit Criteria

The team is onboarded when:

- First merge request pipeline passes.
- Image is published to Artifactory.
- Argo CD syncs dev successfully.
- Branch protection is active.
- Backup, rollback, and support contacts are documented.

