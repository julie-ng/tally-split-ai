.PHONY: generate-salt generate-password

# 256-bit (32-byte) random secret, base64-encoded.
# Use for WORKFLOW_CALLBACK_SECRET (HMAC-SHA256 key).
generate-callback-secret:
	@openssl rand -base64 32

# 32-byte random secret, base64url-encoded (URL-safe, no =/+/).
# Use for DB connection-string passwords or NUXT_SESSION_PASSWORD.
generate-session-password:
	@openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
