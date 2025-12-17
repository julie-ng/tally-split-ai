.PHONY: list-blobs

# Load environment variables from .env file
include .env
export

list-containers:
	@az storage container list \
		--account-name $(AZ_STORAGE_ACCOUNT) \
		--account-key $(AZ_STORAGE_ACCOUNT_KEY) \
		-o table

# List all blobs in the receipts container
list-blobs:
	@az storage blob list \
		--account-name $(AZ_STORAGE_ACCOUNT) \
		--account-key $(AZ_STORAGE_ACCOUNT_KEY) \
		--container-name $(AZ_STORAGE_CONTAINER_NAME) \
		--output table
