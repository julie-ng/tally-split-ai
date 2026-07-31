<script setup>
import { useHouseholdStore } from '~/stores/household.store'
import { useRealtimeStore } from '~/stores/realtime.store'
import { useExpensesStore } from '~/stores/expenses.store'
import { useReceiptsStore } from '~/stores/receipts.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { useHistoryStore } from '~/stores/history.store'

const householdStore = useHouseholdStore()
const realtimeStore = useRealtimeStore()
const expensesStore = useExpensesStore()
const receiptsStore = useReceiptsStore()
const uploadsStore = useUploadsStore()
const workflowStore = useWorkflowStore()
const historyStore = useHistoryStore()
const { loggedIn } = useUserSession()

// Fetch household once per navigation. Hydrates on the server so child
// components/pages can read members synchronously.
if (loggedIn.value) {
  await useAsyncData('household', () => householdStore.fetch())
}

// Realtime lives at the session level, not per-page: the workflow_runs
// subscription (household-scoped by RLS) stays open across navigation so events
// keep flowing wherever the user is. connect() is client-only (token fetch +
// websocket). Teardown is on logout only (see useLogout) — NOT on unmount.
//
// Content stores subscribe HERE, not in the pages that render them. Pinia stores
// are lazy: a store no page has touched is never instantiated, so it would miss
// the INSERT that creates its first row — precisely the case that matters, since
// the pipeline creates the expense while the user may be anywhere in the app.
// Registering in the layout forces instantiation at mount.
//
// The await matters: connect() establishes the client and calls setAuth(), and
// Realtime Authorization needs that token before a private channel can be joined.
// Subscribing first would fail the join.
onMounted(async () => {
  if (!loggedIn.value) return

  await realtimeStore.connect()
  expensesStore.subscribeToExpenses(householdStore.id)
  receiptsStore.subscribeToReceipts(householdStore.id)
  uploadsStore.subscribeToUploads(householdStore.id)
  workflowStore.subscribeToWorkflowRuns(householdStore.id)
  historyStore.subscribeToHistory(householdStore.id)
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <AppSidebar />

    <slot />
  </UDashboardGroup>
</template>
