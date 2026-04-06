import { eq } from 'drizzle-orm'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const db = useDB()
  requireUserId(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')

  try {
    // 1. Fetch upload record from database
    const uploads = await db
      .select()
      .from(schema.uploads)
      .where(eq(schema.uploads.hashId, hashId))

    if (uploads.length === 0) {
      throw createError({
        statusCode: 404,
        message: `Upload with hashId '${hashId}' not found`,
      })
    }

    const upload = uploads[0]

    // 2. Generate read-only SAS token (5 minutes)
    const { uploadUrl: blobUrlWithSas } = azureStorageUtils.generateBlobSasToken(upload.blobName, {
      permissions: 'read',
      expiresInMinutes: 5,
    })

    // 3. Call Mistral OCR
    const responseData = await mistralOcrUtils.analyzeImage(blobUrlWithSas)

    // 5. Save raw response to temp file
    const tmpFilePath = join(process.cwd(), 'tmp', `${hashId}.mistral.json`)
    await writeFile(tmpFilePath, JSON.stringify(responseData, null, 2), 'utf-8')
    console.log(`📄 Saved Mistral OCR result to ${tmpFilePath}`)

    // 6. Return response
    return {
      success: true,
      hashId,
      data: responseData,
    }
  }
  catch (error) {
    console.error(`❌ Mistral OCR analysis failed for ${hashId}:`, error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: `Mistral OCR analysis failed: ${error.message}`,
    })
  }
})
