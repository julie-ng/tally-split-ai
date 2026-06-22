#!/usr/bin/env bash
#
# Export Terraform outputs as a .env file in the repo root.
# Run from terraform/ directory after `terraform apply`.
#
# Usage:  ./export-env.sh <env>     (e.g. dev, prod)
#
# Safeguards:
#   - Requires an env arg (no implicit default — too easy to clobber prod).
#   - Verifies the currently-initialized backend matches the requested env.
#   - Writes to a per-env file (.env.azure.<env>) so dev + prod don't clobber.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <env>     (e.g. dev, prod)" >&2
  exit 1
fi

ENV_NAME="$1"
EXPECTED_KEY="terraform.${ENV_NAME}.tfstate"
OUT_FILE="../.env.azure.${ENV_NAME}"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

# Verify the currently-initialized backend matches the requested env.
BACKEND_CONFIG=".terraform/terraform.tfstate"
INIT_CMD="terraform init -backend-config=backends/${ENV_NAME}.hcl -backend-config=backends/tfstate.hcl -reconfigure"
if [[ ! -f "$BACKEND_CONFIG" ]]; then
  echo "error: $BACKEND_CONFIG missing — run '${INIT_CMD}' first" >&2
  exit 1
fi

CURRENT_KEY=$(jq -r '.backend.config.key // ""' "$BACKEND_CONFIG")
if [[ "$CURRENT_KEY" != "$EXPECTED_KEY" ]]; then
  echo "error: backend mismatch" >&2
  echo "  requested env: $ENV_NAME (expected $EXPECTED_KEY)" >&2
  echo "  currently initialized: $CURRENT_KEY" >&2
  echo "  fix:  ${INIT_CMD}" >&2
  exit 1
fi

JSON=$(terraform output -json)

get () {
  echo "$JSON" | jq -r "$1"
}

cat > "$OUT_FILE" <<EOF
# SENSITIVE - DO NOT COMMIT (env: ${ENV_NAME})
# Regenerate as needed after \`terraform apply\`

# Azure Document Intelligence
export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="$(get '.document_intelligence_endpoint.value')"
export AZURE_DOCUMENT_INTELLIGENCE_KEY="$(get '.doc_intelligence_key.value')"

# Azure OpenAI (GPT-4o)
export AZURE_GPT4O_ENDPOINT="$(get '.azure_gpt_4o_annotations_url.value')"
export AZURE_GPT4O_KEY="$(get '.azure_openai_key.value')"

# Azure Storage
export AZURE_STORAGE_ACCOUNT="$(get '.storage_account.value.name')"
export AZURE_STORAGE_ACCOUNT_KEY="$(get '.azure_storage_account_key.value')"
export AZURE_STORAGE_CONTAINER_NAME="$(get '.storage_account.value.container_name')"
EOF

chmod 600 "$OUT_FILE"
echo "wrote $(cd .. && pwd)/.env.azure.${ENV_NAME}"
