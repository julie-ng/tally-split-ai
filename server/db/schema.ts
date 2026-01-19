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

  // User-facing fields
  title: text('title').default('Untitled'),

  // Business fields (extracted from OCR)
  merchantName: text('merchant_name'),
  merchantAddress: text('merchant_address'),
  merchantPhone: text('merchant_phone'),
  tags: text('tags'), // Comma-separated tags
  date: text('date'), // ISO date string
  subtotal: real('subtotal'),
  tax: real('tax'),
  tip: real('tip'),
  total: real('total'),
  currency: text('currency'),

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
 * Splits table - tracks expense splitting between two people
 */
export const splits = sqliteTable('splits', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Optional receipt association (null for standalone splits)
  receiptId: integer('receipt_id').references(() => receipts.id, { onDelete: 'set null' }),

  // Split details
  splitAmount: real('split_amount').notNull(), // Amount to split (defaults to receipt total)
  paidBy: text('paid_by'), // 'user1' or 'user2' - nullable until settled
  owedAmount: real('owed_amount'), // splitAmount / 2, rounded down - calculated when paidBy is set

  // Settlement tracking
  isSettled: integer('is_settled', { mode: 'boolean' }).notNull().default(false),
  settledAt: integer('settled_at', { mode: 'timestamp' }),

  // Metadata
  notes: text('notes'),
  userId: text('user_id').notNull(),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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

// Receipt has many uploads and optionally one split
export const receiptsRelations = relations(receipts, ({ many, one }) => ({
  uploads: many(uploads),
  split: one(splits, {
    fields: [receipts.id],
    references: [splits.receiptId],
  }),
}))

// Upload belongs to one receipt
export const uploadsRelations = relations(uploads, ({ one }) => ({
  receipt: one(receipts, {
    fields: [uploads.receiptId],
    references: [receipts.id],
  }),
}))

// Split belongs to one receipt (optional)
export const splitsRelations = relations(splits, ({ one }) => ({
  receipt: one(receipts, {
    fields: [splits.receiptId],
    references: [receipts.id],
  }),
}))
