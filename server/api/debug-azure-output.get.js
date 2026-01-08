import fs from 'fs/promises'
import path from 'path'
import { db, schema } from 'hub:db'
import { inArray } from 'drizzle-orm'

const analyzedUploads = [
  '1b27fc03e58a',
  '1f7396b8e412',
  '35d9b64c5b3b',
  '494d95ab8764',
  '7aaaa195168e',
  '9afa2bc842b0',
  'b8a8169d9665',
  'fa739920f8c7',
]

export default defineEventHandler(async (event) => {
  const uploads = await db.select({
    hashId: schema.uploads.hashId,
    originalFilename: schema.uploads.originalFilename,
    blobName: schema.uploads.blobName,
    size: schema.uploads.size,
    createdAt: schema.uploads.createdAt,
    analyzedAt: schema.uploads.analyzedAt,
    azureTags: schema.uploads.azureTags
  })
    .from(schema.uploads)
    .where(inArray(schema.uploads.hashId, analyzedUploads))

  // Enrich uploads with data from JSON files
  const enrichedUploads = await Promise.all(
    uploads.map(async (upload) => {
      const tmpDir = path.join(process.cwd(), 'tmp')
      const filePath = path.join(tmpDir, `${upload.hashId}.json`)

      const fileContent = await fs.readFile(filePath, 'utf-8')
      const analysisData = JSON.parse(fileContent)

      const enrichedUpload = {
        ...upload,
        status: analysisData.status,
        createdDateTime: analysisData.createdDateTime,
        apiVersion: analysisData.analyzeResult?.apiVersion,
        modelId: analysisData.analyzeResult?.modelId,
        contentFormat: analysisData.analyzeResult?.contentFormat,
        pagesLength: analysisData.analyzeResult?.pages?.length || 0,
        stylesLength: analysisData.analyzeResult?.styles?.length || 0,
        documentsLength: analysisData.analyzeResult?.documents?.length || 0
      }

      if (analysisData.analyzeResult?.documents?.length > 0) {
        enrichedUpload['document'] = analysisData.analyzeResult.documents[0]
      }

      return enrichedUpload
    })
  )

  return {
    success: true,
    count: enrichedUploads.length,
    uploads: enrichedUploads
  }
})
