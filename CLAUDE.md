# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Receipts POC is a proof-of-concept application for analyzing scanned receipts with handwritten annotations to split expenses between people. The app uses Azure Document Intelligence Service (formerly Form Recognizer) to perform OCR and extract structured data from receipt photos.

### Core Use Case

- Analyze receipt photos that include handwritten adjustments for expense splitting
- Extract merchant info, transaction details, line items, and totals
- Future goal: recognize handwritten initials (e.g., "JN", "MM") and circled items to determine payment responsibility

## Environment Setup

Required environment variables (see `.env.sample`):

```bash
export AZ_FORM_RECOGNIZER_ENDPOINT=""
export AZ_FORM_RECOGNIZER_KEY=""
```

Copy `.env.sample` to `.env` and populate with your Azure credentials.

## Project Structure

```
.
├── samples/
│   ├── document-intelligence.studio.js  # Reference SDK usage example
│   └── responses/                        # Sample API responses for testing
│       ├── _api-format.json              # API response structure reference
│       └── *.private.json                # Real receipt analysis examples
├── scans/                                # Receipt photo storage (gitignored)
└── upload-scans.js                       # Main upload script (in development)
```

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

## Known Limitations

The prebuilt model does not handle:
- Handwriting analysis for initials or annotations
- Recognition of circled items or manual highlights
- Custom expense-splitting logic

These features would require a custom trained model.

## References

- [Receipt Model Documentation](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
- [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)
- [API Reference: Analyze Document](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0%20(2024-11-30)&tabs=HTTP)
