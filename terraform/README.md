# Infrastructure as Code

### Azure Resources

- **Azure Storage Account** for blob storage
- **Azure Document Intelligence** for OCR service
- **Azure OpenAI gpt-4o** for annotations analysis

#### Regions

Defaults to North Europe.

> [!IMPORTANT]
> Azure Open AI is deployed to a different region because it's not available in North Europe. We're using **swedencentral**, which has highest capacity. 

Azure Open AI is also available in following European regions: uksouth, westeurope, francecentral, germanywestcentral, switzerlandnorth, italynorth, spaincentral, norwayeast, polandcentral.

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

```bash
terraform init
```

### Terraform Plan

Review the infrastructure draft, based on configuration before deploying. Make changes and re-run `plan` until satisfied.

> [!TIP]
> You must specify env specific config via `-var-file` flag, e.g. for dev:

```bash
terraform plan -var-file=environments/dev.tfvars -out plan.tfplan
```

### Terraform Apply

Deploy infrastructure per plan output.

```bash
terraform apply plan.tfplan
```

## Configuration for App Configuration

After deployment, you can pull the needed configuration via

Endpoints

```bash
terraform output document_intelligence_endpoint
terraform output azure_gpt_4o_annotations_url
```

```bash
terraform output -raw azure_storage_account_key
terraform output -raw azure_openai_key
terraform output -raw doc_intelligence_key
```
