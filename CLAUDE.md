# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Receipts POC is a proof-of-concept application for analyzing scanned receipts with handwritten annotations to split expenses between people. The app uses Azure Document Intelligence Service (formerly Form Recognizer) to perform OCR and extract structured data from receipt photos.

### Core Use Case

- Analyze receipt photos that include handwritten adjustments for expense splitting
- Extract merchant info, transaction details, line items, and totals
- Future goal: recognize handwritten initials (e.g., "JN", "MM") and circled items to determine payment responsibility

#### Key Assumptions for POC

- Receipts are always in EUR
- Receipt Transactions are always in Germany

## Project Structure

This is a [**Nuxt 4** application](https://nuxt.com/docs/4.x/getting-started/introduction) with the following structure:

```
.
├── app/                           # Nuxt application directory
│   ├── components/                # Vue components (auto-imported)
│   │   ├── Receipt/               # Receipt-specific components
│   │   ├── Upload/                # Upload detail page components
│   │   └── Uploads/               # Upload queue components
│   ├── composables/               # Nuxt composables (auto-imported)
│   │   └── useUploadObject.js     # Upload object factory
│   ├── layouts/                   # Vue layouts
│   ├── pages/                     # File-based routing
│   │   └── uploads/               # Upload management pages
│   ├── plugins/                   # Nuxt plugins
│   ├── stores/                    # Pinia stores
│   │   ├── uploads.store.js       # Upload queue management
│   │   └── user.store.js          # User state management
│   └── utils/                     # Client-side utilities
├── server/                        # Nuxt server directory
│   ├── api/                       # API endpoints (auto-registered)
│   │   ├── analyze/               # Azure Document Intelligence integration
│   │   ├── blobs/                 # Azure Blob Storage operations
│   │   ├── tokens/                # SAS token generation
│   │   └── uploads/               # Upload CRUD operations
│   ├── db/                        # Database setup (Drizzle ORM)
│   │   ├── schema.ts              # Database schema
│   │   └── migrations/            # Database migrations
│   └── utils/                     # Server-side utilities
├── shared/                        # Shared utilities (auto-imported, client + server)
│   └── utils/                     # Shared helper functions
├── samples/                       # Development samples
│   ├── document-intelligence.studio.js  # Reference SDK usage
│   └── responses/                 # Sample API responses for testing
├── scans/                         # Receipt photo storage for testing (gitignored)
└── public/                        # Static assets
```

### Key Architecture Notes

- **Auto-imports**: Nuxt auto-imports components, composables, and utilities
- **File-based routing**: Pages directory maps to routes automatically
- **API routes**: Server API endpoints are auto-registered from `server/api/`
- **State management**: Pinia stores for reactive state (uploads, user)
- **Database**: SQLite with Drizzle ORM for local development
- **Client-side uploads**: Direct-to-Azure uploads using SAS tokens (no server proxy)

See Technology Stack below for more details.

---

## Core Functionality

#### Uploads

- A user can upload files to the app via drag and drop
- Uploads are handled asynchronously in browser and automatically queued.

#### Web UI

- A user can view uploaded files via web UI.
- **TODO**: each upload should create a new "Receipt" entry in the database to have separation of concerns from blobs and core business domain data.

#### Filenames for human pre-curation

- A user can submit pre-curated information, e.g. 
  - Total via parentheses in filename, e.g. `(41.95)` for 41.95 EUR
  - Tags can be assigned with hash tag, e.g. `#tip` to indicate the actual total might be different than what's printed.
  - This information is stored as an Azure Blob index tag, which has its own special format. In Azure API responses, this comes back as a JSON string, which needs to be manipulated for use.
  - **TODO**: these tags will be used to compare with AI analysis results to flag certain receipts for human review.

#### Filenames on Azure

- Filenames are sanitized (special characters removed) and normalized for storage on Azure, incl. each filename getting its own `hashId` based on filename and timestamp. Collision is not an issue for a small POC.
- Filename Design
  - Original images: `{userId}/{sanitized-filename}.{ext}`
  - Thumbnails: `{userId}/{sanitized-filename}-thumbnail.{ext}`
  - Note: the Azure container is never configured or referenced in application logic. It is configured via environment variable in [./server/utils/azure-storage.js](./server/utils/azure-storage.js).
  - Max thumbnail size: 100px width, ~20-30KB

---

## Technology Stack

### Environment Setup

Required environment variables (see `.env.sample`):

```bash
export AZ_FORM_RECOGNIZER_ENDPOINT=""
export AZ_FORM_RECOGNIZER_KEY=""
```

Copy `.env.sample` to `.env` and populate with your Azure credentials.

### JavaScript

- This project started as JavaScript. I see value in TypeScript and potentially long term will go that route. 
- Until then, use the Factory Pattern (Nuxt specific Composable Pattern) like in `app/composables/useUploadObject.js` and zod to drive consistency.

#### Configuration Access

- "public" variables (can be exposed to client side) used for configuration are in [nuxt.config.ts](./nuxt.config.ts) and accessed via `useRuntimeConfig()`
- private or server-side variables, e.g. Azure Blob storage access keys can also be configured in `nuxt.config.ts`. Currently our server/ APIs mostly access it directly via `process.env`, which may not be ideal according to [nuxt docs](https://nuxt.com/docs/4.x/guide/going-further/runtime-config). Not crticial right now for a POC. But something to prioritze later.

### Azure

- **Azure Blob Storage** is used for file storage. For performance and security reasons, user uploaded images never go through our server. They are sent directly to Azure.
  - Storage configuration is in `useAzureStorageConfig()` in [server/utils/azure-store.utils.js](./server/utils/azure-store.utils.js)
  - For a little security and filename uniqueness, we use obfuscation in the filenames.
  - Real security is from all images being marked private and not viewable without a SAS token.
  - SAS tokens are always generated on the fly, scoped to single images with a very limited time window. 
  - Azure Blob storage is finicky with file names. Because we use `()` and `#` in our original filenames to indicate human curation/analysis of the files, we need to santize the names before they go to Azure.
  
- **Azure Document Intelligence** is used to analyze the images using a pre-built model. This service takes a blob url.
  - Analysis results are currently saved in the `./tmp` folder as JSON files.

### Database

> [!IMPORTANT]
> The database file is located at `./.data/db/sqlite.db` instead of standard `./data/`.

- uses SQLite for local development and POC. Might switch to another DB later.
- uses [Drizzle ORM](https://orm.drizzle.team/docs/get-started-sqlite) as database adapter.

#### Migrations

Because we are using a Nuxt module, we use the Nuxt specific commands. Do not use the `npx drizzle-kit…` commands.

| Command (Use) | Description |
|:--|:--|
| `npx nuxt db generate` | Generates sqlite migration files incl. .sql |
| `npx nuxt db migrate` | Applies the migration |

#### Database Seeds

When running seed files, e.g. [seed-receipts.js](./server/db/seed-receipts.js), because Drizzle and Nuxt use TypeScript, we have to use `npx` instead of `node`.

```bash
# Seed database files with TypeScript
npx tsx ./server/db/seed-receipts.js
```

### Tests

- Write [vitest](https://vitest.dev/) unit tests for utility functions. See coding style preferences for details.
- Further tests not required in fast-changing POC phase.

#### Tables

- See `server/db/schema.ts` for all schemas.
- Currently we only have an Uploads Table.
- In future, we will have:
  - Uploads table for interfacing with Azure Blob storage - not many user editable fields
  - Receipts table which will be initially populated by information from upload filename and azure AI analysis. This will be user editable.

### Nuxt 

- Nuxt 4 is used to create a full stack application that is performant via hybrid and server side rendering.
- All Azure SDK usage is done server-side only because it is done with access keys, which should never be exposed to client.
- For every request to get a SAS token, there are checks against the current signed in user's `userId` which is a part of the blobPath. A user can only generate tokens for their images. If the userId does not match, the server returns 404, even though image may exist.

#### Nuxt Modules and Plugins

- [Pinia](https://pinia.vuejs.org/introduction.html) is used as a store for state management.
  - Ideally stores should not reference each other.  
- [NuxtUI](https://ui.nuxt.com/) is heavily leveraged for quick prototyping
- [Tailwind CSS](https://tailwindcss.com/docs/) is used for styling.
- [vue-json-pretty](https://github.com/leezng/vue-json-pretty) is used to output interactive JSON to explore the data.

### APIs

- Server routes are used to filter Azure AI responses to render only necessary information to user interface. For example, currently all the bounding boxes that indicate where particular information was extracted is ignored.
- [Zod](https://zod.dev/) is used for schema validation in both backend and frontend to help ensure consistent API format.

---

## Code Style Preferences

### Stylistic Preferences

Code style is checked via ESLint (integrated via [Nuxt Eslint module](https://eslint.nuxt.com/packages/module)) and I've chosen to use the [@stylistic/eslint-plugin](https://eslint.style/rules). 

See [eslint.config.mjs](./eslint.config.mjs) for details.

- Do not use semicolons
- Add traililng commas

### Component Naming Conventions

Per [vue/multi-word-component-names rule](https://eslint.vuejs.org/rules/multi-word-component-names.html) prefer kebab case when naming components, e.g.

- ❌ Bad: `<BlobSasLink>`
- ✅ Good: `<blob-sas-link>`

#### Component Attributes

Attributes per [vue/attribute-hyphenation rule](https://eslint.vuejs.org/rules/attribute-hyphenation.html) should also use kebab case.

- ❌ Bad: `<MyComponent myProp="prop" />`
- ✅ Good: `<MyComponent my-prop="prop" />`


### Data Schemas and Validations

- Leverage [zod schemas](./shared/utils/zod-schemas.js) in both frontend and backend to drive a consistent data structure from backend to frontend.
  - Backend can mask/filter azure AI response and rename fields.
  - Frontend should avoid manipulating API response format it receives from server. I can show/hide data, but ideally it should keep property names it receives from server.
- Zod is also used to keep `app/components/` relatively consistent. Right now, prioritizing validation via zod v.s. Nuxt's built in `defineProps()` configuration.
- This is work in progress. Feel free to point out inconsistencies.

### Server

- Instead of using middlewares (which affect every route), I prefer explicit utility functions, e.g. `requireUserId(event)` which are placed at top of API endpoint.
- Use Nuxt's [`createError()`](https://nuxt.com/docs/4.x/api/utils/create-error) when possible to pass errors.
- If possible, create and re-use utility functions, esp. to interface with Azure SDKs.

#### Schema Validations in the Backend Server

**DO NOT** manually check schemas in backend APIs, e.g. anything in `./server/api/`. This is duplicate code that bloats the functions and worst of all, suspectible to inconsistency across APIs. It defeats the purpose of having [zod schemas](./shared/utils/zod-schemas/).

```js
// DO NOT DO THIS
if (contentType !== undefined) {
  updates.contentType = contentType
}

if (title !== undefined && typeof title === 'string') {
  updates.title = title
}

if (size !== undefined) {
  if (typeof size !== 'number' || size < 0) {
    throw createError({
      statusCode: 400,
      message: 'Invalid size. Must be a non-negative number'
    })
  }
  updates.size = size
}
```

**Instead, leverage our [zod schemas](./shared/utils/zod-schemas/)**, which have already centrally define our schemes. For errors, we can then just utilize zod's [flattenError()](https://zod.dev/error-formatting#zflattenerror) helper to create friendly error messages.

```js
// DO THIS INSTEAD
const result = await readValidatedBody(event, body => zodSchemas.requestSchema.safeParse(body))
if (!result.success) {
  setResponseStatus(event, 400)
  return {
    success: false,
    message: "Invalid request body",
    errors: z.flattenError(result.error).fieldErrors
  }
}
```

Note: all of our zod schemas are accessible via the auto-imported `zodSchemas` utility.

### Code Re-use & Shared Utility Functions

- Name all re-usable utility or helper functions with a `.utils.js` suffix.
- The corresponding tests should be placed in a file with the same name but with a `.test.js` suffix, e.g. `.utils.test.js`. 
- Generate tests wherever possible
- Frontend only utils are stored in `app/utils`, UI configuration helpers
- Backend only utils are stored in `server/utils`, esp. Azure SDK wrappers
- Shared utils are stored in `shared/utils`, esp. text and string manipulation

### Nuxt & Vue Best Practices

#### Official Best Practices

See official docs on:

- [Vue.js Style Guide](https://vuejs.org/style-guide/) - official guide, with recommendations separated into "essential", "strongly recommended", etc. categories. Site says it's a bit outdated. But still good reference point.
- [Nuxt and hydration](https://nuxt.com/docs/4.x/guide/best-practices/hydration)
  - Challenge here is figuring out what really is client only, which then needs to be wrapped in `<ClientOnly>` tags, like in [./app/components/Upload/OverviewTabContent.vue](app/components/Upload/OverviewTabContent.vue)
- [Nuxt Performance](https://nuxt.com/docs/4.x/guide/best-practices/performance)

--- 

## Azure Document Intelligence API

### Model Used

`prebuilt-receipt` - Microsoft's pre-trained receipt model (API version: 2024-11-30)

### Key Response Structure

The API returns a comprehensive JSON response with:

- **Root**: `status`, `createdDateTime`, `analyzeResult`
- **analyzeResult.content**: Full OCR'd text from receipt
- **analyzeResult.pages[]**: Array of page objects containing:
  - `words[]`: Individual words with coordinates, confidence scores
  - `lines[]`: Text lines with bounding polygons
  - Geometric info: `angle`, `width`, `height`, `unit`
- **analyzeResult.documents[]**: Structured receipt data with:
  - `fields.MerchantName`, `fields.MerchantAddress`
  - `fields.TransactionDate`, `fields.TransactionTime`
  - `fields.Items[]`: Line items with descriptions and prices
  - `fields.Subtotal`, `fields.TotalTax`, `fields.Total`
  - All currency values: `{ valueCurrency: { amount, currencyCode } }`
  - All fields include `boundingRegions[]` with polygon coordinates

### Challenges

Not every field exists for every analysis:
- `taxDetails` exists for some documents but not others
- Item `Quantity` depends on whether it is outputted on the receipt
- A Merchant might or might not have a phone number.

This is challenging because in both the [zod schemas](./shared/utils/zod-schemas.js) and UI, we need to account for optional fields and render the UI accordingly.

## Known Limitations

The prebuilt model does not handle:
- Handwriting analysis for initials or annotations
- Recognition of circled items or manual highlights
- Custom expense-splitting logic

These features would require a custom trained model.

## References

#### Azure AI

- [Receipt Model Documentation](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
- [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)
- [API Reference: Analyze Document](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0%20(2024-11-30)&tabs=HTTP)
