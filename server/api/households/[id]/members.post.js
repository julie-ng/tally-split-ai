import { z } from 'zod'
import { eq, count } from 'drizzle-orm'
import { addMemberRequestSchema } from '#shared/utils/zod-schemas/add-member.schema.js'
import { deriveInitials } from '#shared/utils/initials.utils.js'

const HOUSEHOLD_MEMBER_CAP = 2

/**
 * Add a member to the current user's household via their GitHub username.
 * Fetches the public GitHub profile (anonymous, no auth) and creates a user
 * record. Newly added members must complete OAuth login themselves before
 * they can use the app — this endpoint just provisions the record.
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('household')
  const db = useDB()

  await guards.requireAuthentication(event)
  guards.requireUuidParam(event)

  const householdId = getRouterParam(event, 'id')

  // AuthZ: route param must match the authenticated user's household scope.
  // 404 (not 403) — pretend other households don't exist.
  if (householdId !== event.context.householdId) {
    logSecurityEvent(event, 'warn', {
      requestedHouseholdId: householdId,
      sessionHouseholdId: event.context.householdId,
      reason: 'household_scope_mismatch',
    }, 'Add-member denied')
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const result = await readValidatedBody(event, body => addMemberRequestSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { githubUsername } = result.data

  // Cap check — POC limits households to 2 members
  const [{ memberCount }] = await db
    .select({ memberCount: count() })
    .from(schema.users)
    .where(eq(schema.users.householdId, householdId))

  if (memberCount >= HOUSEHOLD_MEMBER_CAP) {
    throw createError({ statusCode: 409, message: 'Household is full' })
  }

  // Fetch public GitHub profile
  const ghResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername)}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (ghResponse.status === 404) {
    throw createError({ statusCode: 404, message: `GitHub user '${githubUsername}' not found` })
  }
  if (!ghResponse.ok) {
    log.error({ status: ghResponse.status, githubUsername }, 'GitHub API error')
    throw createError({ statusCode: 502, message: 'Could not reach GitHub' })
  }

  const ghUser = await ghResponse.json()

  // Reject if this githubId is already in some household
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.githubId, ghUser.id))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, message: 'GitHub user is already a member of a household' })
  }

  const displayName = ghUser.name ?? ghUser.login
  const [created] = await db
    .insert(schema.users)
    .values({
      githubId: ghUser.id,
      householdId,
      username: ghUser.login,
      displayName,
      initials: deriveInitials(displayName),
      avatarUrl: ghUser.avatar_url,
    })
    .returning({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      initials: schema.users.initials,
      avatarUrl: schema.users.avatarUrl,
      createdAt: schema.users.createdAt,
    })

  log.info({ householdId, userId: created.id, username: created.username }, 'Household member added')

  return {
    success: true,
    member: created,
  }
})
