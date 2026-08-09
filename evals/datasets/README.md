# Terraform for Evals Datasets

> [!IMPORTANT]
> Intentionally, this repository does not include any fixture data, e.g. images, OCR, etc. because they come from real data.

- Syncs local dataset files to Azure Blob storage
- Adds blob index tags, e.g. `image-quality:low`, `adjusted-total:true` useful for debugging in non-deterministic workflows.

### File structure

Each image and its inputs/outputs are tracked by a 8 character short id and uses the following filename pattern:

```
abcd1234-short-human-friendly-descriptor
├── abcd1234.adjusted-totals.expected.json
├── abcd1234.annotations.expected.json
├── abcd1234.input.ocr.json
├── abcd1234.jpg
└── abcd1234.payer.expected.json
```

### Data

> [!NOTE]
> Any receipt data, etc. are my personal purchases, which even if leaked in itself is not personally identifiable. Should I miss a line of code or screenshot, any credit card last 4 digits are intentionally _virtual_ card numbers, not my actual credit card number.
