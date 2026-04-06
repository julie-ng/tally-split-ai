import { eq } from 'drizzle-orm'
import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from '@azure-rest/ai-document-intelligence'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
// import { azureStorageUtils } from '~/server/utils/azure-storage-utils.helper.js'

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

    // 2. Validate upload status
    if (upload.status !== 'uploaded') {
      throw createError({
        statusCode: 400,
        message: `Upload must be completed before analysis. Current status: ${upload.status}`,
      })
    }

    // 3. Update status to 'processing'
    await db
      .update(schema.uploads)
      .set({ analysisStatus: 'processing' })
      .where(eq(schema.uploads.hashId, hashId))

    // 4. Generate read-only SAS token (5 minutes)
    const { uploadUrl: blobUrlWithSas } = azureStorageUtils.generateBlobSasToken(upload.blobName, {
      permissions: 'read',
      expiresInMinutes: 5,
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
          urlSource: blobUrlWithSas,
        },
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

    // 9. Extract receipt data for the receipts table
    const receiptData = {
      merchantName: fields.MerchantName?.content || null,
      merchantAddress: fields.MerchantAddress?.content || null,
      merchantPhone: fields.MerchantPhoneNumber?.content || null,
      date: fields.TransactionDate?.valueDate || null,
      subtotal: fields.Subtotal?.valueCurrency?.amount
        || fields.TaxDetails?.valueArray?.[0]?.valueObject?.NetAmount?.valueCurrency?.amount
        || null,
      total: fields.Total?.valueCurrency?.amount || null,
      currency: fields.Total?.valueCurrency?.currencyCode || null,
      tax: fields.TotalTax?.valueCurrency?.amount || null,
      analysisStatus: 'analyzed',
    }

    // 10. Get upload with receipt relation to check if receipt exists
    const uploadWithReceipt = await db.query.uploads.findFirst({
      where: eq(schema.uploads.hashId, hashId),
      with: { receipt: true },
    })

    let receiptId = uploadWithReceipt?.receiptId

    if (receiptId) {
      // Update existing receipt
      await db
        .update(schema.receipts)
        .set({ ...receiptData, updatedAt: new Date() })
        .where(eq(schema.receipts.id, receiptId))
      console.log(`✅ Updated existing receipt ${receiptId}`)
    }
    else {
      // Create new receipt, carrying over title and tags from the upload
      const [newReceipt] = await db
        .insert(schema.receipts)
        .values({
          ...receiptData,
          userId: upload.userId,
          title: upload.title || 'Untitled',
          tags: upload.azureTags?.['receipt-tags']?.replace(/\+/g, ', ') || null,
        })
        .returning()
      receiptId = newReceipt.id
      console.log(`✅ Created new receipt ${receiptId}`)
    }

    // 11. Update upload with analysis status and receipt link
    await db
      .update(schema.uploads)
      .set({
        analysisStatus: 'completed',
        analyzedAt: new Date(),
        analysisOcrResult: analyzeResult.content || null,
        receiptId: receiptId,
      })
      .where(eq(schema.uploads.hashId, hashId))

    // 12. Return success response
    return {
      success: true,
      hashId,
      analysisStatus: 'completed',
      receiptId,
      receiptData,
    }
  }
  catch (error) {
    // Error handling: set status to 'failed'
    console.error(`❌ Analysis failed for ${hashId}:`, error)

    try {
      await db
        .update(schema.uploads)
        .set({ analysisStatus: 'failed' })
        .where(eq(schema.uploads.hashId, hashId))
    }
    catch (dbError) {
      console.error('Failed to update status to failed:', dbError)
    }

    throw createError({
      statusCode: 500,
      message: `Analysis failed: ${error.message}`,
    })
  }
})
