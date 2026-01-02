import { db, schema } from 'hub:db'
import { eq, sql } from 'drizzle-orm'
import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from '@azure-rest/ai-document-intelligence'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const hashId = getRouterParam(event, 'hashId')

  // Validate hashId parameter
  if (!hashId || typeof hashId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid hashId parameter'
    })
  }

  try {
    // 1. Fetch upload record from database
    const uploads = await db
      .select()
      .from(schema.uploads)
      .where(eq(schema.uploads.hashId, hashId))

    if (uploads.length === 0) {
      throw createError({
        statusCode: 404,
        message: `Upload with hashId '${hashId}' not found`
      })
    }

    const upload = uploads[0]

    // 2. Validate upload status
    if (upload.status !== 'uploaded') {
      throw createError({
        statusCode: 400,
        message: `Upload must be completed before analysis. Current status: ${upload.status}`
      })
    }

    // 3. Update status to 'processing'
    await db
      .update(schema.uploads)
      .set({ analysisStatus: 'processing' })
      .where(eq(schema.uploads.hashId, hashId))

    // 4. Generate read-only SAS token (5 minutes)
    const { uploadUrl: blobUrlWithSas } = generateBlobSasToken(upload.blobName, {
      permissions: 'read',
      expiresInMinutes: 5
    })

    // 5. Get Azure Document Intelligence config
    const { endpoint, key } = getAzureDocumentIntelligenceConfig()

    // 6. Call Azure Document Intelligence API
    const client = DocumentIntelligence(endpoint, { key })

    const initialResponse = await client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-receipt')
      .post({
        contentType: 'application/json',
        body: {
          urlSource: blobUrlWithSas
        }
      })

    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error
    }

    const poller = getLongRunningPoller(client, initialResponse)
    const result = await poller.pollUntilDone()
    const analyzeResult = result.body.analyzeResult

    // 7. Save full response to temp file
    const tmpFilePath = join(process.cwd(), 'tmp', `${hashId}.json`)
    await writeFile(tmpFilePath, JSON.stringify(result.body, null, 2), 'utf-8')
    console.log(`📄 Saved analysis result to ${tmpFilePath}`)

    // 8. Extract data from analyzeResult
    const documents = analyzeResult?.documents
    const document = documents && documents[0]

    if (!document) {
      throw new Error('No receipt document found in analysis result')
    }

    const fields = document.fields
    const extractedData = {
      analysisOcrResult: analyzeResult.content || null,
      merchantName: fields.MerchantName?.content || null,
      merchantAddress: fields.MerchantAddress?.content || null,
      receiptDate: fields.TransactionDate?.valueDate || null,
      receiptSubtotal: fields.Subtotal?.valueCurrency?.amount ||
        fields.TaxDetails?.valueArray?.[0]?.valueObject?.NetAmount?.valueCurrency?.amount ||
        null,
      receiptTotal: fields.Total?.valueCurrency?.amount || null,
      receiptCurrency: fields.Total?.valueCurrency?.currencyCode || null,
      receiptTax: fields.TotalTax?.valueCurrency?.amount || null
    }

    // 9. Compare receiptTotal with existing value
    if (upload.receiptTotal && extractedData.receiptTotal) {
      if (Math.abs(upload.receiptTotal - extractedData.receiptTotal) > 0.01) {
        console.warn(
          `Receipt total mismatch for hashId: ${hashId}, ` +
          `DB: ${upload.receiptTotal}, ` +
          `Azure: ${extractedData.receiptTotal}`
        )
      }
    }

    // 10 & 11. Update database with extracted fields and set status to 'completed'
    await db
      .update(schema.uploads)
      .set({
        analysisStatus: 'completed',
        analyzedAt: sql`(unixepoch())`,
        ...extractedData
      })
      .where(eq(schema.uploads.hashId, hashId))

    // 12. Return success response
    return {
      success: true,
      hashId,
      analysisStatus: 'completed',
      extractedData
    }

  } catch (error) {
    // Error handling: set status to 'failed'
    console.error(`❌ Analysis failed for ${hashId}:`, error)

    try {
      await db
        .update(schema.uploads)
        .set({ analysisStatus: 'failed' })
        .where(eq(schema.uploads.hashId, hashId))
    } catch (dbError) {
      console.error('Failed to update status to failed:', dbError)
    }

    throw createError({
      statusCode: 500,
      message: `Analysis failed: ${error.message}`
    })
  }
})
