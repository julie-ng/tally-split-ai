# Deployment

As of May 2026, only Azure infra deployment is automated. The other PaaS/SaaS are just a few clicks and not _yet_ worth automating.

## Azure Infrastructure

See [terraform/README.md](./../terraform/README.md) to deploy dev/prod for:

- Azure Resource Group, e.g. `tally-split-prod-rg`
- Azure Document Intelligence (OCR)
- Azure OpenAI gpt-4o (Annotations)
- Azure Storage Account (Uploads)

See also [terraform/Makefile](./../terraform/Makefile) for scripts to easily:
- Deploy
- Export secret keys to a `.env.*` file
- Rotate keys

## Vercel

_Automated Deployments._ Connected to GitHub.

#### Required Infra Config

- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_ACCOUNT_KEY`
- `AZURE_STORAGE_CONTAINER_NAME`
- `TRIGGER_PROJECT_ID`
- `TRIGGER_SECRET_KEY`
- `NUXT_DATABASE_URL`
- `NUXT_OAUTH_GITHUB_CLIENT_ID`
- `NUXT_OAUTH_GITHUB_CLIENT_SECRET`

## Trigger.dev

### GitHub Integration

Production deployments are automated via [GitHub integration](https://trigger.dev/docs/github-integration). 

#### Required Infra Config

- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `AZURE_GPT4O_ENDPOINT`
- `AZURE_GPT4O_KEY`
- `NUXT_PUBLIC_URL` (the deployed Vercel URL — used for API callbacks)

## Supabase (DB)

The Supabase Postgres databases (dev / prod) are the app's primary datastore. There is nothing to "deploy" — schema changes are applied as Drizzle migrations, and the target database is selected by the environment the command runs under (injected via password management tool), not by a flag.

### Connection String

> [!IMPORTANT]
> Because Vercel doesn't support outbound IPv6, we need to use port `6543` for **Transaction Pooler**, which can be found in the [Project > Connect Panel](https://supabase.com/dashboard/project/_?showConnect=true).

Pluck out the info to manually construct the connection string:

```
postgresql://[USER]:[PASSWORD]@[AWS_REGION_NAME].pooler.supabase.com:6543/[DBNAME]
```

Set this as `NUXT_DATABASE_URL` — the single connection-string variable used everywhere (app, migrations, and seeds).

### Migrations

Migrations are Drizzle-driven (`drizzle.config.ts` reads `NUXT_DATABASE_URL`). Run under the environment that injects the target database's `NUXT_DATABASE_URL` (e.g. via password management tool):

```bash
npm run db:migrate
```

> [!TIP]
> **Security Tip** - do not inline environment variables that contain secrets, e.g. database URLs, which will be saved in your bash history and/or logged by shell tools, hooks and monitoring. Inject them at runtime (e.g. via password management tool) instead.

### Seed First User

Account sign-ups are disabled. Seed the first user (who can then add others to the household) by setting `TALLY_INITIAL_GITHUB_USER` and running the script under the environment for the target database (e.g. injected via password management tool):

```bash
npm run db:init-user
```

#### Drizzle Docs

- [Drizzle with Supabase Database](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)

#### Supabase Docs

- [Framework > Use Supabase with Nuxt](https://supabase.com/docs/guides/getting-started/quickstarts/nuxtjs)
- [ORM Quickstarts > Drizzle](https://supabase.com/docs/guides/database/drizzle)

## GitHub OAuth App

See GitHub docs on [Creating an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) to configure single sign-on (SSO).

Add the deployment FQDN with callback path of `/api/auth/github`.
