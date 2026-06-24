---
name: azure-document-intelligence
description: Azure Document Intelligence receipt analysis — model details, response handling, and known limitations. Use when working on receipt analysis, OCR, or the Document Intelligence integration.
---

# Azure Document Intelligence

- **Model**: `prebuilt-receipt`, **API version** `2024-11-30`. Input is an Azure Blob SAS URL (the service fetches the image itself).
- Results land in `uploads.ocrJson` (jsonb) + `uploads.ocrText` (text).
- Runs as the `analyze-ocr` Trigger.dev task (`trigger/analyze-ocr.js`) inside `receiptWorkflow`; can be run alone via `POST /api/analysis/ocr/[uploadId]`.

Code: `server/utils/azure-document-intelligence.js` (SDK wrapper), `shared/utils/azure-receipt-model.utils.js` (field parsing), `server/utils/azure-ocr.utils.js` (extraction helpers). Response field structure: see the [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md) rather than restating it here.

## The two things that actually trip you up

- **Fields are optional per-receipt.** `taxDetails`, `Items[].Quantity`, `MerchantPhoneNumber` etc. may be absent depending on what's printed. Handle in **both** the zod schema (`.optional()`) and the UI (conditional render) — not one or the other.
- **The model does no handwriting.** Initials, circles, strikethroughs are invisible to `prebuilt-receipt`. Annotation detection is a separate GPT-4o task (`trigger/analyze-annotations.js`). Don't try to coax annotations out of the OCR response.

Currency amounts come as `{ valueCurrency: { amount, currencyCode } }`. Bounding regions drive the overlay at `GET /api/uploads/[id]/polygons` (DB-backed, with a legacy tmp-file fallback still pending removal).
