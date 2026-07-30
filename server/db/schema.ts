import { pgTable, text, integer, bigint, serial, real, boolean, timestamp, jsonb, uuid, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { PAID_BY_MATCHES } from '#shared/enums/paid-by-match.js'
import { UPLOAD_STATUSES } from '#shared/enums/upload-status.js'
import { WORKFLOW_RUN_STATUSES } from '#shared/enums/workflow-run-status.js'
import { WORKFLOW_STEP_STATUSES } from '#shared/enums/workflow-step-status.js'
import { generateId } from '#shared/utils/generate-id.js'

/**
 * Households - groups of users that share receipts/uploads/expenses.
 * POC constraint: max 2 members per household, enforced at API layer (not DB).
 */
export const households = pgTable('households', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name'),
  description: text('description'),
  // Free-text guidance appended to the system prompt of analyze-annotations
  // and adjust-expense LLM tasks. Snapshotted into the workflow payload at
  // trigger time — in-flight runs are unaffected by edits.
  customInstructions: text('custom_instructions'),
  // Consent to send household data (member first names + initials, never
  // userIds) to LLMs for expense analysis/attribution. Scope = LLM steps only;
  // pure OCR/vision (Azure Document Intelligence) does NOT require it. Off by
  // default — the adjust-expense task is skipped entirely unless this is true.
  // Like customInstructions, snapshotted into the workflow payload at trigger
  // time so in-flight runs are unaffected by edits.
  llmConsent: boolean('llm_consent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Receipts table - stores business/finance data extracted from receipt uploads
 */
export const receipts = pgTable('receipts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),

  // User-facing fields
  title: text('title').default('Untitled'),

  // Business fields (extracted from OCR)
  merchantName: text('merchant_name'),
  merchantAddress: text('merchant_address'),
  merchantPhone: text('merchant_phone'),
  date: text('date'), // ISO date string (e.g. "2025-11-07")
  time: text('time'), // ISO time string (e.g. "17:45:00"), null if not available
  subtotal: real('subtotal'),
  tax: real('tax'),
  tip: real('tip'),
  total: real('total'),
  currency: text('currency'),

  // Household scope for authZ.
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'restrict' }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Uploads table - stores file/blob metadata for uploaded receipt images
 */
export const uploads = pgTable('uploads', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
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

  // When the pipeline finished analyzing this upload. Stamped by status.put.js on
  // a terminal run status. The coarse `analysis_status` rollup that used to sit
  // here was dropped (mig 0027) — nothing read it, and it could disagree with
  // workflow_runs. Run/step status is the source of truth for WHAT happened;
  // this records WHEN, which workflow_runs doesn't carry per-upload.
  analyzedAt: timestamp('analyzed_at', { withTimezone: true }),

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
}, table => [
  // A receipt has exactly one upload (permanent invariant). Modelled as 1:many
  // originally; never used that way. Partial index so the pre-OCR window —
  // where receiptId is still null — is exempt.
  uniqueIndex('uploads_receipt_id_unique')
    .on(table.receiptId)
    .where(sql`${table.receiptId} IS NOT NULL`),
])

/**
 * Expenses table - tracks expense splitting between two household members
 */
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),

  receiptId: text('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),

  // Household scope for authZ. Stamped once at expense creation and never changed
  // (an expense never moves households). Set explicitly rather than derived via
  // receiptId so standalone expenses (receiptId null) are still reachable and
  // authZ has one code path. Write-once: no request/update schema accepts it.
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'restrict' }),

  // User-facing label. Copied from the receipt's title at creation when linked;
  // human-editable. Default 'Untitled' for standalone expenses.
  title: text('title').notNull().default('Untitled'),

  // Expense date+time, stored as a UTC instant (timestamptz). The sort/filter/
  // group key for the whole expenses UI — expenses own their own date so
  // listing never joins the receipt. Always interpreted in Europe/Berlin (POC
  // is Germany-only); see shared/utils/expense-date.utils.js for the one
  // sanctioned Berlin↔UTC conversion path. mode:'string' keeps the wire format
  // an ISO string. Manually-entered expenses with no time use midnight as a
  // legible sentinel. Copied from the receipt (date+time) for linked expenses.
  date: timestamp('date', { withTimezone: true, mode: 'string' }),

  // Expense details
  splitAmount: real('split_amount').notNull(), // Amount to split (defaults to receipt total)
  userOneShare: real('user_one_share'), // userOne's share
  userTwoShare: real('user_two_share'), // userTwo's share

  // Household member slots — assigned at split-create time by users.createdAt order.
  // Nullable to support demo/portfolio uploads where the household has only 1 member.
  userOneId: text('user_one_id').references(() => users.id, { onDelete: 'restrict' }),
  userTwoId: text('user_two_id').references(() => users.id, { onDelete: 'restrict' }),

  // Who paid — nullable until resolved (LLM via initials, or human edit).
  paidByUserId: text('paid_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  // Frozen LLM signal — see docs/SCHEMA.md. Never updated by humans.
  paidByMatch: text('paid_by_match', { enum: PAID_BY_MATCHES }).notNull().default('unresolved'),

  // Settlement tracking
  isSettled: boolean('is_settled').notNull().default(false),
  settledAt: timestamp('settled_at', { withTimezone: true }),

  // Flagged for human attention. Written by BOTH principals — that's the point:
  //   • the system (deterministic review step) raises it for low LLM confidence,
  //     an unmatched payer, or a PARTIAL run
  //   • a human clears it ("looked, it's fine") AND can raise it ("this is
  //     wrong, I'll come back to it")
  //
  // Deliberately NOT derived: reviewing is unobservable (browsing a row isn't
  // reviewing it), and a user-raised flag on an expense the pipeline was
  // confident about can't be computed from any signal.
  //
  // One column, not two. `is_reviewed` alongside this would be two columns
  // describing one situation — they can disagree, which is the same drift trap
  // as uploads.analysis_status vs workflow_runs.status. There's no reviewedAt
  // either: who/when/why already live in `changes` + `expense_history`.
  //
  // Known gap (accepted): once cleared, "reviewed and fine" is indistinguishable
  // from "never flagged" — both read false.
  needsReview: boolean('needs_review').notNull().default(false),

  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // A receipt has at most one expense (permanent invariant). Partial index so
  // standalone expenses (receiptId null) are exempt — multiple null-receiptId
  // expenses are allowed. Belt-and-suspenders with the check-first guard in
  // POST /api/expenses.
  uniqueIndex('expenses_receipt_id_unique')
    .on(table.receiptId)
    .where(sql`${table.receiptId} IS NOT NULL`),
])

/**
 * Workflow runs table - tracks analysis workflow orchestration
 */
export const workflowRuns = pgTable('workflow_runs', {
  id: serial('id').primaryKey(),

  // Resource link
  uploadId: text('upload_id').references(() => uploads.id, { onDelete: 'cascade' }),

  // Denormalized, write-once AuthZ scope. Lets realtime subscriptions and RLS
  // policies scope a run to a household by a DIRECT column rather than a 2-hop
  // join (workflow_runs → uploads → users/household_members). Populated at run
  // creation; never updated. NOT NULL after backfilling existing rows (see
  // migrations/backfills/seed-workflow-run-household-ids.js).
  householdId: text('household_id').notNull().references(() => households.id),

  // UUID for secure callback endpoint (opaque, unguessable)
  uuid: uuid('uuid').defaultRandom().notNull(),

  // Trigger.dev run ID for dashboard linking
  triggerRunId: text('trigger_run_id'),

  // Overall workflow status
  status: text('status', { enum: WORKFLOW_RUN_STATUSES }).notNull().default('queued'),

  // Per-step statuses
  ocrStatus: text('ocr_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  annotationsStatus: text('annotations_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  createExpenseStatus: text('create_expense_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  adjustExpenseStatus: text('adjust_expense_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),
  normalizeStatus: text('normalize_status', { enum: WORKFLOW_STEP_STATUSES }).notNull().default('pending'),

  // Per-step timestamps. Nullable — a step that hasn't started yet has both
  // null; a running step has startedAt only. Stamped server-side in
  // status.put.js by the status transition being written (→processing stamps
  // startedAt; →completed/failed/skipped stamps completedAt), so trigger tasks
  // don't send times. Rows created before this migration stay null (no
  // backfill) — those older runs just render without durations.
  //
  // timestamptz because these are instants (rules/database-timestamps.md).
  // Every timestamp in this schema is now timestamptz — mig 0028 converted the
  // last naive ones, which had been rendering as local time in the browser.
  ocrStartedAt: timestamp('ocr_started_at', { withTimezone: true }),
  ocrCompletedAt: timestamp('ocr_completed_at', { withTimezone: true }),
  annotationsStartedAt: timestamp('annotations_started_at', { withTimezone: true }),
  annotationsCompletedAt: timestamp('annotations_completed_at', { withTimezone: true }),
  normalizeStartedAt: timestamp('normalize_started_at', { withTimezone: true }),
  normalizeCompletedAt: timestamp('normalize_completed_at', { withTimezone: true }),
  createExpenseStartedAt: timestamp('create_expense_started_at', { withTimezone: true }),
  createExpenseCompletedAt: timestamp('create_expense_completed_at', { withTimezone: true }),
  adjustExpenseStartedAt: timestamp('adjust_expense_started_at', { withTimezone: true }),
  adjustExpenseCompletedAt: timestamp('adjust_expense_completed_at', { withTimezone: true }),

  // Per-step error messages, keyed by step name (e.g. { ocr, annotations,
  // adjustSplit, _orchestrator }). Null when the run has no errors.
  errors: jsonb('errors'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

/**
 * Changes table - tracks who/what made a mutation (one row per operation)
 *
 * Three kinds of writer, distinguished by source + sourceVersion:
 *   human           source 'user:<id>',  sourceVersion null
 *   LLM task        source 'task:<name>', sourceVersion e.g. 'gpt-4o:2024-11-20'
 *   deterministic task source 'task:<name>', sourceVersion null
 */
export const changes = pgTable('changes', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // 'user:<userId>' or 'task:<taskName>'
  sourceVersion: text('source_version'), // e.g. 'gpt-4o:2024-11-20' for LLM writes; null for humans AND deterministic tasks
  confidence: real('confidence'), // 0-1 score, LLM writes only; null for humans and deterministic tasks
  // Why the change was made. Usually an LLM explanation, but NOT LLM-only — a
  // deterministic task can (and should) record its reason too, e.g. the
  // orchestrator flagging an expense for review because the run was PARTIAL.
  reasoning: text('reasoning'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Receipt history - per-field change tracking for receipts
 */
export const receiptHistory = pgTable('receipt_history', {
  id: serial('id').primaryKey(),
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  receiptId: text('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  confidence: real('confidence'), // 0-1 per-field confidence for AI-generated changes
})

/**
 * Expense history - per-field change tracking for expenses
 */
export const expenseHistory = pgTable('expense_history', {
  id: serial('id').primaryKey(),
  changeId: integer('change_id').notNull().references(() => changes.id, { onDelete: 'cascade' }),
  expenseId: text('expense_id').references(() => expenses.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  confidence: real('confidence'), // 0-1 per-field confidence for AI-generated changes
})

/**
 * Users
 */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  githubId: bigint('github_id', { mode: 'number' }).notNull(),
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
  expenses: many(expenses),
}))

// User belongs to one household
export const usersRelations = relations(users, ({ one }) => ({
  household: one(households, {
    fields: [users.householdId],
    references: [households.id],
  }),
}))

// Receipt has many uploads, belongs to one household and one user (uploader)
export const receiptsRelations = relations(receipts, ({ one }) => ({
  // No fields/references: the FK lives on uploads.receiptId, so this side is
  // declared bare. Returns a single object or null — NOT an array.
  upload: one(uploads),
  household: one(households, {
    fields: [receipts.householdId],
    references: [households.id],
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

export const expensesRelations = relations(expenses, ({ one }) => ({
  receipt: one(receipts, {
    fields: [expenses.receiptId],
    references: [receipts.id],
  }),
  household: one(households, {
    fields: [expenses.householdId],
    references: [households.id],
  }),
  userOne: one(users, {
    fields: [expenses.userOneId],
    references: [users.id],
    relationName: 'expenseUserOne',
  }),
  userTwo: one(users, {
    fields: [expenses.userTwoId],
    references: [users.id],
    relationName: 'expenseUserTwo',
  }),
  paidByUser: one(users, {
    fields: [expenses.paidByUserId],
    references: [users.id],
    relationName: 'expensePaidBy',
  }),
}))

// Workflow run belongs to one upload
export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  upload: one(uploads, {
    fields: [workflowRuns.uploadId],
    references: [uploads.id],
  }),
}))

// Change has many receipt history and expense history entries
export const changesRelations = relations(changes, ({ many }) => ({
  receiptHistory: many(receiptHistory),
  expenseHistory: many(expenseHistory),
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

// Expense history belongs to a change and an expense
export const expenseHistoryRelations = relations(expenseHistory, ({ one }) => ({
  change: one(changes, {
    fields: [expenseHistory.changeId],
    references: [changes.id],
  }),
  expense: one(expenses, {
    fields: [expenseHistory.expenseId],
    references: [expenses.id],
  }),
}))
