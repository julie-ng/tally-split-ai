export const RECEIPT_ANALYSIS_STATUS = {
  UNANALYZED: 'unanalyzed',
  ANALYZED: 'analyzed',
}

/*
 * Generate array variants for Drizzle enums and Zod `enum()` consumers
 */
export const RECEIPT_ANALYSIS_STATUSES = /** @type {['unanalyzed', 'analyzed']} */ (Object.values(RECEIPT_ANALYSIS_STATUS))
