import { tasks } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  requireUserId(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')

  // TODO: Extract upload existence check into a guard (e.g., requireUploadByHashId)
  // to avoid duplicating this across endpoints and trigger tasks
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
  })

  if (!upload) {
    throw createError({ statusCode: 404, message: 'Upload not found' })
  }

  console.log(`🚀 [analysis/annotations] Triggering analyze-annotations for upload (${hashId})`)

  const [workflowRun] = await db
    .insert(schema.workflowRuns)
    .values({
      uploadId: upload.id,
      status: 'processing',
      ocrStatus: 'pending',
      annotationsStatus: 'pending',
      splitStatus: 'pending',
    })
    .returning()

  const handle = await tasks.trigger('analyze-annotations', {
    uploadHashId: hashId,
    workflowRunId: workflowRun.id,
  })
  console.log(`✅ [analysis/annotations] Triggered analyze-annotations for upload (${hashId}), triggerRunId: ${handle.id}`)

  return {
    success: true,
    runId: handle.id,
  }
})
