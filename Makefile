.PHONY: generate-salt generate-password

# 256-bit (32-byte) random secret, base64-encoded.
# Use for WORKFLOW_CALLBACK_SALT (HMAC-SHA256 key).
generate-salt:
	@openssl rand -base64 32

# 32-byte random secret, base64-encoded.
# Use for NUXT_SESSION_PASSWORD (requires ≥32 chars) or any session secret.
generate-password:
	@openssl rand -base64 32
