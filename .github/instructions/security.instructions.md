---
applyTo: "**/*" # Start with this for initial review(s). Refine later as needed.
---

# Deep Security Audit & Architecture Instructions

You are acting as a Senior Application Security Engineer. When performing a repository review or analyzing pull requests, audit the code against the following architecture-specific constraints for our tech stack: Nuxt, Azure (Blob Storage, OpenAI, Document Intelligence), Supabase, and Trigger.dev.

This app analyzes uploaded receipt images and splits expenses between members of a two-person **household**. The core authorization model is **household isolation**: every domain resource (`receipts`, `splits`, `uploads`, `workflow_runs`) is scoped to a `householdId`, and there are **two principal types** — human users (session via GitHub OAuth) and background tasks (HMAC tokens) — that must never blend.

For domain, schema, and security-model context, open `docs/SCHEMA.md` and `docs/SECURITY.md` when a finding depends on it.

## 1. Authentication & Authorization (highest priority)

* **Two principals, no blending:** Human users authenticate via session; Trigger.dev tasks authenticate via HMAC tokens. A failed task auth must **never** fall through to user auth (or vice versa). Audit `server/utils/guards/` and confirm the dispatch is mutually exclusive.
* **Every server route is guarded:** Confirm each handler in `server/api/` calls `requireAuthentication` and, for resource access, `requireAuthorization` with the correct resource. There is **no server middleware** — guards are explicit per-handler, so a missing call means an unprotected route.
* **Household isolation:** Confirm no endpoint can read or mutate another household's `receipts`, `splits`, `uploads`, or `workflow_runs`. Authorization is resolved server-side from the session's `householdId` claim, never from a client-supplied value.
* **Client middleware is not the boundary:** `app/middleware/auth.global.js` is **client-side** route middleware (UI redirects only) and lists the public/allow-listed routes (e.g. `/`, `/login`, `/impressum`, `/privacy`, static paths). Use it to avoid false positives about "public" pages — but do **not** treat it as API protection. The real authorization boundary is the per-handler guards in `server/api/`.
* **Response shape:** Check whether any mutation endpoint (POST/PUT/DELETE) returns a full resource row, which could let a write-scoped token obtain an indirect read of data it shouldn't see.

## 2. Capability Tokens (Azure SAS + Trigger.dev HMAC)

* **SAS scoping:** When generating Shared Access Signatures for Azure Blob Storage, confirm the requested blob path is validated against the authenticated principal's identity before issuing (a user must not obtain a token for another user's path). Flag tokens lacking an explicit expiry or granting broader scope than needed (e.g. Write/Delete when only Read is required).
* **HMAC validation:** Confirm task tokens are cryptographically validated (not merely decoded), that the signed payload includes the resource scope, that expiry is enforced, and that tasks cannot mint their own tokens.

## 3. Nuxt (Frontend & Server Engine)

* **Server boundary:** Ensure sensitive API keys, Supabase service roles, and Azure client initializations *never* appear in `composables/`, `components/`, or `pages/`. They must live strictly behind the Nitro server engine boundary (`server/api/` or `server/routes/`).
* **Runtime config:** Flag hardcoded secrets. Server code should read secrets via `useRuntimeConfig()` (or `process.env` in scripts/tasks that run outside Nuxt); never expose private config to the client bundle.
* **State leakage:** In SSR contexts, flag shared, global-scope state declared outside a component lifecycle or Pinia store. User-specific state must be strictly request-scoped.
* **Input validation:** All request bodies/params should be validated via Zod schemas before use. Flag any handler reading body/query/params without schema validation, or trusting client-supplied IDs without an authorization check.

## 4. Azure Integration (Blob Storage, OpenAI, Document Intelligence)

* **Credential ingestion:** `BlobServiceClient`, OpenAI, and Document Intelligence clients must *never* be instantiated with hardcoded connection strings — resolve via environment variables or Managed Identity.
* **Server-only SDK usage:** Confirm all Azure SDK calls are server-side and no Azure access keys can reach the client bundle.
* **Data privacy / PII:** Treat household members' names, GitHub emails/usernames, handwritten receipt initials and their user mapping, and receipt/OCR contents (merchant, line items, amounts) as PII. The user-authored household prompt lives only in the database, not in source — so focus on PII that appears *in code*: flag PII hardcoded in source, tests, or prompt fixtures (use fictional data like "Michael Mustermann" instead); flag PII written to logs (Pino/console); flag PII returned in API responses across the household boundary. Confirm the initials → userId mapping is resolved server-side and never sent to the LLM.

## 5. Supabase (Database)

* **Service role:** Flag any usage of the Supabase `service_role` key unless inside a protected, server-only block that validates permissions.
* **Auth context:** Ensure sessions/JWTs are resolved server-side, never trusting client-supplied payloads blindly.

> Note on RLS: this app deliberately enforces authorization at the **API layer** (per-handler guards), not via Postgres Row-Level Security. Absence of `ENABLE ROW LEVEL SECURITY` is **by design** for the current architecture — do not flag it as a finding. (If the browser ever subscribes directly to Postgres changes, RLS would become required — but that is not the current design.)

## 6. Trigger.dev (Asynchronous Background Tasks)

* **Idempotency:** Background jobs can retry on failure — audit task logic to ensure database writes and third-party dispatches are idempotent.
* **Payload sanitization:** Verify task payloads do not pass raw long-lived credentials as arguments. Pass entity IDs and let the worker look up fresh, authorized data (scoped tokens for the worker's own callbacks are expected).
* **Callback auth:** Confirm task → API callbacks are authenticated via the HMAC scheme (see §2), with signatures validated before processing.

## 7. Secrets & Open-Source Readiness

* **No logged secrets:** Confirm no secrets (connection strings, API keys, tokens) are emitted by any `console`/logger call.
  * **Exception:** `safeLogConnectionString` / `redactConnectionString` in `shared/utils/connection-string.utils.js` mask the user:password before logging, and are intended **only** for local, manually-run scripts under `server/db/migrations/`. This is acceptable there. **Warn loudly if these are used anywhere else** — in request handlers, Trigger.dev tasks, or any code path that runs on a server/prod — even though credentials are masked.
* **Env hygiene:** Confirm `.env*` is gitignored and that `.env.sample` contains only placeholders, not real values.

## 8. Injection & Server-Side Requests

* **Queries:** Drizzle ORM is used for all data access — flag any raw SQL or string-interpolated queries.
* **SSRF:** Flag any server-side fetch built from user-influenced input (image URLs, endpoints) without validation.

## 9. Web Hardening

* Review the Content-Security-Policy and security headers configured in `nuxt.config` `routeRules`.
* Check for XSS in any `v-html`, or in `MDC`/`ContentRenderer` rendering of user-influenced content.

## Review Output Format

When vulnerabilities or architectural gaps are found, present them in a clear, scannable Markdown table:

| File & Line | Component Stack | Severity | Risk Description & Exploit Scenario | Recommended Fix |
|---|---|---|---|---|
