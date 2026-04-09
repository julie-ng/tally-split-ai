export default defineEventHandler(async (event) => {
  console.log('[SSE] Stream endpoint hit')

  requireUserId(event)
  const userId = event.context.userId
  console.log(`[SSE] User: ${userId}`)

  const eventStream = createEventStream(event)
  console.log('[SSE] Event stream created')

  const handler = (data) => {
    console.log('[SSE] Emitting to client:', data)
    eventStream.push({
      event: 'workflow-update',
      data: JSON.stringify(data),
    })
  }

  workflowBus.on(userId, handler)
  console.log(`[SSE] Listening on bus for user: ${userId}`)

  eventStream.onClosed(() => {
    console.log(`[SSE] Client disconnected: ${userId}`)
    workflowBus.off(userId, handler)
  })

  return eventStream.send()
})
