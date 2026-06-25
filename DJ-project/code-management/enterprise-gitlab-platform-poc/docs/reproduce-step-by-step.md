# Step-by-Step Reproduction Guide

## Prerequisites

Install:

- AWS CLI
- Terraform 1.6 or newer
- Ansible
- kubectl
- Helm
- Git

Configure AWS credentials:

```bash
aws configure
aws sts get-caller-identity
```

Find your public IP:

```bash
curl -s https://checkip.amazonaws.com
```

Use it as `admin_cidr`, for example `203.0.113.10/32`.

## 1. Bootstrap Terraform Remote State

```bash
cd enterprise-gitlab-platform-poc/terraform/backend
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set a globally unique bucket name.

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform apply
```

Write down:

- `state_bucket_name`
- `lock_table_name`

## 2. Configure the Dev Environment Backend

```bash
cd ../envs/dev
cat > backend.hcl <<EOF
bucket         = "<state_bucket_name>"
key            = "dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "<lock_table_name>"
encrypt        = true
EOF
```

## 3. Configure Dev Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit:

```hcl
admin_cidr = "203.0.113.10/32"
```

For the cheapest run, set:

```hcl
enable_lab_services = True
enable_eks          = True
```

For the fuller demo, keep:

```hcl
enable_lab_services = true
```

Enable EKS only when ready to pay for and demonstrate Kubernetes:

```hcl
enable_eks = true
```

## 4. Deploy AWS Infrastructure

```bash
terraform init -backend-config=backend.hcl
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Get outputs:

```bash
terraform output gitlab_url
terraform output -raw gitlab_root_password
terraform output backup_bucket
```

Wait 10-15 minutes for GitLab to finish first boot.

## 5. Access GitLab

Open:

```bash
terraform output -raw gitlab_url
```

Login:

```text
username: root
password: terraform output -raw gitlab_root_password
```

## 6. Create a GitLab Admin Token

In GitLab:

1. Go to root user preferences.
2. Create a personal access token.
3. Grant API scope.
4. Copy the token.

## 7. Apply GitLab Admin as Code

```bash
cd ../../../gitlab-admin-as-code
cp terraform.tfvars.example terraform.tfvars
```

Edit:

```hcl
gitlab_base_url = "http://YOUR_GITLAB_HOST/api/v4/"
gitlab_token    = "YOUR_TOKEN"
```

Run:

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform apply
```

This creates:

- `platform-engineering`
- `application-teams`
- `security-engineering`
- `ci-templates`
- `platform-infra`
- `gitops-config`
- `sample-api`
- Branch protection
- Starter project variables

## 8. Push CI Templates

Push files from `ci-templates` into the GitLab project:

```bash
git clone http://YOUR_GITLAB_HOST/platform-engineering/ci-templates.git
cp ../ci-templates/*.yml ci-templates/
cd ci-templates
git add .
git commit -m "Add standard CI templates"
git push origin main
```

## 9. Push the Sample App

```bash
git clone http://YOUR_GITLAB_HOST/application-teams/sample-api.git
cp -R ../sample-app/* sample-api/
cp ../sample-app/.gitlab-ci.yml sample-api/
cd sample-api
git add .
git commit -m "Add sample API golden path"
git push origin main
```

## 10. Configure SonarQube and Artifactory

If `enable_lab_services = true`, open:

```bash
terraform output sonarqube_url
terraform output artifactory_url
```

In SonarQube:

1. Login with default admin credentials.
2. Change the admin password.
3. Create project `sample-api`.
4. Create a token.
5. Add GitLab CI variable `SONAR_TOKEN`.

In Artifactory:

1. Complete first-time setup.
2. Create or identify a Docker repository.
3. Add GitLab CI variables:
   - `ARTIFACTORY_DOCKER_REGISTRY`
   - `ARTIFACTORY_USER`
   - `ARTIFACTORY_PASSWORD`

## 11. Optional EKS Runner and Argo CD

If `enable_eks = true`:

```bash
aws eks update-kubeconfig --name "$(terraform output -raw eks_cluster_name)" --region us-east-1
```

Create a GitLab runner token in Admin Area > CI/CD > Runners.

```bash
cd ../../../
GITLAB_URL="$(cd enterprise-gitlab-platform-poc/terraform/envs/dev && terraform output -raw gitlab_url)" \
RUNNER_TOKEN="YOUR_RUNNER_TOKEN" \
enterprise-gitlab-platform-poc/scripts/install-eks-addons.sh
```

Check:

```bash
kubectl get pods -A
```

## 12. Push GitOps Manifests

```bash
git clone http://YOUR_GITLAB_HOST/platform-engineering/gitops-config.git
cp -R enterprise-gitlab-platform-poc/gitops gitops-config/
cd gitops-config
git add .
git commit -m "Add sample-api GitOps manifests"
git push origin main
```

Update `gitops/dev/sample-api/application.yaml` with the real GitLab repo URL.

Apply the Argo CD application:

```bash
kubectl apply -f gitops/dev/sample-api/application.yaml
```

## 13. Run Ansible Hardening and Backup

Create inventory:

```bash
cd enterprise-gitlab-platform-poc/ansible
cp inventory.ini.example inventory.ini
```

Edit `ansible_host`, `backup_bucket`, and `aws_region`.

Run:

```bash
ansible-playbook -i inventory.ini gitlab-service-check.yml
ansible-playbook -i inventory.ini gitlab-hardening.yml
ansible-playbook -i inventory.ini gitlab-backup.yml
```

If you use SSM only and no SSH key, run equivalent commands through SSM Session Manager.

## 14. Destroy When Finished

To avoid cost:

```bash
cd enterprise-gitlab-platform-poc/terraform/envs/dev
terraform destroy

cd ../backend
terraform destroy
```

Empty S3 buckets first if Terraform cannot delete them because they contain objects.

