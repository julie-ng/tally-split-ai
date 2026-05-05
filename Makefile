.PHONY: generate-salt generate-password

# 256-bit (32-byte) random secret, base64-encoded.
# Use for WORKFLOW_CALLBACK_SALT (HMAC-SHA256 key).
generate-salt:
	@openssl rand -base64 32

# 32-byte random secret, base64url-encoded (URL-safe, no =/+/).
# Use for DB connection-string passwords or NUXT_SESSION_PASSWORD.
generate-password:
	@openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
