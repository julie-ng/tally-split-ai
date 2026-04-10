export function useReceiptHistory (receiptId, splitId) {
  const { data: receiptData, pending: rPending } = useFetch(
    () => `/api/history/receipts/${receiptId}`,
    { key: `history-receipt-${receiptId}` },
  )

  const { data: splitData, pending: sPending } = useFetch(
    () => `/api/history/splits/${splitId}`,
    { key: `history-split-${splitId}`, immediate: !!splitId },
  )

  const pending = computed(() => rPending.value || sPending.value)

  const history = computed(() => {
    const entries = []
    for (const c of receiptData.value?.data || []) {
      entries.push({ ...c, entityType: 'receipt' })
    }
    for (const c of splitData.value?.data || []) {
      entries.push({ ...c, entityType: 'split' })
    }
    return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  return { history, pending }
}
