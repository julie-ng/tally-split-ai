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
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

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
  // Run finish (workflow_runs.completed_at) — null while still running. Used with
  // runStartedAt for the header duration.
  runCompletedAt: {
    type: String,
    default: null,
  },
  // The workflow_runs uuid — shown dimmed/mono next to the header title.
  runUuid: {
    type: [String, null],
    default: null,
  },
  // Run-level status (WORKFLOW_STATUS) — shown as a colored badge, right-aligned.
  runStatus: {
    type: [String, null],
    default: null,
  },
})

// Per-run-status label + UBadge color (a Nuxt UI color name, not a text class).
const RUN_STATUS_CONFIG = {
  [WORKFLOW_STATUS.QUEUED]: { label: 'Queued', color: 'neutral' },
  [WORKFLOW_STATUS.PROCESSING]: { label: 'Processing…', color: 'primary' },
  [WORKFLOW_STATUS.COMPLETED]: { label: 'Completed', color: 'success' },
  [WORKFLOW_STATUS.PARTIAL]: { label: 'Needs review', color: 'warning' },
  [WORKFLOW_STATUS.FAILED]: { label: 'Failed', color: 'error' },
  [WORKFLOW_STATUS.EXPIRED]: { label: 'Expired', color: 'neutral' },
}

const runStatusConfig = computed(() =>
  props.runStatus ? RUN_STATUS_CONFIG[props.runStatus] ?? null : null,
)

// Tally of step outcomes for the "Pipeline Steps" summary line. `completed` is
// "X of N ran"; skipped/failed are surfaced only when non-zero (skipped is
// normal — e.g. consent-gated adjust — so it reads neutrally).
const stepSummary = computed(() => {
  const total = props.steps.length
  let completed = 0
  let skipped = 0
  let failed = 0
  for (const step of props.steps) {
    if (step.status === WORKFLOW_STEP_STATUS.COMPLETED) completed++
    else if (step.status === WORKFLOW_STEP_STATUS.SKIPPED) skipped++
    else if (step.status === WORKFLOW_STEP_STATUS.FAILED) failed++
  }

  // Build the qualifier tail: "· 1 skipped · 1 failed" (only non-zero parts).
  const parts = []
  if (skipped > 0) parts.push(`${skipped} skipped`)
  if (failed > 0) parts.push(`${failed} failed`)

  return { total, completed, skipped, failed, tail: parts.join(' · ') }
})

// Live "now", ticked every second, so a processing step's elapsed counter
// updates (1s, 2s, 3s…). One interval for the whole timeline; passed down to
// each step. Only runs while some step is processing.
const now = ref(Date.now())

// Overall run duration next to the status badge — ONLY for a finished run
// (start→finish). Shown blank while still running: createdAt/completedAt are
// plain `timestamp` (no TZ) columns, so `completedAt − createdAt` cancels the
// parse offset (correct), but `now − createdAt` does NOT (createdAt misparses as
// local → a bogus ~120m). So no live counter here; blank until complete.
const runDuration = computed(() => {
  if (!props.runStartedAt || !props.runCompletedAt) {
    return null
  }
  const start = new Date(props.runStartedAt).getTime()
  const end = new Date(props.runCompletedAt).getTime()
  return dateUtils.formatDuration(Math.max(0, Math.floor((end - start) / 1000)))
})
let ticker = null
// Tick only while a step is processing (drives per-step elapsed counters, which
// anchor on the TZ-correct per-step *StartedAt timestamptz columns).
const isLive = computed(() =>
  props.steps.some(s => s.status === WORKFLOW_STEP_STATUS.PROCESSING),
)

onMounted(() => {
  if (isLive.value) {
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
  <div class="px-4 py-6">
    <div class="mb-4">
      <div class="flex items-baseline justify-between gap-2 min-w-0">
        <p class="text-sm font-semibold text-default min-w-0 truncate">
          Workflow Run
          <!-- <span v-if="runUuid" class="pl-2 font-normal text-dimmed">
            {{ timestampUtils.toRelative(runStartedAt) }}
          </span> -->
        </p>
        <!-- <span
          v-if="runStatusConfig"
          class="shrink-0 text-xs font-medium"
          :class="runStatusConfig.class"
        >
          {{ runStatusConfig.label }}
          12s
        </span> -->
        <div
          v-if="runStatusConfig"
          class="flex items-baseline gap-2 shrink-0"
        >
          <UBadge
            :color="runStatusConfig.color"
            variant="soft"
          >
            {{ runStatusConfig.label }}
          </UBadge>
          <span v-if="runDuration" class="text-xs text-dimmed tabular-nums">
            {{ runDuration }}
          </span>
        </div>
      </div>

      <!-- Started At -->
      <ui-label-content v-if="runStartedAt" label="Started" :content="timestampUtils.toShortDatetime(runStartedAt) " />

      <!-- Run ID -->
      <ui-label-content label="Workflow Run ID">
        <span class="font-mono text-xs">{{ runUuid }}</span>
      </ui-label-content>
    </div>

    <div class="flex items-baseline justify-between gap-2 min-w-0 my-6">
      <p class="text-sm font-semibold text-default shrink-0">
        Pipeline Steps
      </p>
      <span class="text-xs text-dimmed tabular-nums truncate">
        {{ stepSummary.completed }} / {{ stepSummary.total }} completed<template v-if="stepSummary.tail"> · {{ stepSummary.tail }}</template>
      </span>
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
