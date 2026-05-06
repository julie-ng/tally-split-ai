import { eq } from 'drizzle-orm'

// Extracts bounding box polygons from Document Intelligence analysis results
// for rendering overlays on the receipt image.
export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const id = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { uploadId: id })

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.id, id),
    columns: { ocrJson: true },
  })

  if (!upload) {
    throw createError({ statusCode: 404, message: 'Upload not found' })
  }

  // TODO: Remove tmp file fallback once all uploads have ocrJson in DB
  let analysisData = null

  if (upload.ocrJson) {
    analysisData = upload.ocrJson
  }
  else {
    const contents = await readAnalysisFile(id)
    if (contents.error) {
      setResponseStatus(event, contents.error.status)
      return contents.error
    }
    analysisData = contents.data
  }

  const page = analysisData.analyzeResult?.pages?.[0]
  const fields = analysisData.analyzeResult?.documents?.[0]?.fields

  if (!page || !fields) {
    setResponseStatus(event, 404)
    return {
      success: false,
      message: 'No page or field data found in analysis results',
    }
  }

  const polygons = []

  const extractPolygon = (field, label) => {
    const region = field.boundingRegions?.[0]
    if (!region?.polygon) return
    polygons.push({
      label,
      content: field.content || '',
      polygon: region.polygon,
      confidence: field.confidence,
    })
  }

  for (const [key, field] of Object.entries(fields)) {
    if (key === 'Items' && field.type === 'array') {
      field.valueArray?.forEach((item, index) => {
        if (item.type === 'object' && item.valueObject) {
          for (const [subKey, subField] of Object.entries(item.valueObject)) {
            extractPolygon(subField, `Items[${index}].${subKey}`)
          }
        }
      })
    }
    else {
      extractPolygon(field, key)
    }
  }

  return {
    success: true,
    data: {
      page: {
        width: page.width,
        height: page.height,
      },
      polygons,
    },
  }
})
