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
terraform init -backend=false
```

> [!TIP]
> The `-backend=false` flag above is **required** to use local state and avoid having to setup Azure Storage Accounts before deploying. This project config to use a remote backend. Be aware when switching environments though. E.g. to switch to prod, I run `terraform init -backend-config="backends/prod.hcl" -backend-config="backends/tfstate.hcl" -reconfigure`.

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

## Additional Scripts

I use [Makefile](./Makefile) to reduce typing, for example

```bash
make init-dev
make plan-dev
make destroy-dev
```

### Rotate Keys

To automatically rotate keys for Azure Storage Account, Cognitive Services Account, and Azure Open AI just run:

```bash
make rotate-keys-dev
make rotate-keys-prod
```

> [!IMPORTANT]
> This rotates keys **on Azure's side**. Other services, e.g. Vercel still need to be reconfigured and redeployed.

### Generate .env files

This command generates a `.env.azure.dev`, etc. file with the secrets.

```bash
make export-config-dev
make export-config-prod
```

Remember the `.env` files are in plain text. Consider deleting them after you've configured your environments.
