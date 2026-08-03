<script setup>
// The leading icon tile in the uploads table's Upload column. Its own (header-
// less) column so the "Upload" header aligns with the text, not the tile.
//
// Self-contained + REACTIVE: reads the live workflow store getters by upload id
// (fed by the workflow_runs realtime subscription), so the tile flips live as
// the pipeline runs — in-flight → done/error — WITHOUT a manual refresh. Mirrors
// uploads/TableWorkflowBubbles.vue (the row-level step bubbles), which is live the
// same way.
//
// State precedence:
//   1. in-flight  → cloud-upload / primary    (queue row still uploading, OR the
//                    workflow is queued/processing)
//   2. expired    → clock-alert / warning     (no worker ran it — yellow, matches
//                    the status badge; retryable, not a true failure)
//   3. error      → file-exclamation / error  (run failed / partial)
//   4. has receipt→ receipt-euro / neutral    (CLICKS THROUGH to the expense)
//   5. otherwise  → receipt-text / neutral    (done, no receipt — e.g. standalone)
//
// State 4 is the only interactive one, and it resolves its destination on CLICK
// rather than rendering an href — the row carries a receipt id but the panel is
// keyed by expense id.
//
// NOTE: `props.receipt` is NOT live — it rides on the merged list row, which
// only refreshes on manual refetch / preview-open (the detail-liveness gap). The
// ICON STATE is live via the workflow store; state 4 simply appears once the
// row's receipt lands.
import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'
import { WORKFLOW_RUN_STATUS } from '#shared/enums/workflow-run-status.js'
import { WORKFLOW_RUN_STATUS_UI_CONFIG } from '#shared/enums/workflow-status-ui.config.js'
import { useExpensesStore } from '~/stores/expenses.store'
import { useWorkflowStore } from '~/stores/workflow.store'

const props = defineProps({
  // Upload id — keys the live workflow-store getters.
  id: {
    type: String,
    required: true,
  },
  // Merged-row status (DB UPLOAD_STATUS or queue string).
  status: {
    type: String,
    default: null,
  },
  // The linked receipt ({ id, ... }) when one exists; null otherwise.
  receipt: {
    type: Object,
    default: null,
  },
})

const workflowStore = useWorkflowStore()

// Queue rows (blob still uploading) have a non-DB status. 'initialized' means the
// DB row exists but analysis may not have started; treat only the true in-flight
// queue states as "uploading".
const isQueueUploading = computed(() =>
  props.status !== UPLOAD_STATUS.UPLOADED
  && props.status !== UPLOAD_STATUS.INITIALIZED
  && props.status !== UPLOAD_STATUS.FAILED,
)

const isInFlight = computed(() =>
  isQueueUploading.value || workflowStore.isProcessingById(props.id),
)

const hasError = computed(() => workflowStore.hasErrorsById(props.id))
const isExpired = computed(() => workflowStore.isExpiredById(props.id))

// Resolved tile: icon + UButton color, and whether it links to a receipt.
// State colors are pulled from the shared status UI config so "processing =
// primary / expired = warning / failed = error" stay defined in one place
// (the ICONS are tile-specific — its states aren't 1:1 with WORKFLOW_RUN_STATUS).
const tile = computed(() => {
  if (isInFlight.value) {
    return { icon: 'i-lucide-cloud-upload', color: WORKFLOW_RUN_STATUS_UI_CONFIG[WORKFLOW_RUN_STATUS.PROCESSING].color, to: null }
  }
  // Expired (TTL, no worker) reads as warning/retryable — yellow, matching the
  // status badge — distinct from a run that ran and failed.
  if (isExpired.value) {
    return { icon: 'i-lucide-clock-alert', color: WORKFLOW_RUN_STATUS_UI_CONFIG[WORKFLOW_RUN_STATUS.EXPIRED].color, to: null }
  }
  if (hasError.value) {
    return { icon: 'i-lucide-file-exclamation-point', color: WORKFLOW_RUN_STATUS_UI_CONFIG[WORKFLOW_RUN_STATUS.FAILED].color, to: null }
  }
  // Clickable, but WITHOUT a `to`: the destination is the expense panel, and the
  // row carries only a RECEIPT id. Resolving one to the other needs a fetch, so
  // it happens on click (see openExpense) rather than being rendered as an href
  // for every row in the table.
  if (props.receipt) {
    return { icon: 'i-lucide-receipt-euro', color: 'neutral', to: null, opensExpense: true }
  }
  return { icon: 'i-lucide-receipt-text', color: 'neutral', to: null }
})

// Receipt → expense on demand. `fetchExpenseByReceiptId` is cache-aware, so this
// costs one request the first time and nothing on repeat clicks.
//
// Navigates to the expense preview's RECEIPT tab: the user clicked a receipt
// icon, so that's the facet they asked for.
async function openExpense () {
  if (!tile.value.opensExpense) {
    return
  }

  const expense = await useExpensesStore()
    .fetchExpenseByReceiptId(props.receipt.id)
    .catch(() => null)

  if (!expense) {
    return
  }

  await navigateTo({
    path: '/expenses',
    query: { preview: expense.id, tab: 'receipt' },
  })
}
</script>

<template>
  <!-- Tooltip only on the interactive state. There's no href to reveal on hover
       (the destination is resolved on click), so the tooltip is the only cue
       that this tile does anything.
       @click.stop so the tile doesn't also trigger the row's select handler,
       which would open the upload preview behind the navigation. -->
  <UTooltip
    :text="tile.opensExpense ? 'Go to Expense' : undefined"
    :disabled="!tile.opensExpense"
    :delay-duration="0"
    arrow
  >
    <UButton
      :to="tile.to || undefined"
      :icon="tile.icon"
      :color="tile.color"
      variant="soft"
      class="size-9 shrink-0 rounded-lg justify-center"
      :class="tile.opensExpense ? 'text-dimmed hover:text-default cursor-pointer' : ''"
      @click.stop="openExpense"
    />
  </UTooltip>
</template>
