import { z } from 'zod'

/**
 * Add Household Member Request Schema — validates POST /api/household/[id]/members body.
 * Username rules per https://docs.github.com/en/rest/users/users:
 *   - 1–39 characters
 *   - alphanumeric + single hyphens (no leading/trailing/consecutive hyphens)
 * The regex below is lenient on hyphens; GitHub itself returns 404 for invalid
 * usernames so we don't need to be strict here.
 */
export const addMemberRequestSchema = z.object({
  githubUsername: z.string()
    .min(1, 'GitHub username is required')
    .max(39, 'GitHub username must be 39 characters or fewer')
    .regex(/^[a-zA-Z0-9-]+$/, 'GitHub username may only contain letters, numbers, and hyphens'),
})
