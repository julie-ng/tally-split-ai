export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')
  const result = await readAnalysisFile(`${hashId}.mistral`)

  if (!result.success) {
    return {
      success: false,
      hashId,
      data: null,
    }
  }

  return {
    success: true,
    hashId,
    data: result.data,
  }
})
