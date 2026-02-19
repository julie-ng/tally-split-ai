import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'
import { RECEIPT_ANALYSIS_STATUSES } from '../../shared/enums/receipt-analysis-status.js'

/**
 * Receipts table - stores business/finance data extracted from receipt uploads
 */
// @ts-expect-error implicit return type any
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

  // Relationships
  // @ts-expect-error implicit return type any
  splitId: integer('split_id').references(() => splits.id, { onDelete: 'set null' }),

  // Status tracking
  // isAnalyzed: integer('is_analyzed', { mode: 'boolean' }).notNull().default(false), // TODO - remove
  analysisStatus: text('analysis_status', { enum: RECEIPT_ANALYSIS_STATUSES }).notNull().default('unanalyzed'),

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
// @ts-expect-error implicit type any
export const splits = sqliteTable('splits', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Optional receipt association (null for standalone splits)
  // @ts-expect-error implicit return type any
  receiptId: integer('receipt_id').references(() => receipts.id, { onDelete: 'set null' }),

  // Split details
  splitAmount: real('split_amount').notNull(), // Amount to split (defaults to receipt total)
  paidBy: text('paid_by'), // 'user1' or 'user2' - nullable until settled
  userAShare: real('user_a_share'), // Amount userA's share
  userBShare: real('user_b_share'), // Amount userB's share

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
 * Relations
 */

// Receipt has many uploads and optionally one split
export const receiptsRelations = relations(receipts, ({ many, one }) => ({
  uploads: many(uploads),
  split: one(splits, {
    fields: [receipts.splitId],
    references: [splits.id],
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
