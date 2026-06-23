// Composable instead of store — read-only data, no mutations or shared state
export function useReceiptHistory (receiptId, expenseId) {
  const { data: receiptData, pending: rPending } = useFetch(
    () => `/api/history/receipts/${receiptId}`,
    { key: `history-receipt-${receiptId}` },
  )

  const resolvedExpenseId = computed(() => toValue(expenseId))

  const { data: expenseData, pending: sPending } = useFetch(
    () => `/api/history/expenses/${resolvedExpenseId.value}`,
    { key: `history-expense-${receiptId}`, immediate: !!resolvedExpenseId.value, watch: [resolvedExpenseId] },
  )

  const pending = computed(() => rPending.value || sPending.value)

  const history = computed(() => {
    const entries = []
    for (const c of receiptData.value?.data || []) {
      entries.push({ ...c, entityType: 'receipt' })
    }
    for (const c of expenseData.value?.data || []) {
      entries.push({ ...c, entityType: 'expense' })
    }
    return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  return { history, pending }
}
