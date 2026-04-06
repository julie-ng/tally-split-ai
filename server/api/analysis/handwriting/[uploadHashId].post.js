import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
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

    // 3. Load existing OCR line items from analysis file
    const analysisResult = await readAnalysisFile(hashId)
    let ocrLineItems = []

    if (analysisResult.success) {
      const fields = analysisResult.data?.analyzeResult?.documents?.[0]?.fields
      const items = fields?.Items?.valueArray || []
      ocrLineItems = items.map(item => ({
        description: item.valueObject?.Description?.content || null,
        quantity: item.valueObject?.Quantity?.valueNumber || null,
        totalPrice: item.valueObject?.TotalPrice?.valueCurrency?.amount || null,
      }))
    }

    // 4. Call GPT-4o for handwriting analysis
    const responseData = await gpt4oUtils.analyzeHandwriting(blobUrlWithSas, ocrLineItems)

    // 5. Save raw response to temp file
    const tmpFilePath = join(process.cwd(), 'tmp', `${hashId}.handwriting.json`)
    await writeFile(tmpFilePath, JSON.stringify(responseData, null, 2), 'utf-8')
    console.log(`📄 Saved handwriting analysis to ${tmpFilePath}`)

    // 6. Return response
    return {
      success: true,
      hashId,
      data: responseData,
    }
  }
  catch (error) {
    console.error(`❌ Handwriting analysis failed for ${hashId}:`, error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: `Handwriting analysis failed: ${error.message}`,
    })
  }
})
