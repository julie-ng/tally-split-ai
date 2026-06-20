import { pgTable, text, integer, bigint, serial, real, boolean, timestamp, jsonb, uuid, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { PAID_BY_MATCHES } from '#shared/enums/paid-by-match.js'
import { RECEIPT_ANALYSIS_STATUSES } from '#shared/enums/receipt-analysis-status.js'
import { UPLOAD_ANALYSIS_STATUSES } from '#shared/enums/upload-analysis-status.js'
import { UPLOAD_STATUSES } from '#shared/enums/upload-status.js'
import { WORKFLOW_STATUSES, WORKFLOW_STEP_STATUSES } from '#shared/enums/workflow-status.js'
import { generateId } from '#shared/utils/generate-id.js'

/**
 * Households - groups of users that share receipts/uploads/splits.
 * POC constraint: max 2 members per household, enforced at API layer (not DB).
 */
export const households = pgTable('households', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name'),
  description: text('description'),
  // Free-text guidance appended to the system prompt of analyze-annotations
  // and adjust-split LLM tasks. Snapshotted into the workflow payload at
  // trigger time — in-flight runs are unaffected by edits.
  customInstructions: text('custom_instructions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Receipts table - stores business/finance data extracted from receipt uploads
 */
// @ts-expect-error implicit return type any
export const receipts = pgTable('receipts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),

  // User-facing fields
  title: text('title').default('Untitled'),

  // Business fields (extracted from OCR)
  merchantName: text('merchant_name'),
  merchantAddress: text('merchant_address'),
  merchantPhone: text('merchant_phone'),
  tags: text('tags'), // Comma-separated tags
  date: text('date'), // ISO date string (e.g. "2025-11-07")
  time: text('time'), // ISO time string (e.g. "17:45:00"), null if not available
  subtotal: real('subtotal'),
  tax: real('tax'),
  tip: real('tip'),
  total: real('total'),
  currency: text('currency'),

  // User fields
  notes: text('notes'), // User-editable notes

  // Status tracking
  analysisStatus: text('analysis_status', { enum: RECEIPT_ANALYSIS_STATUSES }).notNull().default('unanalyzed'),

  // Metadata — uploader (creator) of the receipt
  // @ts-expect-error implicit return type any
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

  // Household scope for authZ.
  // @ts-expect-error implicit return type any
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'restrict' }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Uploads table - stores file/blob metadata for uploaded receipt images
 */
export const uploads = pgTable('uploads', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  // @ts-expect-error implicit return type any
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  title: text('title').notNull().default('Untitled'),

  // Foreign key to receipts table
  receiptId: text('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),

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

  // Household scope for authZ. Set explicitly at upload creation rather than
  // derived via receiptId, because uploads exist briefly before OCR creates
  // the receipt — during that window receiptId is null. Keeping the column
  // always-set means authZ has one code path, not two.
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'restrict' }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  uploadedAt: timestamp('uploaded_at'),
})

/**
 * Splits table - tracks expense splitting between two household members
 */
// @ts-expect-error implicit type any
export const splits = pgTable('splits', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),

  // @ts-expect-error implicit return type any
  receiptId: text('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),

  // Household scope for authZ. Stamped once at split creation and never changed
  // (a split never moves households). Set explicitly rather than derived via
  // receiptId so standalone splits (receiptId null) are still reachable and
  // authZ has one code path. Write-once: no request/update schema accepts it.
  // TEMPORARILY NULLABLE for the backfill — re-add .notNull() after running
  // seed-split-household-ids.js. See run sequence in JOURNAL.md / SCHEMA.md.
  householdId: text('household_id').references(() => households.id, { onDelete: 'restrict' }),

  // Split details
  splitAmount: real('split_amount').notNull(), // Amount to split (defaults to receipt total)
  userOneShare: real('user_one_share'), // userOne's share
  userTwoShare: real('user_two_share'), // userTwo's share

  // Household member slots — assigned at split-create time by users.createdAt order.
  // Nullable to support demo/portfolio uploads where the household has only 1 member.
  // @ts-expect-error implicit return type any
  userOneId: text('user_one_id').references(() => users.id, { onDelete: 'restrict' }),
  // @ts-expect-error implicit return type any
  userTwoId: text('user_two_id').references(() => users.id, { onDelete: 'restrict' }),

  // Who paid — nullable until resolved (LLM via initials, or human edit).
  // @ts-expect-error implicit return type any
  paidByUserId: text('paid_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  // Frozen LLM signal — see docs/SCHEMA.md. Never updated by humans.
  paidByMatch: text('paid_by_match', { enum: PAID_BY_MATCHES }).notNull().default('unresolved'),

  // Settlement tracking
  isSettled: boolean('is_settled').notNull().default(false),
  settledAt: timestamp('settled_at'),

  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Workflow runs table - tracks analysis workflow orchestration
 */
export const workflowRuns = pgTable('workflow_runs', {
  id: serial('id').primaryKey(),

  // Resource link
  uploadId: text('upload_id').references(() => uploads.id, { onDelete: 'cascade' }),

  // UUID for secure callback endpoint (opaque, unguessable)
  uuid: uuid('uuid').defaultRandom().notNull(),

  // Trigger.dev run ID for dashboard linking
  triggerRunId: text('trigger_run_id'),

  // Overall workflow status
  status: text('status', { enum: WORKFLOW_STATUSES }).notNull().default('queued'),

  // Per-step statuses
  ocrStatus: text('ocr_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  annotationsStatus: text('annotations_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  createSplitStatus: text('create_split_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  adjustSplitStatus: text('adjust_split_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  normalizeStatus: text('normalize_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),

  // Per-step error messages, keyed by step name (e.g. { ocr, annotations,
  // adjustSplit, _orchestrator }). Null when the run has no errors.
  errors: jsonb('errors'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
})

/**
 * Changes table - tracks who/what made a mutation (one row per operation)
 */
export const changes = pgTable('changes', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // 'user:<userId>' or 'task:<taskName>'
  sourceVersion: text('source_version'), // e.g. 'gpt-4o:2024-11-20', trigger task version, or null
  confidence: real('confidence'), // 0-1 score for AI-generated changes, null for human edits
  reasoning: text('reasoning'), // LLM explanation for AI-generated changes
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Receipt history - per-field change tracking for receipts
 */
// @ts-expect-error implicit return type any
export const receiptHistory = pgTable('receipt_history', {
  id: serial('id').primaryKey(),
  // @ts-expect-error implicit return type any
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  // @ts-expect-error implicit return type any
  receiptId: text('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  confidence: real('confidence'), // 0-1 per-field confidence for AI-generated changes
})

/**
 * Split history - per-field change tracking for splits
 */
// @ts-expect-error implicit return type any
export const splitHistory = pgTable('split_history', {
  id: serial('id').primaryKey(),
  // @ts-expect-error implicit return type any
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  // @ts-expect-error implicit return type any
  splitId: text('split_id').references(() => splits.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  confidence: real('confidence'), // 0-1 per-field confidence for AI-generated changes
})

/**
 * Users
 */
// @ts-expect-error implicit return type any
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  githubId: bigint('github_id', { mode: 'number' }).notNull(),
  // @ts-expect-error implicit return type any
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'restrict' }),
  username: text('username').notNull(),
  displayName: text('display_name'),
  initials: text('initials'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('users_github_id_idx').on(table.githubId),
])

/**
 * Relations
 */

// Household has many users, receipts, uploads
export const householdsRelations = relations(households, ({ many }) => ({
  users: many(users),
  receipts: many(receipts),
  uploads: many(uploads),
  splits: many(splits),
}))

// User belongs to one household
export const usersRelations = relations(users, ({ one }) => ({
  household: one(households, {
    fields: [users.householdId],
    references: [households.id],
  }),
}))

// Receipt has many uploads, belongs to one household and one user (uploader)
export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  uploads: many(uploads),
  household: one(households, {
    fields: [receipts.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [receipts.userId],
    references: [users.id],
  }),
}))

// Upload belongs to one receipt, one household, has many workflow runs.
// 💡 Note: Upload has its own householdId (rather than deriving via receipt) for the
// brief window between upload creation and receipt creation by the OCR task.
export const uploadsRelations = relations(uploads, ({ one, many }) => ({
  receipt: one(receipts, {
    fields: [uploads.receiptId],
    references: [receipts.id],
  }),
  workflowRuns: many(workflowRuns),
  household: one(households, {
    fields: [uploads.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [uploads.userId],
    references: [users.id],
  }),
}))

export const splitsRelations = relations(splits, ({ one }) => ({
  receipt: one(receipts, {
    fields: [splits.receiptId],
    references: [receipts.id],
  }),
  household: one(households, {
    fields: [splits.householdId],
    references: [households.id],
  }),
  userOne: one(users, {
    fields: [splits.userOneId],
    references: [users.id],
    relationName: 'splitUserOne',
  }),
  userTwo: one(users, {
    fields: [splits.userTwoId],
    references: [users.id],
    relationName: 'splitUserTwo',
  }),
  paidByUser: one(users, {
    fields: [splits.paidByUserId],
    references: [users.id],
    relationName: 'splitPaidBy',
  }),
}))

// Workflow run belongs to one upload
export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  upload: one(uploads, {
    fields: [workflowRuns.uploadId],
    references: [uploads.id],
  }),
}))

// Change has many receipt history and split history entries
export const changesRelations = relations(changes, ({ many }) => ({
  receiptHistory: many(receiptHistory),
  splitHistory: many(splitHistory),
}))

// Receipt history belongs to a change and a receipt
export const receiptHistoryRelations = relations(receiptHistory, ({ one }) => ({
  change: one(changes, {
    fields: [receiptHistory.changeId],
    references: [changes.id],
  }),
  receipt: one(receipts, {
    fields: [receiptHistory.receiptId],
    references: [receipts.id],
  }),
}))

// Split history belongs to a change and a split
export const splitHistoryRelations = relations(splitHistory, ({ one }) => ({
  change: one(changes, {
    fields: [splitHistory.changeId],
    references: [changes.id],
  }),
  split: one(splits, {
    fields: [splitHistory.splitId],
    references: [splits.id],
  }),
}))
