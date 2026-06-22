.PHONY: \
  init-% plan-% apply-% refresh-% destroy-% export-config-% rotate-keys-%

# ---------- Per-env terraform lifecycle ----------
# Pattern targets — `make plan-dev`, `make apply-prod`, etc.

init-%:
	terraform init -backend-config=backends/$*.hcl -backend-config="backends/tfstate.hcl" -reconfigure

plan-%:
	terraform plan -var-file=environments/$*.tfvars -out plan.tfplan

apply-%:
	terraform apply plan.tfplan

refresh-%:
	terraform refresh -var-file=environments/$*.tfvars

destroy-%:
	terraform destroy -var-file=environments/$*.tfvars

export-config-%:
	terraform refresh -var-file=environments/$*.tfvars
	./export-env.sh $*
	@echo ""
	@echo "N.B. If you just rotated keys, verify the exported values against the Portal to ensure changes have propagated and Terraform pulled the latest values."

# ---------- Key rotation ----------
# Pattern target — `make rotate-keys-dev`, `make rotate-keys-prod`. Re-inits the
# backend, then regenerates keys on Azure. Export is a manual follow-up step so
# Azure has time to propagate before reading outputs.

rotate-keys-%:
	terraform init -backend-config=backends/$*.hcl -backend-config="backends/tfstate.hcl" -reconfigure
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
	@echo ""
	@echo "Keys rotated on Azure. Propagation can take a few seconds. Wait before before running export command."
