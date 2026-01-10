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
  azureTags: z.string(),

  analysisStatus: z.string(), // TODO: pending, etc.
  analysisOcrResult: z.string().nullable(),

  analyzedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  uploadedAt: z.iso.datetime(),
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
