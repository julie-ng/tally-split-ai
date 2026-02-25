# Azure Document Intelligence Service

This project uses an Azure SaaS to analyze documents (photos), which will use OCR and a pre-built model to return key information about receipts. The most relevant to this project:

- Date
- Merchant
- Total, incl. subtotal and tax amounts
- Line Items of receipt

Missing information that may need a custom trained model:

- Handwriting analysis to determine initials, e.g. "JN" or "MM" on receipt, which indicates who paid.
- Handwriting analysis to determine manually circled totals or line items.

### Receipt Model

Model ID is `prebuilt-receipt`.

- Documentation - [Receipt Model (MS Learn)](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
- Schema - [Receipt Model (GitHub)](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)

#### Response - Root Object

```json
{
  "status": "succeeded",
  "createdDateTime": "2025-12-08T09:40:11Z",
  "lastUpdatedDateTime": "2025-12-08T09:40:11Z",
  "analyzeResult": {
    "apiVersion": "2024-11-30",
    "modelId": "prebuilt-receipt",
    "stringIndexType": "utf16CodeUnit",
    "content": "All OCR'd text in the receipt with newlines '\\n'",
    "pages": [],
    "styles": [],
    "documents": [],
  }
}
```

#### `pages` Object

| Property | Type | Description |
|:--|:--|:--|
| `pageNumber` | Number | integer |
| `angle` | Number | float of angle value (from taking photos of documents) |
| `width` | Number |  width in pixels|
| `height` | Number | height in pxiels |
| `unit` | String | e.g. "pixel"|
| `words` | Object[] | Objects have `content`, `polygon`, `confidence` and `span` properties |
| `lines` | Object[] | Objects have `content`, `polygon`, and `spans[]` properties |
| `spans` | Object[] | Objects have `content`, `polygon` and `spans[]` properties |

#### Example `page` Object

```json
 {
  "pageNumber": 1,
  "angle": 0.07274342328310013,
  "width": 872,
  "height": 2867,
  "unit": "pixel",
  "words": [
    {
      "content": "Text One",
      "polygon": [x, y, z, etc.],
      "confidence": 0.989,
      "span": {
        "offset": 0,
        "length": 4
      }
    },    
  ],
  "lines": [
    {
      "content": "Text One",
      "polygon": […],
      "spans": [
        {
          "offset": 0,
          "length": 4
        }
      ]
    }    
  ],
  "spans": [
    {
      "offset": 0,
      "length": 1074
    }
  ]
}
```        

#### `style` Object

Examples are empty arrays `[]` so far.

#### `document` Object

| Property | Type | Description |
|:---|:---|:---|
| `docType` | String | e.g. `receipt.retailMeal` |
| `confidence` | Number | e.g. 0.984 |
| `spans` | Object | |
| `boundingRegions` | Object | |
| `fields` | Object | |
| `fields.CountryRegion` | Object | |
| `fields.Items` | Array | |
| `fields.MerchantAddress` | Object | has nested `MerchantAddress` property with `houseNmber`, `road`, `postalCode`, `city` and `streetAddress` properties  |
| `fields.MerchantName` | Object | has `valueString`, `content` and `boundingRegions` properties |
| `fields.ReceiptType` | Object | has `valueString`, e.g. "Supplies" and `confidence` score. |
| `fields.Subtotal` | Object | has `boundingRegions` and `valueCurrency.amount`, e.g. "5.11" and `valueCurrency.currencyCode`, e.g. "EUR" properties |
| `fields.TaxDetails` | Object | |
| `fields.Total` | Object | has `boundingRegions` and `valueCurrency.amount` and `valueCurrency.currencyCode` properties |
| `fields.TotalTax` | Object |  has `boundingRegions` and `valueCurrency.amount` and `valueCurrency.currencyCode` properties |
| `fields.TransactionDate` | Object | has `valueDate` e.g. "2025-11-07" and original `content` e.g. "07.11.2025"|
| `fields.TransactionTime` | Object | has `valueTime` e.g. "12:53:25" and original `content` e.g. "12:53:25 Uhr" |

Example of `boudingRegions` Array

```json
"boundingRegions": [
  {
    "pageNumber": 1,
    "polygon": [341, 1424, 396, 1424, 396, 1454, 341, 1455]
  }
]
```

## Fields

#### `MerchantPhoneNumber`

- **content**: `+49 (0)89 / 38 99 88 83`
- **valueCurrency**: `+498938998883`


#### `Total`

- **content**: `EUR 54,30`
- **valueCurrency**: 
  ```json
  { "currencySymbol": "EUR", "amount": 54.3, "currencyCode": "EUR" }
  ```
