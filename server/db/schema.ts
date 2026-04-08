import { pgTable, text, integer, serial, real, boolean, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { RECEIPT_ANALYSIS_STATUSES } from '../../shared/enums/receipt-analysis-status.js'
import { UPLOAD_ANALYSIS_STATUSES } from '../../shared/enums/upload-analysis-status.js'
import { UPLOAD_STATUSES } from '../../shared/enums/upload-status.js'
import { WORKFLOW_STATUSES, WORKFLOW_STEP_STATUSES } from '../../shared/enums/workflow-status.js'

/**
 * Receipts table - stores business/finance data extracted from receipt uploads
 */
// @ts-expect-error implicit return type any
export const receipts = pgTable('receipts', {
  id: serial('id').primaryKey(),

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
  analysisStatus: text('analysis_status', { enum: RECEIPT_ANALYSIS_STATUSES }).notNull().default('unanalyzed'),

  // Metadata
  userId: text('user_id').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Uploads table - stores file/blob metadata for uploaded receipt images
 */
export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  hashId: text('hash_id').notNull().unique(),
  userId: text('user_id').notNull().default('local-dev-user'),
  title: text('title').notNull().default('Untitled'),

  // Foreign key to receipts table
  receiptId: integer('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),

  // Azure Blob Storage info
  status: text('status', { enum: UPLOAD_STATUSES }).notNull().default('initialized'),
  blobName: text('blob_name').notNull().unique(),
  blobUrl: text('blob_url').notNull().unique(),
  thumbnailName: text('thumbnail_name'),
  thumbnailUrl: text('thumbnail_url'),
  originalFilename: text('original_filename').notNull(),
  contentType: text('content_type'),
  size: integer('size'),
  azureTags: jsonb('azure_tags'), // Azure blob tags as JSON

  // Analysis status (updated by workflow orchestrator)
  analysisStatus: text('analysis_status', { enum: UPLOAD_ANALYSIS_STATUSES }).default('pending'),
  analyzedAt: timestamp('analyzed_at'), // set when full workflow completes

  // OCR results (Azure Document Intelligence)
  ocrText: text('ocr_text'), // plain text OCR output
  ocrJson: jsonb('ocr_json'), // full structured DI response

  // Annotation results (GPT-4o)
  annotationsJson: jsonb('annotations_json'), // handwriting, circles, strikethroughs, etc.

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  uploadedAt: timestamp('uploaded_at'),
})

/**
 * Splits table - tracks expense splitting between two people
 */
// @ts-expect-error implicit type any
export const splits = pgTable('splits', {
  id: serial('id').primaryKey(),

  // Optional receipt association (null for standalone splits)
  // @ts-expect-error implicit return type any
  receiptId: integer('receipt_id').references(() => receipts.id, { onDelete: 'set null' }),

  // Split details
  splitAmount: real('split_amount').notNull(), // Amount to split (defaults to receipt total)
  paidBy: text('paid_by'), // 'user1' or 'user2' - nullable until settled
  userAShare: real('user_a_share'), // Amount userA's share
  userBShare: real('user_b_share'), // Amount userB's share

  // Settlement tracking
  isSettled: boolean('is_settled').notNull().default(false),
  settledAt: timestamp('settled_at'),

  // Metadata
  notes: text('notes'),
  userId: text('user_id').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Workflow runs table - tracks analysis workflow orchestration
 */
export const workflowRuns = pgTable('workflow_runs', {
  id: serial('id').primaryKey(),

  // Link to upload that triggered this workflow
  uploadId: integer('upload_id').references(() => uploads.id, { onDelete: 'cascade' }).notNull(),

  // UUID for secure callback endpoint (opaque, unguessable)
  uuid: uuid('uuid').defaultRandom().notNull(),

  // Trigger.dev run ID for dashboard linking
  triggerRunId: text('trigger_run_id'),

  // Overall workflow status
  status: text('status', { enum: WORKFLOW_STATUSES }).notNull().default('queued'),

  // Per-step statuses
  ocrStatus: text('ocr_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  annotationsStatus: text('annotations_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  splitStatus: text('split_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),

  // Error tracking
  error: text('error'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
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

// Upload belongs to one receipt, has many workflow runs
export const uploadsRelations = relations(uploads, ({ one, many }) => ({
  receipt: one(receipts, {
    fields: [uploads.receiptId],
    references: [receipts.id],
  }),
  workflowRuns: many(workflowRuns),
}))

// Split belongs to one receipt (optional)
export const splitsRelations = relations(splits, ({ one }) => ({
  receipt: one(receipts, {
    fields: [splits.receiptId],
    references: [receipts.id],
  }),
}))

// Workflow run belongs to one upload
export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  upload: one(uploads, {
    fields: [workflowRuns.uploadId],
    references: [uploads.id],
  }),
}))
