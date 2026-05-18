---
heading: Distributed Cloud Stack
subheading: Architecture
description: I leveraged my Azure expertise for infrastructure, but chose to explore other PaaS and SaaS offerings.
components:
# Row 1 — Serverless 
- title: Nuxt Framework
  icon: i-material-icon-theme-nuxt
  description: |
    Full-stack framework: Vue + Nitro with hybrid SSR and client hydration, file-based routing for API endpoints. 

- title: Vercel Functions
  icon: i-simple-icons-vercel
  description: |
    Each API route deploys as its own serverless function and independentlly auto-scaled.

- title: Trigger.dev
  icon: i-material-icon-theme-trigger
  description: Durable async workflow orchestration for the agentic pipeline.

# Row 2 —  AI services
- title: Azure Document Intelligence
  icon: i-material-icon-theme-azure
  description: OCR via the `prebuilt-receipt` model - structured fields, line items, and bounding boxes.

- title: GPT-4o
  icon: i-logos-openai-icon
  description: Vision model for handwritten annotation detection (circles, strikethroughs, initials).

- title: GPT-4o-mini
  icon: i-logos-openai-icon
  description: Text-only model for receipt normalization and the agentic split-adjustment step.

# Row 3 — Identity & data
- title: GitHub OAuth
  icon: i-simple-icons-github
  description: Single Sign On for human users via `nuxt-auth-utils`.

- title: Supabase
  icon: i-material-icon-theme-supabase
  description: Postgres database, accessed through the transaction-mode pooler for serverless compatibility.

- title: Azure Blob Storage
  icon: i-material-icon-theme-azure
  description: Receipt + thumbnail storage. Direct client uploads and reads via short-lived, scoped SAS tokens.
---

### Uploads

- users upload directly to Azure. Image never stored or proxied in app infra - security and performance gain

- agents get action-scoped SAS tokens - cannot rush someone else's blob. cannot delete blobs, only read. (later: some pages metadata:write for auditability)
