export const RECEIPT_ANALYSIS_STATUS = {
  UNANALYZED: 'unanalyzed',
  ANALYZED: 'analyzed',
}

// Array form for Drizzle enum columns and Zod z.enum()
export const RECEIPT_ANALYSIS_STATUSES = /** @type {['unanalyzed', 'analyzed']} */ (Object.values(RECEIPT_ANALYSIS_STATUS))
