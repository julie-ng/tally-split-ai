/**
 * Strip an Azure Document Intelligence response to only the fields we need.
 * Drops pages[].words[], pages[].lines[], pages[].spans[], and analyzeResult.content
 * (redundant with ocrText column). Keeps documents with boundingRegions,
 * page dimensions, styles, and metadata.
 *
 * @param {Object} body - Full Azure DI response body (result.body)
 * @returns {Object} Slimmed response
 */
export function slimOcrResponse (body) {
  if (!body) return body

  const ar = body.analyzeResult
  if (!ar) return body

  return {
    status: body.status,
    createdDateTime: body.createdDateTime,
    lastUpdatedDateTime: body.lastUpdatedDateTime,
    analyzeResult: {
      apiVersion: ar.apiVersion,
      modelId: ar.modelId,
      pages: ar.pages?.map(p => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        unit: p.unit,
        angle: p.angle,
      })),
      styles: ar.styles,
      documents: ar.documents,
    },
  }
}
