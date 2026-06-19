# Errors & Failure Modes

Diagnosing runtime errors by log signature. Logs are structured (Pino); the
disambiguating fields are `msg` (code path) and `code` (driver error, lifted
from `error.cause.code`).

## Authentication (GitHub OAuth login)

`server/api/auth/github.get.js`. The OAuth handshake routes to `onError`; a throw
*after* auth succeeds escapes `onError`, so each post-auth step is caught and
named. All paths redirect to `/login`, surfaced as an alert by
`app/pages/login/index.vue`.

| Log `msg` | What failed | Redirect |
|:--|:--|:--|
| `GitHub OAuth error` | Handshake — token exchange, GitHub API, or **expired OAuth app credential** | `?error=github_oauth_error` |
| `Login failed: database error refreshing user record` | `users` update threw (see `code`) | `?error=server_error` |
| `Login failed: session write error` | `setUserSession` threw (DB succeeded — `userId` present in log) | `?error=server_error` |
| `OAuth login rejected` | githubId not in closed user set | `/login/unauthorized` |

### DB `code` values (postgres-js)

| `code` | Meaning | Fix |
|:--|:--|:--|
| `ECONNREFUSED` | Port refused the connection | Start local Postgres (`docker compose -f docker-compose.dev.yaml up -d`), or paused Supabase refusing pooler connections |
| `ENOTFOUND` | Hostname won't resolve | Paused/deleted Supabase project, or typo in `NUXT_DATABASE_URL` |

## Convention

When adding a caught error path: name the step in `msg` (not "operation failed"),
and lift any driver `code` to a top-level log field.
