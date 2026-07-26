<script setup>
// Run-level status cell for the uploads table. Self-contained + REACTIVE: reads
// the live workflow store by upload id (fed by the workflow_runs realtime
// subscription), so it flips live as the pipeline advances — same pattern as
// UploadTile / uploads/workflow-steps.vue.
//
// Two visual treatments:
//   • COMPLETED → subtle "dot + label" (matches UploadWorkflowTimelineStep's
//     completed header) — the common, quiet state.
//   • everything else (queued/processing/partial/failed/expired) → a soft UBadge
//     (matches UploadWorkflowTimeline's run-status badge) so it POPS.
//   • no run at all → "No workflow run" badge. Every upload SHOULD get a
//     workflow_runs row at DB-create time regardless of the Trigger.dev worker,
//     so this is an anomaly worth surfacing loudly (not a normal "manual" state).
import { WORKFLOW_STATUS } from '#shared/enums/workflow-status.js'
import { useWorkflowStore } from '~/stores/workflow.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const workflowStore = useWorkflowStore()

const latestRun = computed(() => workflowStore.latestRunById(props.id))
const status = computed(() => latestRun.value?.status ?? null)

// Run duration (start → finish), shown after the label for any FINISHED run —
// completed AND finished-but-failed states (expired/failed/partial all get a
// completedAt). Matches the preview timeline. durationBetween returns null until
// completedAt exists, and is TZ-safe here because we pass completedAt (not a live
// now) — see the util's note.
const duration = computed(() =>
  dateUtils.durationBetween(latestRun.value?.createdAt, latestRun.value?.completedAt),
)

// label + UBadge color per status (mirrors WorkflowTimeline's RUN_STATUS_CONFIG).
const STATUS_CONFIG = {
  [WORKFLOW_STATUS.QUEUED]: { label: 'Queued', color: 'neutral' },
  [WORKFLOW_STATUS.PROCESSING]: { label: 'Processing…', color: 'primary' },
  [WORKFLOW_STATUS.COMPLETED]: { label: 'Completed', color: 'success' },
  [WORKFLOW_STATUS.PARTIAL]: { label: 'Needs review', color: 'warning' },
  [WORKFLOW_STATUS.FAILED]: { label: 'Failed', color: 'error' },
  [WORKFLOW_STATUS.EXPIRED]: { label: 'Expired', color: 'warning' },
}

const config = computed(() => (status.value ? STATUS_CONFIG[status.value] ?? null : null))

const isCompleted = computed(() => status.value === WORKFLOW_STATUS.COMPLETED)
</script>

<template>
  <!-- Completed → subtle dot + label + duration (shared indicator) -->
  <UploadStatusIndicator
    v-if="isCompleted && config"
    :label="config.label"
    dot-color="bg-success"
    :duration="duration"
  />

  <!-- Any other status → badge (pops), with duration when the run finished.
       A finished-but-not-completed run (expired/failed/partial) still has a
       completedAt, so it shows a duration too — matches the preview timeline. -->
  <span
    v-else-if="config"
    class="inline-flex items-baseline gap-2"
  >
    <UBadge
      :color="config.color"
      variant="soft"
    >
      {{ config.label }}
    </UBadge>
    <span v-if="duration" class="text-xs text-dimmed tabular-nums">{{ duration }}</span>
  </span>

  <!-- No run at all → anomaly badge -->
  <UBadge
    v-else
    color="error"
    variant="soft"
  >
    No workflow run
  </UBadge>
</template>
