import { z } from 'zod'

/**
 * Upload Object
 */
export const uploadObject = z.object({
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
  azureTags: z.union([z.object(), z.string()]).nullable(),

  analysisStatus: z.string(), // pending, queued, processing, completed, failed
  ocrText: z.string().nullable().optional(),
  ocrJson: z.record(z.string(), z.any()).nullable().optional(),
  annotationsJson: z.record(z.string(), z.any()).nullable().optional(),

  analyzedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  uploadedAt: z.iso.datetime().nullable(),
})

// const validStatus = z.stringFormat("cool-id", ()=>{
//   // arbitrary validation here
//   return val.length === 100 && val.startsWith("cool-");
// });

// Completed (really should refer to analyses, not uploads)
// Uploaded
// Failed
// Initialized
// Interrupted
