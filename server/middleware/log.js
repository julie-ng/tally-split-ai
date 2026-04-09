import pino from 'pino'

const logger = pino()

export default defineEventHandler((event) => {
  const start = Date.now()
  const url = getRequestURL(event)
  const method = event.method

  event.node.res.on('finish', () => {
    const status = event.node.res.statusCode
    const duration = Date.now() - start

    logger.info({
      method,
      path: url.pathname,
      search: url.search || undefined,
      status,
      duration,
    })
  })
})
