# Development Environment Stack

This is the development environment that instantiates Security infrastructure modules.

## Structure

- `main.tf` — module calls
- `variables.tf` — variable declarations
- `terraform.tfvars` — environment-specific values
- `providers.tf` — AWS provider config
- `backend.tf` — Terraform state backend

## Usage

```bash
# Initialize
terraform init

# Plan
terraform plan -var-file terraform.tfvars

# Apply
terraform apply -var-file terraform.tfvars
```

## Outputs

Outputs include KMS key IDs, S3 bucket ARNs, and other resource references for downstream use.
