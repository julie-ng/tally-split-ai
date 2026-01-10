import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Receipt ID is required'
    })
  }

  const receiptId = parseInt(id, 10)
  if (isNaN(receiptId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid receipt ID. Must be a number'
    })
  }

  const body = await readBody(event)

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  const {
    merchantName,
    merchantAddress,
    merchantPhone,
    receiptTags,
    receiptDate,
    receiptSubtotal,
    receiptTax,
    receiptTotal,
    receiptCurrency,
    notes,
    isAnalyzed
  } = body

  // Build update object with only provided fields
  const updates = {}

  if (merchantName !== undefined) {
    if (merchantName !== null && typeof merchantName !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid merchantName. Must be a string or null'
      })
    }
    updates.merchantName = merchantName
  }

  if (merchantAddress !== undefined) {
    if (merchantAddress !== null && typeof merchantAddress !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid merchantAddress. Must be a string or null'
      })
    }
    updates.merchantAddress = merchantAddress
  }

  if (merchantPhone !== undefined) {
    if (merchantPhone !== null && typeof merchantPhone !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid merchantPhone. Must be a string or null'
      })
    }
    updates.merchantPhone = merchantPhone
  }

  if (receiptTags !== undefined) {
    if (receiptTags !== null && typeof receiptTags !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid receiptTags. Must be a string or null'
      })
    }
    updates.receiptTags = receiptTags
  }

  if (receiptDate !== undefined) {
    if (receiptDate !== null && typeof receiptDate !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid receiptDate. Must be an ISO date string or null'
      })
    }
    updates.receiptDate = receiptDate
  }

  if (receiptSubtotal !== undefined) {
    if (receiptSubtotal !== null && typeof receiptSubtotal !== 'number') {
      throw createError({
        statusCode: 400,
        message: 'Invalid receiptSubtotal. Must be a number or null'
      })
    }
    updates.receiptSubtotal = receiptSubtotal
  }

  if (receiptTax !== undefined) {
    if (receiptTax !== null && typeof receiptTax !== 'number') {
      throw createError({
        statusCode: 400,
        message: 'Invalid receiptTax. Must be a number or null'
      })
    }
    updates.receiptTax = receiptTax
  }

  if (receiptTotal !== undefined) {
    if (receiptTotal !== null && typeof receiptTotal !== 'number') {
      throw createError({
        statusCode: 400,
        message: 'Invalid receiptTotal. Must be a number or null'
      })
    }
    updates.receiptTotal = receiptTotal
  }

  if (receiptCurrency !== undefined) {
    if (receiptCurrency !== null && typeof receiptCurrency !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid receiptCurrency. Must be a string or null'
      })
    }
    updates.receiptCurrency = receiptCurrency
  }

  if (notes !== undefined) {
    if (notes !== null && typeof notes !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid notes. Must be a string or null'
      })
    }
    updates.notes = notes
  }

  if (isAnalyzed !== undefined) {
    if (typeof isAnalyzed !== 'boolean') {
      throw createError({
        statusCode: 400,
        message: 'Invalid isAnalyzed. Must be a boolean'
      })
    }
    updates.isAnalyzed = isAnalyzed
  }

  // Always update the updatedAt timestamp
  updates.updatedAt = sql`(unixepoch())`

  // Check if there are any updates to make
  if (Object.keys(updates).length === 1) { // Only updatedAt
    throw createError({
      statusCode: 400,
      message: 'No valid fields to update'
    })
  }

  // Update the record (filtering by both id and userId for security)
  const result = await db
    .update(schema.receipts)
    .set(updates)
    .where(and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`
    })
  }

  return {
    success: true,
    updated: result[0]
  }
})
