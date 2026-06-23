import { sql } from 'drizzle-orm'

/**
 * Dashboard metrics for the current household.
 *
 * Pulls aggregates from `v_expense_metrics` (see the expense_metrics view migration).
 * All queries are scoped to event.context.householdId — analytics never
 * cross household boundaries.
 *
 * Confidence buckets follow the LLM prompt language in
 * server/utils/azure-gpt4o/adjust-split.js:
 *   high   ≥ 0.8
 *   medium 0.5–0.8
 *   low    < 0.5
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  // Single round-trip: aggregate everything in one query
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE paid_by_match = 'matched')      AS llm_matched,
      COUNT(*) FILTER (WHERE paid_by_match = 'mismatched')   AS llm_mismatched,
      COUNT(*) FILTER (WHERE paid_by_match = 'missing')      AS llm_missing,
      COUNT(*) FILTER (WHERE paid_by_match = 'unresolved')   AS llm_unresolved,
      COUNT(*)                                                AS total_expenses,

      COUNT(*) FILTER (WHERE paid_by_overridden_by_human)    AS paid_by_overridden,

      COUNT(*) FILTER (WHERE llm_confidence >= 0.8)                            AS confidence_high,
      COUNT(*) FILTER (WHERE llm_confidence >= 0.5 AND llm_confidence < 0.8)   AS confidence_medium,
      COUNT(*) FILTER (WHERE llm_confidence < 0.5)                             AS confidence_low,
      AVG(llm_confidence)                                                      AS confidence_avg,

      COUNT(*) FILTER (WHERE expense_created_at >= NOW() - INTERVAL '30 days')  AS expenses_last_30_days
    FROM v_expense_metrics
    WHERE household_id = ${householdId}
  `)

  const row = result[0] ?? {}

  // pg returns BIGINT counts as strings; coerce to number
  const n = v => v == null ? 0 : Number(v)

  const totalExpenses = n(row.total_expenses)
  const llmRan = totalExpenses - n(row.llm_unresolved)

  return {
    llmAccuracy: {
      total: totalExpenses,
      llmRan,
      matched: n(row.llm_matched),
      mismatched: n(row.llm_mismatched),
      missing: n(row.llm_missing),
      unresolved: n(row.llm_unresolved),
      matchedRate: llmRan > 0 ? n(row.llm_matched) / llmRan : 0,
    },
    humanOverrides: {
      paidByOverridden: n(row.paid_by_overridden),
      paidByOverrideRate: totalExpenses > 0 ? n(row.paid_by_overridden) / totalExpenses : 0,
    },
    confidenceDistribution: {
      high: n(row.confidence_high),
      medium: n(row.confidence_medium),
      low: n(row.confidence_low),
      avg: row.confidence_avg == null ? null : Number(row.confidence_avg),
    },
    activity: {
      expensesLast30Days: n(row.expenses_last_30_days),
    },
  }
})
