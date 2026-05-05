RG       := $(shell terraform output -json resource_group | jq -r .name)
OPENAI   := $(shell terraform output -json azure_openai | jq -r .name)
DOCINTEL := $(shell terraform output -json document_intelligence | jq -r .name)
STORAGE  := $(shell terraform output -json storage_account | jq -r .name)

.PHONY: rotate-keys

rotate-keys:
	az storage account keys renew \
		--resource-group $(RG) \
		--account-name $(STORAGE) \
		--key key1 > /dev/null
	az cognitiveservices account keys regenerate \
		--resource-group $(RG) \
		--name $(OPENAI) \
		--key-name Key1 > /dev/null
	az cognitiveservices account keys regenerate \
		--resource-group $(RG) \
		--name $(DOCINTEL) \
		--key-name Key1 > /dev/null
	./export-env.sh
