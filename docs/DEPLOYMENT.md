# Deployment

As of May 2026, only Azure infra deployment is automated. The other PaaS/SaaS are just a few clicks and not yet worth automating.

### Azure Infrastructure

See [terraform/README.md](./terraform/README.md)

### Vercel

_Automated Deployments._ Connected to GitHub.

### Trigger

_Manual Deployment_

### Database

_Manual Deployment_

#### Migrations

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

#### Seed First User

Account sign-ups are disabled. Seed first user, who can add others to the household by configuring `SUPABASE_ENV` and `TALLY_INITIAL_GITHUB_USER` and then running:

```bash
npx tsx server/db/seeds/seed-first-user.js
```

#### Drizzle Docs

- [Drizzle with Supabase Database](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)

#### Supabase Docs

- [Framework > Use Supabase with Nuxt](https://supabase.com/docs/guides/getting-started/quickstarts/nuxtjs)
- [ORM Quickstarts > Drizzle](https://supabase.com/docs/guides/database/drizzle)

### GitHub OAuth App

See GitHub docs on [Creating an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) to configure single sign-on (SSO).

Add the deployment FQDN with callback path of `/api/auth/github`.
