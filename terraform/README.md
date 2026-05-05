# Infrastructure as Code

### Azure Resources

- **Azure Storage Account** for blob storage
- **Azure Document Intelligence** for OCR service
- **Azure OpenAI gpt-4o** for annotations analysis

## Environments

This project can handle both dev and prod environments

- See [defaults.auto.tfvars](./defaults.auto.tfvars) for shared config
- See [dev.tfvars](./environments/dev.tfvars) for dev configuration
- See [prod.tfvars](./environments/prod.tfvars) for production configuration

> [!NOTE]
> Two environment specific configurations, i.e. `dev.tfvars` and `prod.tfvars` used for different SKUs, etc. Currently only differ in suffix as we default to cheapest infrastructure for everything.

## Commands

### Terraform Init

Installs resource providers.

```
terraform init
```

### Terraform Plan

Review the infrastructure draft, based on configuration before deploying. Make changes and re-run `plan` until satisfied.

> [!TIP]
> You must specify env specific config via `-var-file` flag, e.g. for dev:

```hcl
terraform plan -var-file=environments/dev.tfvars -out plan.tfplan
```

### Terraform Apply

Deploy infrastructure per plan output.

```hcl
terraform apply plan.tfplan
```
