import { task, logger } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '../server/db/connection.js'
import { WORKFLOW_STEP_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { splitInsertSchema } from '../shared/utils/zod-schemas/split.schema.js'
import { notifyStatus } from './utils/notify-status.js'

export const createSplit = task({
  id: 'create-split',
  maxDuration: 10,
  run: async (payload) => {
    const { receiptId, workflowRunId, runUuid, callbackToken } = payload
    const db = useDB()

    // Update workflow step status
    await db
      .update(schema.workflowRuns)
      .set({ splitStatus: WORKFLOW_STEP_STATUS.PROCESSING })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    try {
      // 1. Fetch receipt to get total
      const receipts = await db
        .select()
        .from(schema.receipts)
        .where(eq(schema.receipts.id, receiptId))

      if (receipts.length === 0) {
        throw new Error(`Receipt with id '${receiptId}' not found`)
      }

      const receipt = receipts[0]

      // 2. Skip if no total available
      if (receipt.total === null || receipt.total === undefined) {
        await db
          .update(schema.workflowRuns)
          .set({ splitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
          .where(eq(schema.workflowRuns.id, workflowRunId))

        logger.log(`Skipped split creation for receipt ${receiptId} — no total`)
        return { splitId: null, skipped: true }
      }

      // 3. Calculate equal split (placeholder — will evolve with annotations)
      const halfAmount = Math.floor(receipt.total / 2 * 100) / 100

      // 4. Validate and insert split
      const insertData = splitInsertSchema.parse({
        receiptId,
        userId: receipt.userId,
        splitAmount: receipt.total,
        userAShare: halfAmount,
        userBShare: halfAmount,
        isSettled: false,
      })

      const [split] = await db
        .insert(schema.splits)
        .values(insertData)
        .returning()

      // 5. Link split to receipt
      await db
        .update(schema.receipts)
        .set({ splitId: split.id })
        .where(eq(schema.receipts.id, receiptId))

      // 6. Update workflow step status
      await db
        .update(schema.workflowRuns)
        .set({ splitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        .where(eq(schema.workflowRuns.id, workflowRunId))

      await notifyStatus(runUuid, WORKFLOW_STEP.SPLIT, 'completed', callbackToken)

      logger.log(`Split created for receipt ${receiptId}`, { splitId: split.id, amount: receipt.total })

      return { splitId: split.id, splitAmount: receipt.total }
    }
    catch (err) {
      await db
        .update(schema.workflowRuns)
        .set({ splitStatus: WORKFLOW_STEP_STATUS.FAILED })
        .where(eq(schema.workflowRuns.id, workflowRunId))

      throw err
    }
  },
})
