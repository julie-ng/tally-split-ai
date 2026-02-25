export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')

  const contents = await readAnalysisFile(hashId)
  if (contents.error) {
    setResponseStatus(event, contents.error.status)
    return contents.error
  }

  const analysisData = contents.data
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
