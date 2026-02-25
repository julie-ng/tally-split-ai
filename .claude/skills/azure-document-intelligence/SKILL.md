---
name: azure-document-intelligence
description: Azure Document Intelligence receipt analysis — model details, API response structure, optional field handling, and known limitations. Use when working on receipt analysis, OCR, or the Document Intelligence integration.
---

# Azure Document Intelligence

## Model

- **Model ID**: `prebuilt-receipt`
- **API version**: `2024-11-30`
- **Input**: Azure Blob Storage URL (the service fetches the image directly)
- **Results**: Currently saved as JSON files in `./tmp/{hashId}.json`

## Required Environment Variables

```bash
AZ_FORM_RECOGNIZER_ENDPOINT=""
AZ_FORM_RECOGNIZER_KEY=""
```

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

All fields include `boundingRegions[]` — the server **strips these** before sending to frontend.

## Optional Field Challenge

Not every field exists for every receipt:
- `taxDetails` — only present for some documents
- `Items[].Quantity` — depends on whether quantity is printed
- `MerchantPhoneNumber` — may be absent

Handle this in **both** the zod schemas (`shared/utils/zod-schemas/`) and the UI. Use `.optional()` in zod and conditional rendering in components.

## Key Files

| File | Purpose |
|:--|:--|
| `server/utils/azure-document-intelligence.js` | Azure SDK wrapper |
| `server/api/analysis/[uploadHashId].post.js` | Trigger analysis endpoint |
| `server/api/analysis/summary/` | Summary endpoint |
| `shared/utils/azure-receipt-model.utils.js` | Parse Azure response fields |
| `shared/utils/zod-schemas/analysis-summary.schema.js` | Analysis result schema |
| `samples/responses/` | Sample API responses for local testing |

## Known Limitations

The `prebuilt-receipt` model does **not** handle:
- Handwriting analysis (initials, annotations)
- Circled or highlighted items
- Custom expense-splitting logic

These features would require a custom trained model.

## References

- [Receipt Model Docs](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
- [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)
- [Analyze Document API](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0%20(2024-11-30)&tabs=HTTP)
