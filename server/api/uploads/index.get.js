import { db, schema } from 'hub:db'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const { userId } = query

	// Validate userId
	if (!userId || typeof userId !== 'string') {
		throw createError({
			statusCode: 400,
			message: 'Invalid userId parameter'
		})
	}

	// Fetch uploads for the user, ordered by most recent first
	const uploads = await db
		.select()
		.from(schema.uploads)
		.where(eq(schema.uploads.userId, userId))
		.orderBy(desc(schema.uploads.createdAt))

	// Parse azureTags JSON strings back to objects
	const uploadsWithParsedTags = uploads.map(upload => ({
		...upload,
		azureTags: upload.azureTags ? JSON.parse(upload.azureTags) : null
	}))

	return {
		count: uploadsWithParsedTags.length,
		uploads: uploadsWithParsedTags
	}
})
