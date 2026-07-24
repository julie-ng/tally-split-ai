<script setup>
// Detail-view timeline for ONE upload's workflow run. Props-driven leaf: it
// renders the `steps` it's handed and owns no data of its own (the page/preview
// owner warms the store and maps it to this shape). Singular name = one upload;
// the plural row-cell summary lives in uploads/workflow-steps.vue.
//
// Owns only RUN-LEVEL concerns: the run-start header, the single live `now`
// ticker (one interval, shared by every processing step), and which steps are
// expanded. Per-step visuals live in UploadWorkflowTimelineStep; the expanded
// body pattern lives in UploadWorkflowTimelineStepContent.
//
// ⚠️ STEP 2 (after DB schema change + migration): the `steps` passed in are
// currently MOCK. Two things rendered here do NOT yet exist in real data:
//   • per-step startedAt/completedAt — NO per-step timestamp columns on
//     workflow_runs yet (only run-level created_at/completed_at). Until the
//     migration adds them, durations just don't render (guarded, no crash).
//   • details / summary — these come from receipt/expense rows, NOT
//     workflow_runs. Step 2 warms those stores and composes them in.
// This component needs NO change when real data arrives — only the page's
// step-mapping (and the per-step footer slots it injects) do. Keep it dumb.
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

const props = defineProps({
  // Array of step objects the page maps from the workflow store. Shape:
  // { key, label, description?, status (WORKFLOW_STEP_STATUS),
  //   startedAt?, completedAt?, summary?, details?: [{ label, value }] }
  steps: {
    type: Array,
    default: () => [],
  },
  // Run start (workflow_runs.created_at) — shown once at the top.
  runStartedAt: {
    type: String,
    default: null,
  },
})

// Live "now", ticked every second, so a processing step's elapsed counter
// updates (1s, 2s, 3s…). One interval for the whole timeline; passed down to
// each step. Only runs while some step is processing.
const now = ref(Date.now())
let ticker = null
const hasProcessing = computed(() =>
  props.steps.some(s => s.status === WORKFLOW_STEP_STATUS.PROCESSING),
)

onMounted(() => {
  if (hasProcessing.value) {
    ticker = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
})
onBeforeUnmount(() => {
  if (ticker) {
    clearInterval(ticker)
  }
})

// Which step keys are expanded. Seeded from any steps that arrive expandable so
// their detail is visible on load; toggled by the child's @toggle.
const expanded = ref(new Set())

function isExpandable (step) {
  return !!step.summary || (Array.isArray(step.details) && step.details.length > 0)
}

watch(() => props.steps, (steps) => {
  const seeded = new Set()
  for (const step of steps) {
    if (isExpandable(step)) {
      seeded.add(step.key)
    }
  }
  expanded.value = seeded
}, { immediate: true })

function toggle (key) {
  const next = new Set(expanded.value)
  if (next.has(key)) {
    next.delete(key)
  }
  else {
    next.add(key)
  }
  expanded.value = next
}
</script>

<template>
  <div class="p-4">
    <div class="mb-4">
      <p class="text-sm font-semibold text-default">
        Workflow
      </p>
      <p v-if="runStartedAt" class="text-xs text-dimmed">
        Receipt processing pipeline started {{ timestampUtils.toShortDatetime(runStartedAt) }}
      </p>
    </div>

    <ol class="relative">
      <UploadWorkflowTimelineStep
        v-for="(step, i) in steps"
        :key="step.key"
        :step="step"
        :expanded="expanded.has(step.key)"
        :is-last="i === steps.length - 1"
        :now="now"
        @toggle="toggle"
      >
        <!-- Per-step slot pass-through: the page injects a step's footer/summary
             by targeting #summary-<key> / #footer-<key>. e.g. the Create Expense
             step's link-to-expense button (⚠️ wired in step 2). -->
        <template v-if="$slots[`summary-${step.key}`]" #summary>
          <slot :name="`summary-${step.key}`" :step="step" />
        </template>
        <template v-if="$slots[`footer-${step.key}`]" #footer>
          <slot :name="`footer-${step.key}`" :step="step" />
        </template>
      </UploadWorkflowTimelineStep>
    </ol>
  </div>
</template>
