import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')

  // Get upload from database with receipt relation
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
    columns: {
      hashId: true,
      originalFilename: true,
      blobName: true,
      size: true,
      createdAt: true,
      analyzedAt: true,
      azureTags: true,
      ocrJson: true,
    },
    with: {
      receipt: true,
    },
  })

  if (!upload) {
    setResponseStatus(event, 404)
    return {
      success: false,
      error: 'Upload not found in database',
    }
  }

  // Try DB first (new workflow stores ocrJson), fall back to tmp file (legacy)
  let analysisData = null

  if (upload.ocrJson) {
    analysisData = upload.ocrJson
  }
  else {
    const contents = await readAnalysisFile(hashId)
    if (contents.error) {
      setResponseStatus(event, contents.error.status)
      return contents.error
    }
    analysisData = contents.data
  }

  // Helper function to deep clone and remove specific keys
  const removeKeys = (obj, keysToRemove = ['boundingRegions', 'spans']) => {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => removeKeys(item, keysToRemove))
    }

    const cleaned = {}
    Object.keys(obj).forEach((key) => {
      if (!keysToRemove.includes(key)) {
        cleaned[key] = removeKeys(obj[key], keysToRemove)
      }
    })

    return cleaned
  }

  const resultFields = analysisData.analyzeResult.documents[0].fields
  const summary = []
  Object.keys(resultFields).forEach((key) => {
    const fieldData = resultFields[key]
    const f = {
      field: key,
    }

    // Include specific keys and any key starting with "value"
    Object.keys(fieldData).forEach((fieldKey) => {
      if (fieldKey === 'type' || fieldKey === 'confidence' || fieldKey === 'content' || fieldKey.startsWith('value')) {
        f[fieldKey] = removeKeys(fieldData[fieldKey])
      }
    })

    summary.push(f)
  })

  const sorted = AZReceiptModelUtils.sortFields(summary)
  sorted.items = AZReceiptModelUtils.sortItems(sorted.items)
  // console.log('⭐️ SORTED')
  // console.log(sorted)

  // Build response without ocrJson — already processed into azureAI.summary above
  const { ocrJson: _, ...uploadMeta } = upload // eslint-disable-line no-unused-vars

  return {
    success: true,
    data: {
      ...uploadMeta,
      status: analysisData.status,
      createdDateTime: analysisData.createdDateTime,
      azureAI: {
        apiVersion: analysisData.analyzeResult?.apiVersion,
        modelId: analysisData.analyzeResult?.modelId,
        summary: sorted,
        // original: summary
        // fieldsSummary: summary,
        // result: {
        //   document: analysisData.analyzeResult?.documents?.[0]
        // }
      },
    },
  }
})
