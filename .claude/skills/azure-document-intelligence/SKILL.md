---
name: azure-document-intelligence
description: Azure Document Intelligence receipt analysis — model details, API response structure, optional field handling, and known limitations. Use when working on receipt analysis, OCR, or the Document Intelligence integration.
---

# Azure Document Intelligence

## Model

- **Model ID**: `prebuilt-receipt`
- **API version**: `2024-11-30`
- **Input**: Azure Blob Storage URL (the service fetches the image directly)
- **Results**: Stored in `uploads.ocrJson` (jsonb) and `uploads.ocrText` (text). Legacy data may exist in `./tmp/{hashId}.json`.

## Required Environment Variables

```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=""
AZURE_DOCUMENT_INTELLIGENCE_KEY=""
```

## Workflow Integration

OCR analysis runs as a Trigger.dev task (`trigger/analyze-ocr.ts`), triggered by the `receiptWorkflow` orchestrator. Can also be triggered individually via `POST /api/analysis/ocr/[uploadHashId]`.

The task:
1. Generates a read-only SAS token for the blob
2. Calls Azure Document Intelligence with the SAS URL
3. Stores the full response in `uploads.ocrJson` and plain text in `uploads.ocrText`
4. Creates or updates a receipt record with extracted data
5. Updates `workflow_runs` step status

## API Response Structure

```
analyzeResult
├── content                    # Full OCR'd text from receipt
├── pages[]                    # Array of page objects
│   ├── words[]                # Individual words with confidence scores
│   ├── lines[]                # Text lines with bounding polygons
│   └── angle, width, height   # Geometric info
└── documents[]                # Structured receipt data
    └── fields
        ├── MerchantName
        ├── MerchantAddress
        ├── TransactionDate
        ├── TransactionTime
        ├── Items[]            # Line items
        │   ├── Description
        │   ├── TotalPrice     → { valueCurrency: { amount, currencyCode } }
        │   └── Quantity       (optional — not always on receipt)
        ├── Subtotal           → { valueCurrency: { amount, currencyCode } }
        ├── TotalTax           → { valueCurrency: { amount, currencyCode } }
        └── Total              → { valueCurrency: { amount, currencyCode } }
```

All fields include `boundingRegions[]` — used by `GET /api/uploads/[hashId]/polygons` for bounding box overlays.

## Optional Field Challenge

Not every field exists for every receipt:
- `taxDetails` — only present for some documents
- `Items[].Quantity` — depends on whether quantity is printed
- `MerchantPhoneNumber` — may be absent

Handle this in **both** the zod schemas (`shared/utils/zod-schemas/`) and the UI. Use `.optional()` in zod and conditional rendering in components.

## Key Files

| File | Purpose |
|:--|:--|
| `trigger/analyze-ocr.ts` | Trigger.dev task — runs OCR analysis |
| `server/utils/azure-document-intelligence.js` | Azure SDK config wrapper |
| `server/api/analysis/ocr/[uploadHashId].post.js` | API endpoint — triggers OCR task |
| `server/api/analysis/summary/[uploadHashId].get.js` | Summary endpoint (read-only) |
| `server/api/uploads/[hashId]/polygons.get.js` | Bounding box polygons (reads from DB, falls back to tmp file) |
| `shared/utils/azure-receipt-model.utils.js` | Parse Azure response fields |
| `shared/utils/zod-schemas/receipt.schema.js` | Receipt schemas (receiptSchema, receiptInputSchema) |

## Known Limitations

The `prebuilt-receipt` model does **not** handle:
- Handwriting analysis (initials, annotations)
- Circled or highlighted items

Annotation detection uses GPT-4o via a separate task (`trigger/analyze-annotations.ts`).

## References

- [Receipt Model Docs](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
- [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)
- [Analyze Document API](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0%20(2024-11-30)&tabs=HTTP)
