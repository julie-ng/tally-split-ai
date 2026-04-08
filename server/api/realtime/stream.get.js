export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const eventStream = createEventStream(event)

  const handler = (data) => {
    eventStream.push({
      event: 'workflow-update',
      data: JSON.stringify(data),
    })
  }

  workflowBus.on(userId, handler)

  eventStream.onClosed(() => {
    workflowBus.off(userId, handler)
  })

  return eventStream.send()
})
