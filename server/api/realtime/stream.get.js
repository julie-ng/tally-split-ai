export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  requireUserId(event)
  const userId = event.context.userId

  const eventStream = createEventStream(event)
  log.info({ userId }, 'SSE stream connected')

  const handler = (data) => {
    log.info({ userId, data }, 'SSE event emitted')
    eventStream.push({
      event: 'workflow-update',
      data: JSON.stringify(data),
    })
  }

  workflowBus.on(userId, handler)

  eventStream.onClosed(() => {
    log.info({ userId }, 'SSE stream disconnected')
    workflowBus.off(userId, handler)
  })

  return eventStream.send()
})
