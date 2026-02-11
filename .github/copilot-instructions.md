# AI Receipts POC - Copilot Instructions

## Project Overview

A Nuxt 4 full-stack app for analyzing receipt scans using Azure Document Intelligence. Users upload receipt photos with handwritten expense-splitting annotations, which are stored in Azure Blob Storage and analyzed via OCR to extract merchant info, line items, and totals.

**Core assumption**: All receipts are in EUR from Germany (POC simplification).

## Architecture & Data Flow

### Client-to-Azure Direct Upload Pattern

**Critical**: Files never touch the web server. All uploads go directly to Azure Blob Storage:

1. Client requests upload SAS token from `/api/tokens/upload`
2. Server generates time-limited, write-only SAS token with `userId` in blob path
3. Client splits file into blocks and uploads directly to Azure
4. After all blocks uploaded, client commits the block list to finalize blob
5. Client requests read SAS token from `/api/tokens/read` to display image

**Security**: All blobs are private. Access requires user-specific SAS tokens validated against `event.context.userId`. A user can only access blobs in their own path (`{userId}/{filename}`).

See [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed sequence diagrams.

### Database Schema (Drizzle ORM + SQLite)

Three main tables in [server/db/schema.ts](../server/db/schema.ts):

- **`uploads`**: Blob metadata (hashId, blobName, blobUrl, thumbnailUrl, azureTags, analysisStatus)
- **`receipts`**: Business data (title, merchantName, date, subtotal, tax, tip, total, currency, notes)
- **`splits`**: Expense splitting (splitAmount, paidBy, userAShare, userBShare, isSettled)

Relations: `uploads.receiptId → receipts.id`, `receipts.splitId → splits.id`

## Development Commands

```bash
# Start dev server
npm run dev

# Database operations (use Nuxt commands, NOT drizzle-kit directly)
npx nuxt db generate    # Generate migration files
npx nuxt db migrate     # Apply migrations

# Seed database (requires TypeScript via tsx)
npx tsx ./server/db/seed-receipts.js

# Run tests
npm test

# Azure blob operations (via Makefile)
make list-blobs
make list-containers
```

## Critical Code Patterns

### 1. Zod Schema Validation (DO NOT manually validate)

All data validation uses centralized zod schemas from `shared/utils/zod-schemas/`. Auto-imported via `zodSchemas`.

**❌ NEVER DO THIS** (duplicate logic):
```javascript
if (title !== undefined && typeof title === 'string') {
  updates.title = title
}
```

**✅ ALWAYS DO THIS** (leverage zod):
```javascript
const result = await readValidatedBody(event, body => 
  zodSchemas.uploadUpdateSchema.safeParse(body)
)
if (!result.success) {
  return { 
    success: false, 
    errors: z.flattenError(result.error).fieldErrors 
  }
}
```

See [server/api/uploads/[hashId].put.js](../server/api/uploads/[hashId].put.js) for reference implementation.

### 2. API Route Pattern

All server API routes in `server/api/` follow this structure:

```javascript
export default defineEventHandler(async (event) => {
  requireUserId(event)           // Security: validates userId in context
  requireHashIdParam(event)      // Validates route param exists
  
  // Validate request body via zod
  const result = await readValidatedBody(event, ...)
  
  // Database operations with Drizzle
  const dbResult = await db.update(schema.uploads)...
  
  return { success: true, data: dbResult }
})
```

Use explicit utility functions (`requireUserId`, `requireHashIdParam`) instead of middleware.

### 3. Composables Factory Pattern

For complex objects, use factory pattern in `app/composables/`. Example: [useUploadObject.js](../app/composables/useUploadObject.js) creates upload objects with extracted metadata from filenames (receipt date via `YYYY-MM-DD`, total via `(41.95)`, tags via `#tip`).

### 4. Component Two-Way Binding

**✅ Use `defineModel()` for v-model bindings**:
```vue
<script setup>
const modelValue = defineModel()
</script>
```

**❌ Don't manually wire up emits/props** for two-way binding.

### 5. Optimistic Rendering with Hybrid SSR

Use `callOnce()` for data fetching to prevent UI flickers:

```javascript
await callOnce('fetch-key', async () => {
  await $fetch('/api/endpoint')
}, { mode: 'navigation' })
```

## Nuxt 4 Auto-imports

- **Components**: `app/components/` auto-imported (use kebab-case: `<blob-sas-link>`)
- **Composables**: `app/composables/` auto-imported
- **Utils**: `app/utils/`, `server/utils/`, `shared/utils/` auto-imported
- **API Routes**: `server/api/` auto-registered (file-based routing)
- **Stores**: Pinia stores in `app/stores/` accessed via `useUploadQueueStore()`

## Code Style (ESLint)

- No semicolons
- Trailing commas required
- Kebab-case for components and attributes: `<my-component my-prop="value">`
- Name utilities with `.utils.js` suffix, tests with `.utils.test.js`

## Azure Document Intelligence

**Model**: `prebuilt-receipt` (API version: 2024-11-30)

Response structure in `analyzeResult`:
- `.content`: Full OCR text
- `.pages[]`: Words, lines, bounding boxes
- `.documents[].fields`: Structured data (MerchantName, TransactionDate, Items[], Subtotal, Total, etc.)

**Challenge**: Optional fields vary by receipt. Handle missing fields gracefully in both schemas and UI.

See [samples/responses/](../samples/responses/) for reference API responses.

## Key Files

- [CLAUDE.md](../CLAUDE.md): Comprehensive project documentation for AI agents
- [ARCHITECTURE.md](../ARCHITECTURE.md): Data flow diagrams and security patterns
- [server/db/schema.ts](../server/db/schema.ts): Database schema definitions
- [shared/utils/zod-schemas/index.js](../shared/utils/zod-schemas/index.js): Centralized validation schemas
- [nuxt.config.ts](../nuxt.config.ts): Framework configuration
- [eslint.config.mjs](../eslint.config.mjs): Code style rules

## Known Limitations

- Hardcoded `userId` for local development via `NUXT_PUBLIC_DEMO_USER_ID`
- No authentication (POC phase)
- Prebuilt model cannot analyze handwriting (initials, circled items) - would require custom trained model
