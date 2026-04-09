export default defineEventHandler((event) => {
  const log = useLogger('http')
  const start = Date.now()
  const url = getRequestURL(event)
  const method = event.method

  event.node.res.on('finish', () => {
    const status = event.node.res.statusCode
    const duration = Date.now() - start

    log.info({
      method,
      path: url.pathname,
      search: url.search || undefined,
      status,
      duration,
    })
  })
})
