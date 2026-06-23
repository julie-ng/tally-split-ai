# Docs (for humans)

Julie written for human understanding.

## Database Schema

- [SCHEMA.md](./SCHEMA.md)  
  Tables, relationships, and status enums. Single source of truth for the data model.

#### References

- [unjs > H3 > Runtime type checking](https://unjs.io/blog/2023-08-15-h3-towards-the-edge-of-the-web#runtime-type-safe-request-utils)
- [Mastering Nuxt: Server Middleware is an Anti-Pattern in Nuxt](https://masteringnuxt.com/blog/server-middleware-is-an-anti-pattern-in-nuxt)

---

## Data Fetching Patterns

Nuxt uses SSR + client hydration. Choosing the wrong fetch function causes double requests or missing data.

### Pinia Store Actions

| Action type | Function | Why |
|:--|:--|:--|
| GET (read data) | `$fetch()` | Store manages its own reactive state |
| GET (needs SSR auth cookies) | `useRequestFetch()` | Forwards cookies during SSR. Not needed until `nuxt-auth-utils`. Call in store setup scope. |
| POST/PUT/DELETE (mutation) | `$fetch()` | Always user-initiated, client-side only |

### Vue Components

| Context | Function | Why |
|:--|:--|:--|
| Setup — fetch data for render | `await useAsyncData('key', () => store.fetchX())` | Runs on server, hydrates to client — no double fetch |
| Setup — global side effect | `await callOnce('key', () => store.doX())` | Runs once during SSR. For config init, analytics — not data fetching. |
| Handler — user action | `store.deleteX(id)` | Direct call, no wrapper. Mutations are client-side only. |
| Component-level data (no store) | `useFetch('/api/...')` | Returns reactive refs. Avoid when a store exists for that data. |
| Never | `$fetch()` directly | Causes double fetch (server + client). Always use a store or `useAsyncData`. |

> [!NOTE]
> `callOnce` vs `useAsyncData` distinction needs further investigation once `nuxt-auth-utils` is implemented. We may be overusing `callOnce` for data fetches where `useAsyncData` is correct.

---

## Testing

### Running Tests

```bash
npm test                 # Run all tests (unit + integration)
npm run test:unit        # Unit tests only (co-located with source files)
npm run test:integration # Integration tests only (tests/ directory)
```

Unit tests live alongside their source files (e.g., `shared/utils/azure.utils.test.js`). Integration tests live in `tests/integration/` and appear as a separate step in the CI workflow.

---

## Workflow Architecture

Receipt analysis runs as an async Trigger.dev workflow (`trigger/receipt-workflow.js`) that orchestrates five tasks:

```
receiptWorkflow
  → analyzeOcr            (Azure Document Intelligence)
  → analyzeAnnotations    (GPT-4o vision)
  → normalizeReceipt      (GPT-4o-mini text-only)
  → createSplit           (deterministic, from receipt total)
  → adjustSplit           (GPT-4o-mini, adjusts split based on annotations)
```

**Triggered by:** `POST /api/workflows/[uploadHashId]` (called automatically after upload completes)

**Tracking:** The `workflow_runs` table tracks per-step status (`ocrStatus`, `annotationsStatus`, `createSplitStatus`, `adjustSplitStatus`, `normalizeStatus`). The `uploads.analysisStatus` field is a convenience summary updated by the orchestrator. If a task times out (Trigger.dev kills the process), the orchestrator sets the step status to `failed`.

**Data retention:** Deleting an upload cascades to its `workflow_runs` rows in Postgres. Run history is still available in the Trigger.dev dashboard independently.

**Duplicate guard:** The workflow endpoint rejects duplicate triggers — if a `queued` or `processing` run already exists for the upload, it returns the existing run instead of creating a new one.

### adjust-split: Known Edge Cases

- **Re-running workflow** — re-analyzing a receipt runs `adjustSplit` again, creating duplicate history entries. No dedup logic yet.
- **Annotations → split linkage** — the LLM adjustment is not structurally linked back to which annotations drove the decision. The `reasoning` text field explains it but there's no structured reference. (TODO: low priority)
- **`paidBy` stores initials not userId** — the LLM returns initials (e.g. "JN") but the UI expects a userId for the paid-by radio buttons. Needs household/user mapping to resolve.

---

## Azure Blob Storage

- [blob-storage-architecture.md](./blob-storage-architecture.md)  
  Why files upload directly to Azure, security model, SAS token flow, and cloud sequence diagram

- [azure-blob-storage.md](./azure-apis.md)  
  Azure Blob Storage REST API reference: PUT Block, PUT Block List, and required request headers

#### References

- [Blob Service API Versions](https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services)  
- [Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)

---

## Azure Document Intelligence

### OCR JSON Token Estimates

The full Azure Document Intelligence response is large. When forwarding OCR data to downstream LLM tasks (e.g., `adjust-split`), strip to only the fields needed:

| Scope | Bytes | ~Tokens | Reduction |
|:--|--:|--:|--:|
| Full OCR JSON | 37KB | ~9,200 | — |
| `documents[0].fields` only | 12KB | ~3,000 | 68% |
| Items + Total/Subtotal/Tax/Tip | 10.5KB | ~2,600 | 71% |
| Items + Totals, no `boundingRegions`/`spans` | 5KB | ~1,250 | 86% |

Based on a sample receipt (`tmp/9099f4ba0ced.json`, 122KB raw). Token estimates use chars/4 approximation.

#### References

- [Documentation: Receipt Model](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
  - [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)
- [API Reference: Document Models - Analyze Document](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0%20(2024-11-30)&tabs=HTTP)

---

## Mistral Document AI

**Status: Not suitable for handwriting detection (2026-04-06)**

Evaluated Mistral OCR for combined printed text + handwriting detection with bounding boxes. Would have replaced the two-model approach (Document Intelligence + GPT-4o).

#### Conclusion: Mistral OCR is not the right tool

Mistral OCR is a document-to-markdown extractor. It does not:
- Detect or distinguish handwritten text from printed text
- Return per-text bounding boxes (only returns bounding boxes for embedded images like QR codes)
- Recognize handwritten annotations (initials, circles, strikethroughs)

The `bboxAnnotationFormat` parameter only annotates detected **image regions** (QR codes, logos), not text regions. Text is returned as markdown with no positional data.

#### Azure deployment issues (also encountered)

1. **MSFT Foundry** — no API documentation for Mistral OCR, cryptic error messages, couldn't determine correct endpoint path
2. **Azure AI Foundry** — provides a Mistral-specific endpoint (e.g. `.../providers/mistral/azure/ocr`) with working sample curl, but **only supports base64-encoded images, not URLs**:
   ```
   "Only base64 data is supported. URL for a document or image is not supported."
   ```
3. **Mistral direct API** (`api.mistral.ai`) — works with image URLs via `@mistralai/mistralai` SDK, but the model itself lacks the needed capabilities

#### Recommendation

Use a multimodal LLM (e.g. GPT-4o) for handwriting detection. Send the receipt image + existing OCR JSON from Document Intelligence, and ask the LLM to identify handwritten annotations and map them to line items. The LLM handles semantic understanding that OCR models cannot.

#### References

- [Documentation: Basic OCR](https://docs.mistral.ai/capabilities/document_ai/basic_ocr)
- [API Reference: OCR Endpoint](https://docs.mistral.ai/api/endpoint/ocr)
- [Azure Sample: ARGUS Mistral integration](https://github.com/Azure-Samples/ARGUS/blob/main/src/containerapp/ai_ocr/azure/mistral_doc_intelligence.py) — uses base64, confirming Azure limitation
