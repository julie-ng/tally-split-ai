import { relations } from "drizzle-orm/relations";
import { changes, receiptHistory, receipts, users, households, splitHistory, splits, uploads, workflowRuns } from "./schema";

export const receiptHistoryRelations = relations(receiptHistory, ({one}) => ({
	change: one(changes, {
		fields: [receiptHistory.changeId],
		references: [changes.id]
	}),
	receipt: one(receipts, {
		fields: [receiptHistory.receiptId],
		references: [receipts.id]
	}),
}));

export const changesRelations = relations(changes, ({many}) => ({
	receiptHistories: many(receiptHistory),
	splitHistories: many(splitHistory),
}));

export const receiptsRelations = relations(receipts, ({one, many}) => ({
	receiptHistories: many(receiptHistory),
	user: one(users, {
		fields: [receipts.userId],
		references: [users.id]
	}),
	household: one(households, {
		fields: [receipts.householdId],
		references: [households.id]
	}),
	splits: many(splits),
	uploads: many(uploads),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	receipts: many(receipts),
	household: one(households, {
		fields: [users.householdId],
		references: [households.id]
	}),
	splits_userOneId: many(splits, {
		relationName: "splits_userOneId_users_id"
	}),
	splits_userTwoId: many(splits, {
		relationName: "splits_userTwoId_users_id"
	}),
	splits_paidByUserId: many(splits, {
		relationName: "splits_paidByUserId_users_id"
	}),
	uploads: many(uploads),
}));

export const householdsRelations = relations(households, ({many}) => ({
	receipts: many(receipts),
	users: many(users),
	uploads: many(uploads),
}));

export const splitHistoryRelations = relations(splitHistory, ({one}) => ({
	change: one(changes, {
		fields: [splitHistory.changeId],
		references: [changes.id]
	}),
	split: one(splits, {
		fields: [splitHistory.splitId],
		references: [splits.id]
	}),
}));

export const splitsRelations = relations(splits, ({one, many}) => ({
	splitHistories: many(splitHistory),
	receipt: one(receipts, {
		fields: [splits.receiptId],
		references: [receipts.id]
	}),
	user_userOneId: one(users, {
		fields: [splits.userOneId],
		references: [users.id],
		relationName: "splits_userOneId_users_id"
	}),
	user_userTwoId: one(users, {
		fields: [splits.userTwoId],
		references: [users.id],
		relationName: "splits_userTwoId_users_id"
	}),
	user_paidByUserId: one(users, {
		fields: [splits.paidByUserId],
		references: [users.id],
		relationName: "splits_paidByUserId_users_id"
	}),
}));

export const uploadsRelations = relations(uploads, ({one, many}) => ({
	user: one(users, {
		fields: [uploads.userId],
		references: [users.id]
	}),
	receipt: one(receipts, {
		fields: [uploads.receiptId],
		references: [receipts.id]
	}),
	household: one(households, {
		fields: [uploads.householdId],
		references: [households.id]
	}),
	workflowRuns: many(workflowRuns),
}));

export const workflowRunsRelations = relations(workflowRuns, ({one}) => ({
	upload: one(uploads, {
		fields: [workflowRuns.uploadId],
		references: [uploads.id]
	}),
}));