<script setup>
// The leading icon tile in the uploads table's Upload column. Its own (header-
// less) column so the "Upload" header aligns with the text, not the tile.
//
// Self-contained + REACTIVE: reads the live workflow store getters by upload id
// (fed by the workflow_runs realtime subscription), so the tile flips live as
// the pipeline runs — in-flight → done/error — WITHOUT a manual refresh. Mirrors
// uploads/workflow-steps.vue (the 6-circle progress cell), which is live the
// same way.
//
// State precedence:
//   1. in-flight  → cloud-upload / primary   (queue row still uploading, OR the
//                    workflow is queued/processing)
//   2. error      → file-exclamation / error (run failed / partial / expired)
//   3. has receipt→ receipt-euro / neutral   (links to the receipt)
//   4. otherwise  → receipt-text / neutral   (done, no receipt — e.g. standalone)
//
// NOTE: the receipt LINK target (receipt.id) is NOT live — it rides on the
// merged list row, which only refreshes on manual refetch / preview-open (the
// detail-liveness gap). The ICON STATE is live via the workflow store; the link
// simply activates once the row's receipt lands.
import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'
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

// Resolved tile: icon + UButton color, and whether it links to a receipt.
const tile = computed(() => {
  if (isInFlight.value) {
    return { icon: 'i-lucide-cloud-upload', color: 'primary', to: null }
  }
  if (hasError.value) {
    return { icon: 'i-lucide-file-exclamation-point', color: 'error', to: null }
  }
  if (props.receipt) {
    return { icon: 'i-lucide-receipt-euro', color: 'neutral', to: `/receipts/${props.receipt.id}` }
  }
  return { icon: 'i-lucide-receipt-text', color: 'neutral', to: null }
})
</script>

<template>
  <UButton
    :to="tile.to || undefined"
    :icon="tile.icon"
    :color="tile.color"
    variant="soft"
    class="size-9 shrink-0 rounded-lg justify-center"
    :class="tile.to ? 'text-dimmed hover:text-default' : ''"
    @click.stop
  />
</template>
