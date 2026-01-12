import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

/**
 * Users table
 */
// export const users = sqliteTable('users', {
//   id: text('id').primaryKey(),
//   userId: text('user_id').notNull().unique(),
//   email: text('email').notNull().unique(),
//   fullName: text('full_name').notNull(),
//   createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
//   updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
// })

/**
 * Receipts table - stores business/finance data extracted from receipt uploads
 */
export const receipts = sqliteTable('receipts', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Business fields (extracted from OCR)
  merchantName: text('merchant_name'),
  merchantAddress: text('merchant_address'),
  merchantPhone: text('merchant_phone'),
  receiptTags: text('receipt_tags'), // Comma-separated tags
  receiptDate: text('receipt_date'), // ISO date string
  receiptSubtotal: real('receipt_subtotal'),
  receiptTax: real('receipt_tax'),
  receiptTotal: real('receipt_total'),
  receiptCurrency: text('receipt_currency'),

  // User fields
  notes: text('notes'), // User-editable notes

  // Status tracking
  isAnalyzed: integer('is_analyzed', { mode: 'boolean' }).notNull().default(false),

  // Metadata
  userId: text('user_id').notNull(),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

/**
 * Uploads table - stores file/blob metadata for uploaded receipt images
 */
export const uploads = sqliteTable('uploads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hashId: text('hash_id').notNull().unique(),
  userId: text('user_id').notNull().default('local-dev-user'),
  title: text('title').notNull().default('Untitled'),

  // Foreign key to receipts table
  receiptId: integer('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),

  // Azure Blob Storage info
  status: text('status').notNull().default('initialized'),
  blobName: text('blob_name').notNull().unique(),
  blobUrl: text('blob_url').notNull().unique(),
  thumbnailName: text('thumbnail_name'),
  thumbnailUrl: text('thumbnail_url'),
  originalFilename: text('original_filename').notNull(),
  contentType: text('content_type'),
  size: integer('size'),
  azureTags: text('azure_tags'), // JSON string of Azure blob tags

  // OCR/Analysis status
  analysisStatus: text('analysis_status').default('pending'), // pending, processing, completed, failed
  analyzedAt: integer('analyzed_at', { mode: 'timestamp' }),
  analysisOcrResult: text('analysis_ocr_result'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }),
})

/**
 * Receipt items table - line items from receipts
 */
// export const receiptItems = sqliteTable('receipt_items', {
//   id: integer('id').primaryKey({ autoIncrement: true }),
//   receiptId: integer('receipt_id').notNull().references(() => receipts.id),

//   description: text('description').notNull(),
//   quantity: real('quantity'),
//   unitPrice: real('unit_price'),
//   totalPrice: real('total_price').notNull(),

//   // For expense splitting
//   assignedTo: text('assigned_to'), // User initials or ID

//   createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
// })

/**
 * Relations
 */

// Receipt has many uploads (one receipt can have multiple photos)
export const receiptsRelations = relations(receipts, ({ many }) => ({
  uploads: many(uploads),
}))

// Upload belongs to one receipt
export const uploadsRelations = relations(uploads, ({ one }) => ({
  receipt: one(receipts, {
    fields: [uploads.receiptId],
    references: [receipts.id],
  }),
}))
