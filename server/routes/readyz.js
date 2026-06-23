import { sql } from 'drizzle-orm'
import { uptimeUtils } from '#shared/utils/uptime.utils.js'

export default defineEventHandler(async (event) => {
  const uptime = Math.ceil(process.uptime())

  const database = await checkDatabase()
  const healthy = database.status === 'pass'

  if (!healthy) {
    setResponseStatus(event, 503)
  }
  setResponseHeader(event, 'Content-Type', 'application/health+json')

  return {
    status: healthy ? 'ok' : 'fail',
    message: healthy ? 'Server is up and running.' : 'Server is degraded.',
    timestamp: new Date().toISOString(),
    uptime,
    uptime_human_readable: uptimeUtils.formatUptime(uptime),
    checks: {
      'supabase:connection': [database],
    },
  }
})

/**
 * Probe the database with a trivial round-trip.
 *
 * Returns a single check in the `health+json` component shape
 * (draft-inadarei-api-health-check). Never throws — a failed
 * connection is reported as `fail`, not surfaced as a 500.
 */
async function checkDatabase () {
  const time = new Date().toISOString()
  try {
    await useDB().execute(sql`select 1`)
    return {
      status: 'pass',
      componentId: 'supabase-postgres',
      componentType: 'datastore',
      time,
    }
  }
  catch (error) {
    // Log the cause for operators; keep it out of the JSON response
    // so we don't leak driver internals to unauthenticated callers.
    useLogger('readyz').error(
      { code: error?.cause?.code, error },
      'Readiness check failed: database unreachable',
    )
    return {
      status: 'fail',
      componentId: 'supabase-postgres',
      componentType: 'datastore',
      time,
    }
  }
}
