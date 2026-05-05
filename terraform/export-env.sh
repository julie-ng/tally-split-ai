#!/usr/bin/env bash
#
# Export Terraform outputs as a .env file in the repo root.
# Run from terraform/ directory after `terraform apply`.

set -euo pipefail

OUT_FILE="../.env.azure"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

JSON=$(terraform output -json)

get () {
  echo "$JSON" | jq -r "$1"
}

cat > "$OUT_FILE" <<EOF
# SENSITIVE - DO NOT COMMIT
# Regenerate as needed after \`terraform apply\`

# Azure Document Intelligence
export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="$(get '.document_intelligence_endpoint.value')"
export AZURE_DOCUMENT_INTELLIGENCE_KEY="$(get '.doc_intelligence_key.value')"

# Azure OpenAI (GPT-4o)
export AZURE_FOUNDRY_GPT4O_ENDPOINT="$(get '.azure_gpt_4o_annotations_url.value')"
export AZURE_FOUNDRY_GPT4O_KEY="$(get '.azure_openai_key.value')"

# Azure Storage
export AZ_STORAGE_ACCOUNT="$(get '.storage_account.value.name')"
export AZ_STORAGE_ACCOUNT_KEY="$(get '.azure_storage_account_key.value')"
export AZ_STORAGE_CONTAINER_NAME="$(get '.storage_account.value.container_name')"
EOF

chmod 600 "$OUT_FILE"
echo "wrote $(cd .. && pwd)/.env.azure"
