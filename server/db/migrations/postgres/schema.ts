import { pgTable, serial, text, real, timestamp, foreignKey, integer, uniqueIndex, bigint, boolean, unique, jsonb, uuid, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const changes = pgTable("changes", {
	id: serial().primaryKey().notNull(),
	source: text().notNull(),
	sourceVersion: text("source_version"),
	confidence: real(),
	reasoning: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const receiptHistory = pgTable("receipt_history", {
	id: serial().primaryKey().notNull(),
	changeId: integer("change_id").notNull(),
	receiptId: text("receipt_id"),
	field: text().notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	confidence: real(),
}, (table) => [
	foreignKey({
			columns: [table.changeId],
			foreignColumns: [changes.id],
			name: "receipt_history_change_id_changes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.receiptId],
			foreignColumns: [receipts.id],
			name: "receipt_history_receipt_id_receipts_id_fk"
		}).onDelete("set null"),
]);

export const receipts = pgTable("receipts", {
	id: text().primaryKey().notNull(),
	title: text().default('Untitled'),
	merchantName: text("merchant_name"),
	merchantAddress: text("merchant_address"),
	merchantPhone: text("merchant_phone"),
	tags: text(),
	date: text(),
	time: text(),
	subtotal: real(),
	tax: real(),
	tip: real(),
	total: real(),
	currency: text(),
	notes: text(),
	analysisStatus: text("analysis_status").default('unanalyzed').notNull(),
	userId: text("user_id").notNull(),
	householdId: text("household_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "receipts_user_id_users_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.householdId],
			foreignColumns: [households.id],
			name: "receipts_household_id_households_id_fk"
		}).onDelete("restrict"),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	githubId: bigint("github_id", { mode: "number" }).notNull(),
	householdId: text("household_id").notNull(),
	username: text().notNull(),
	displayName: text("display_name"),
	initials: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("users_github_id_idx").using("btree", table.githubId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.householdId],
			foreignColumns: [households.id],
			name: "users_household_id_households_id_fk"
		}).onDelete("restrict"),
]);

export const households = pgTable("households", {
	id: text().primaryKey().notNull(),
	name: text(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const splitHistory = pgTable("split_history", {
	id: serial().primaryKey().notNull(),
	changeId: integer("change_id").notNull(),
	splitId: text("split_id"),
	field: text().notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	confidence: real(),
}, (table) => [
	foreignKey({
			columns: [table.changeId],
			foreignColumns: [changes.id],
			name: "split_history_change_id_changes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.splitId],
			foreignColumns: [splits.id],
			name: "split_history_split_id_splits_id_fk"
		}).onDelete("set null"),
]);

export const splits = pgTable("splits", {
	id: text().primaryKey().notNull(),
	receiptId: text("receipt_id"),
	splitAmount: real("split_amount").notNull(),
	userOneShare: real("user_one_share"),
	userTwoShare: real("user_two_share"),
	userOneId: text("user_one_id"),
	userTwoId: text("user_two_id"),
	paidByUserId: text("paid_by_user_id"),
	paidByMatch: text("paid_by_match").default('unresolved').notNull(),
	isSettled: boolean("is_settled").default(false).notNull(),
	settledAt: timestamp("settled_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.receiptId],
			foreignColumns: [receipts.id],
			name: "splits_receipt_id_receipts_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userOneId],
			foreignColumns: [users.id],
			name: "splits_user_one_id_users_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.userTwoId],
			foreignColumns: [users.id],
			name: "splits_user_two_id_users_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.paidByUserId],
			foreignColumns: [users.id],
			name: "splits_paid_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const uploads = pgTable("uploads", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().default('Untitled').notNull(),
	receiptId: text("receipt_id"),
	status: text().default('initialized').notNull(),
	blobName: text("blob_name").notNull(),
	blobUrl: text("blob_url").notNull(),
	thumbnailName: text("thumbnail_name"),
	thumbnailUrl: text("thumbnail_url"),
	originalFilename: text("original_filename").notNull(),
	contentType: text("content_type"),
	size: integer(),
	azureTags: jsonb("azure_tags"),
	analysisStatus: text("analysis_status").default('pending'),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	ocrText: text("ocr_text"),
	ocrJson: jsonb("ocr_json"),
	annotationsJson: jsonb("annotations_json"),
	householdId: text("household_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "uploads_user_id_users_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.receiptId],
			foreignColumns: [receipts.id],
			name: "uploads_receipt_id_receipts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.householdId],
			foreignColumns: [households.id],
			name: "uploads_household_id_households_id_fk"
		}).onDelete("restrict"),
	unique("uploads_blob_name_unique").on(table.blobName),
	unique("uploads_blob_url_unique").on(table.blobUrl),
]);

export const workflowRuns = pgTable("workflow_runs", {
	id: serial().primaryKey().notNull(),
	uploadId: text("upload_id"),
	uuid: uuid().defaultRandom().notNull(),
	triggerRunId: text("trigger_run_id"),
	status: text().default('queued').notNull(),
	ocrStatus: text("ocr_status").default('pending').notNull(),
	annotationsStatus: text("annotations_status").default('pending').notNull(),
	createSplitStatus: text("create_split_status").default('pending').notNull(),
	adjustSplitStatus: text("adjust_split_status").default('pending').notNull(),
	normalizeStatus: text("normalize_status").default('pending').notNull(),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.uploadId],
			foreignColumns: [uploads.id],
			name: "workflow_runs_upload_id_uploads_id_fk"
		}).onDelete("cascade"),
]);
export const vSplitMetrics = pgView("v_split_metrics", {	splitId: text("split_id"),
	receiptId: text("receipt_id"),
	householdId: text("household_id"),
	receiptDate: text("receipt_date"),
	paidByMatch: text("paid_by_match"),
	isSettled: boolean("is_settled"),
	splitCreatedAt: timestamp("split_created_at", { mode: 'string' }),
	llmConfidence: real("llm_confidence"),
	paidByOverriddenByHuman: boolean("paid_by_overridden_by_human"),
}).as(sql`SELECT s.id AS split_id, s.receipt_id, r.household_id, r.date AS receipt_date, s.paid_by_match, s.is_settled, s.created_at AS split_created_at, ( SELECT c.confidence FROM changes c JOIN split_history sh ON sh.change_id = c.id WHERE sh.split_id = s.id AND c.source ~~ 'task:%'::text ORDER BY c.created_at DESC LIMIT 1) AS llm_confidence, (EXISTS ( SELECT 1 FROM changes c JOIN split_history sh ON sh.change_id = c.id WHERE sh.split_id = s.id AND sh.field = 'paidByUserId'::text AND c.source ~~ 'user:%'::text)) AS paid_by_overridden_by_human FROM splits s LEFT JOIN receipts r ON r.id = s.receipt_id`);