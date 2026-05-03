import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
    columns: {
      hashId: true,
      blobName: true,
      ocrJson: true,
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

  // Only build results if Azure succeeded — for failed/in-progress/legacy
  // shapes, omit `results` and let the consumer check status before reading.
  let results = null
  const docFields = analysisData?.analyzeResult?.documents?.[0]?.fields
  if (docFields) {
    const summary = []
    Object.keys(docFields).forEach((key) => {
      const fieldData = docFields[key]
      const f = { field: key }

      // Include specific keys and any key starting with "value"
      Object.keys(fieldData).forEach((fieldKey) => {
        if (fieldKey === 'type' || fieldKey === 'confidence' || fieldKey === 'content' || fieldKey.startsWith('value')) {
          f[fieldKey] = removeKeys(fieldData[fieldKey])
        }
      })

      summary.push(f)
    })

    results = AZReceiptModelUtils.sortFields(summary)
    results.items = AZReceiptModelUtils.sortItems(results.items)
  }

  return {
    success: true,
    data: {
      upload: {
        hashId: upload.hashId,
        blobName: upload.blobName,
      },
      azureAIDocIntel: {
        status: analysisData.status,
        createdDateTime: analysisData.createdDateTime,
        apiVersion: analysisData.analyzeResult?.apiVersion,
        modelId: analysisData.analyzeResult?.modelId,
        results,
      },
    },
  }
})
