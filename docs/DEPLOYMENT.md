# Deployment

As of May 2026, only Azure infra deployment is automated. The other PaaS/SaaS are just a few clicks and not _yet_ worth automating.

## Azure Infrastructure

See [terraform/README.md](./../terraform/README.md) to deploy dev/prod for:

- Azure Resource Group, e.g. `tally-split-prod-rg`
- Azure Document Intelligence (OCR)
- Azure OpenAI gpt-4o (Annotations)
- Azure Storage Account (Uploads)

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

## Trigger

### Automated

Production deployments via GitHub Workflow. See [deploy-trigger.yml](./../.github/workflows/deploy-trigger.yml).

### Manual Deployments

Manually set the required environment variables

```
TRIGGER_PROJECT_ID_DEV="" 
TRIGGER_PROJECT_ID_PROD=""
```

Then run accordingly

```bash
# Deploy to dev
npm run trigger:deploy:dev

# OR to production
npm run trigger:deploy:prod
```

#### Required Infra Config

- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `AZURE_GPT4O_ENDPOINT`
- `AZURE_GPT4O_KEY`
- `NUXT_PUBLIC_URL` (the deployed Vercel URL — used for API callbacks)

## Database/Supabase

_Manual Deployment_

### Connection String

Note: Because Vercel doesn't support IPv6, we need to use a Shared Pooler, which can be found in the [Project > Connect Panel](https://supabase.com/dashboard/project/_?showConnect=true), 

Pluck out the info to manually construct the connection string:

```
postgresql://[USER]:[PASSWORD]]@name-1.pooler.supabase.com:5432/[DBNAME]
```

### Migrations

Ensure `SUPABASE_DATABASE_URL` is set in an environment specific file, e.g. `.env.supabase.dev`, which is used by [drizzle.supabase.ts](./../drizzle.supabase.ts).

Then use these npm scripts to use `drizzle-kit` with Supabase.

```bash
# Migrate dev
npm run supabase:migrate:dev

# OR migrate prod
npm run supabase:migrate:prod
```

> [!TIP]
> **Security Tip** - do not inline environment variables that contain secrets, e.g. database URLs, which will be saved in your bash history and/or logged by shell tools, hooks and monitoring. Hence my workflow above.

### Seed First User

Account sign-ups are disabled. Seed first user, who can add others to the household by configuring `SUPABASE_ENV` to `dev` or `prod` and `TALLY_INITIAL_GITHUB_USER` and then running:

```bash
npx tsx server/db/seeds/seed-first-user.js
```

#### Drizzle Docs

- [Drizzle with Supabase Database](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)

#### Supabase Docs

- [Framework > Use Supabase with Nuxt](https://supabase.com/docs/guides/getting-started/quickstarts/nuxtjs)
- [ORM Quickstarts > Drizzle](https://supabase.com/docs/guides/database/drizzle)

## GitHub OAuth App

See GitHub docs on [Creating an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) to configure single sign-on (SSO).

Add the deployment FQDN with callback path of `/api/auth/github`.
