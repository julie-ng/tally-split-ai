import { z } from 'zod'

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

export const zodSchemas = {
  uploadObject,
}
