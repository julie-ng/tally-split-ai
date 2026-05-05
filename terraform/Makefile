.PHONY: \
  init-% plan-% apply-% refresh-% destroy-% export-config-% \
  rotate-keys-dev rotate-keys-prod

# ---------- Per-env terraform lifecycle ----------
# Pattern targets — `make plan-dev`, `make apply-prod`, etc.

init-%:
	terraform init -backend-config=backends/$*.hcl -reconfigure

plan-%:
	terraform plan -var-file=environments/$*.tfvars -out plan.tfplan

apply-%:
	terraform apply plan.tfplan

refresh-%:
	terraform refresh -var-file=environments/$*.tfvars

destroy-%:
	terraform destroy -var-file=environments/$*.tfvars

export-config-%:
	./export-env.sh $*

# ---------- Key rotation ----------
# Explicit per-env so the env is visible at the call site. Re-inits the
# backend before reading outputs, then regenerates keys + writes .env.azure.<env>.

rotate-keys-dev:
	terraform init -backend-config=backends/dev.hcl -reconfigure
	@RG=$$(terraform output -json resource_group | jq -r .name); \
	OPENAI=$$(terraform output -json azure_openai | jq -r .name); \
	DOCINTEL=$$(terraform output -json document_intelligence | jq -r .name); \
	STORAGE=$$(terraform output -json storage_account | jq -r .name); \
	az storage account keys renew \
		--resource-group $$RG \
		--account-name $$STORAGE \
		--key key1 > /dev/null; \
	az cognitiveservices account keys regenerate \
		--resource-group $$RG \
		--name $$OPENAI \
		--key-name Key1 > /dev/null; \
	az cognitiveservices account keys regenerate \
		--resource-group $$RG \
		--name $$DOCINTEL \
		--key-name Key1 > /dev/null
	./export-env.sh dev

rotate-keys-prod:
	terraform init -backend-config=backends/prod.hcl -reconfigure
	@RG=$$(terraform output -json resource_group | jq -r .name); \
	OPENAI=$$(terraform output -json azure_openai | jq -r .name); \
	DOCINTEL=$$(terraform output -json document_intelligence | jq -r .name); \
	STORAGE=$$(terraform output -json storage_account | jq -r .name); \
	az storage account keys renew \
		--resource-group $$RG \
		--account-name $$STORAGE \
		--key key1 > /dev/null; \
	az cognitiveservices account keys regenerate \
		--resource-group $$RG \
		--name $$OPENAI \
		--key-name Key1 > /dev/null; \
	az cognitiveservices account keys regenerate \
		--resource-group $$RG \
		--name $$DOCINTEL \
		--key-name Key1 > /dev/null
	./export-env.sh prod
