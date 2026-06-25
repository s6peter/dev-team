# EC2 Access Host

This Terraform config creates a small EC2 instance in the existing VPC so you can SSH in and reach private resources like the OpenSearch VPC endpoint.

## Notes

- It uses the existing AWS key pair name `siem-key`.
- Your local private key file would typically be `siem-key.pem`.
- The instance is placed in an existing public subnet so it can receive SSH.

## Usage

```bash
terraform init
terraform plan -var-file terraform.tfvars
terraform apply -var-file terraform.tfvars
```

## SSH

```bash
chmod 400 siem-key.pem
ssh -i siem-key.pem ec2-user@<instance_public_ip>
```
