<script setup>
// Detail-view timeline for ONE upload's workflow run. Props-driven leaf: it
// renders the `steps` it's handed and owns no data of its own (the page/preview
// owner warms the store and maps it to this shape). Singular name = one upload;
// the plural row-cell summary lives in uploads/TableWorkflowBubbles.vue.
//
// Owns only RUN-LEVEL concerns: the run-start header, the single live `now`
// ticker (one interval, shared by every processing step), and which steps are
// expanded. Per-step visuals live in UploadWorkflowTimelineStep; the expanded
// body pattern lives in UploadWorkflowTimelineStepContent. Dumb leaf — the page/
// preview owner warms the stores and maps everything to the `steps` shape.
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'

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
  // Run-level status (WORKFLOW_RUN_STATUS) — shown as a colored badge, right-aligned.
  runStatus: {
    type: [String, null],
    default: null,
  },
  // Retry affordance. This component stays DUMB (no store access): the owner
  // (useUploadPreview via PreviewPanel) decides whether retry is offered and
  // handles the @retry emit. canRetry = the run errored/failed/expired;
  // isExpired distinguishes "no worker ran it" from a step that ran and failed.
  canRetry: {
    type: Boolean,
    default: false,
  },
  isExpired: {
    type: Boolean,
    default: false,
  },
  retrying: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['retry'])

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
// (start→finish). Blank while still running: createdAt/completedAt are plain
// `timestamp` (no TZ), so `completedAt − createdAt` cancels the parse offset
// (correct), but `now − createdAt` does NOT (bogus ~120m). durationBetween is
// null until runCompletedAt exists, so no live counter here — see the util note.
const runDuration = computed(() =>
  dateUtils.durationBetween(props.runStartedAt, props.runCompletedAt),
)
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
        <div
          v-if="runStatus"
          class="flex items-baseline gap-2 shrink-0"
        >
          <UiStatusLabel type="badge" :status="runStatus" />
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

      <!-- Retry: re-trigger the whole pipeline. Shown when the run errored/
           failed/expired (owner-gated via canRetry). EXPIRED ("no worker ran
           it") gets a distinct icon from a run that ran and failed. -->
      <UButton
        v-if="canRetry"
        class="mt-3 cursor-pointer"
        :icon="isExpired ? 'i-lucide-clock-alert' : 'i-lucide-rotate-ccw'"
        :label="retrying ? 'Retrying…' : 'Retry Workflow'"
        :loading="retrying"
        size="sm"
        color="neutral"
        variant="solid"
        @click="$emit('retry')"
      />
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
