<script setup>
// Run-level status cell for the uploads table. Self-contained + REACTIVE: reads
// the live workflow store by upload id (fed by the workflow_runs realtime
// subscription), so it flips live as the pipeline advances — same pattern as
// UploadTile / uploads/TableWorkflowBubbles.vue.
//
// Renders via <UiStatusLabel>, picking the `type` per status:
//   • COMPLETED → 'subtle' (quiet dot + label) — the common state.
//   • everything else (queued/processing/partial/failed/expired) → 'badge' (soft
//     UBadge) so it POPS. Both get a trailing duration sibling when finished.
//   • no run at all → "No workflow run" badge. Every upload SHOULD get a
//     workflow_runs row at DB-create time regardless of the Trigger.dev worker,
//     so this is an anomaly worth surfacing loudly (not a normal "manual" state).
import { WORKFLOW_RUN_STATUS } from '#shared/enums/workflow-run-status.js'
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
// now) — see the util's note. Rendered as a sibling to <UiStatusLabel> — duration is
// the caller's concern, not part of the status atom.
const duration = computed(() =>
  dateUtils.durationBetween(latestRun.value?.createdAt, latestRun.value?.completedAt),
)

const isCompleted = computed(() => status.value === WORKFLOW_RUN_STATUS.COMPLETED)

// The completed→subtle, else→badge exception lives HERE (the caller), not in
// UiStatusLabel — it renders whatever `type` it's handed.
const statusType = computed(() => (isCompleted.value ? 'subtle' : 'badge'))
</script>

<template>
  <!-- Known run status: UiStatusLabel (type chosen above) + duration sibling. -->
  <span v-if="status" class="inline-flex items-baseline gap-2">
    <UiStatusLabel :type="statusType" :status="status" />
    <span v-if="duration" class="text-xs text-dimmed tabular-nums">{{ duration }}</span>
  </span>

  <!-- No run at all → anomaly badge. Not an enum status, so hand-rolled: every
       upload SHOULD get a workflow_runs row at DB-create time, so this is worth
       surfacing loudly (not a normal state). -->
  <UBadge
    v-else
    color="error"
    variant="soft"
  >
    No workflow run
  </UBadge>
</template>
