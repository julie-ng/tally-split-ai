import { z } from 'zod'

/**
 * Upload Object
 */
const uploadObject = z.object({
  id: z.number(),
  hashId: z.string(),
  title: z.string(),
  userId: z.string(),
  status: z.string(), // TODO
  blobName: z.string(),
  blobUrl: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  size: z.number(),
  azureTags: z.string(),

  merchantName: z.string().nullable(),
  merchantAddress: z.string().nullable(),
  analysisStatus: z.string(), // TODO: pending, etc.
  analysisOcrResult: z.string().nullable(),

  receiptDate: z.iso.date().nullable(),
  receiptTags: z.string().nullable(),
  receiptSubtotal: z.number().nullable(),
  receiptTax: z.number().nullable(),
  receiptTotal: z.number().nullable(),
  receiptCurrency: z.string().nullable(),

  analyzedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  uploadedAt: z.iso.datetime(),
})

/**
 * (Azure) Address
 */
const addressSchema = z.object({
  value: z.object({
    houseNumber: z.string().optional(),
    road: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    streetAddress: z.string().optional()
  }),
  formattedValue: z.string(),
  confidence: z.number()
})

/**
 * (Azure) Currency
 */
const currencySchema = z.object({
  amount: z.number(),
  currencyCode: z.string()
})

/**
 * Sorted fields done in /api/analysis/summary/[hashId]
 */
const analysisSummarySchema = z.object({
  merchant: z.object({
    address: addressSchema,
    name: z.object({
      value: z.string(),
      confidence: z.number()
    }),
    phone: z.object({
      value: z.string(),
      confidence: z.number()
    }).optional()
  }),
  receipt: z.object({
    countryRegion: z.object({
      value: z.string(),
      confidence: z.number()
    }),
    type: z.object({
      value: z.string(),
      confidence: z.number()
    }),
    total: z.object({
      value: currencySchema,
      formattedValue: z.string(),
      confidence: z.number()
    }),
    transactionDate: z.object({
      value: z.string(),
      confidence: z.number()
    }),
    transactionTime: z.object({
      value: z.string(),
      confidence: z.number()
    }),
    taxDetails: z.object({
      value: z.array(z.any())
    }).optional()
  }),
  items: z.object({
    subtotal: z.number().optional(),
    hasQuantity: z.boolean().optional(),
    items: z.array(z.any())
  }),
  errors: z.array(z.object({
    message: z.string(),
    error: z.any().optional()
  })).optional()
})


/**
 * Azure Item Schema
 */
const itemSchema = z.object({
  type: z.literal('object'),
  valueObject: z.object({
    Description: z.object({
      type: z.literal('string'),
      valueString: z.string(),
      content: z.string(),
      confidence: z.number()
    }),
    TotalPrice: z.object({
      type: z.literal('currency'),
      valueCurrency: currencySchema,
      content: z.string(),
      confidence: z.number()
    })
  }),
  content: z.string(),
  confidence: z.number()
})

export const zodSchemas = {
  addressSchema,
  analysisSummarySchema,
  currencySchema,
  itemSchema,
  uploadObject,
}
