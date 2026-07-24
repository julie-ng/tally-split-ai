<script setup>
// ONE step box in the workflow timeline: the status dot, the connector line to
// the next step, the clickable header (label · status · duration · chevron),
// and — when expanded — the StepContent body.
//
// Pure leaf: owns per-step VISUAL concerns (STATUS_CONFIG lookup, dot, duration
// display) but no run-level state. The parent (UploadWorkflowTimeline) owns the
// live `now` tick and the expanded set; this component just receives them and
// emits @toggle.
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

const props = defineProps({
  // { key, label, description?, status (WORKFLOW_STEP_STATUS),
  //   startedAt?, completedAt?, summary?, details?: [{ label, value }] }
  step: {
    type: Object,
    required: true,
  },
  expanded: {
    type: Boolean,
    default: false,
  },
  // Hide the connector line on the last step.
  isLast: {
    type: Boolean,
    default: false,
  },
  // Live "now" epoch ms, ticked by the parent — used for a processing step's
  // elapsed counter. Parent owns the single interval; we just read the tick.
  now: {
    type: Number,
    default: 0,
  },
})

defineEmits(['toggle'])

// Per-status visual config, keyed off WORKFLOW_STEP_STATUS (never raw strings).
const STATUS_CONFIG = {
  [WORKFLOW_STEP_STATUS.COMPLETED]: {
    icon: 'i-lucide-check',
    dot: 'bg-inverted text-inverted border-inverted',
    label: 'Completed',
    labelClass: 'text-default',
    dotColor: 'bg-success',
  },
  [WORKFLOW_STEP_STATUS.PROCESSING]: {
    icon: 'i-lucide-loader-circle',
    dot: 'bg-primary/10 text-primary border-primary',
    iconClass: 'animate-spin',
    label: 'Processing',
    labelClass: 'text-primary',
  },
  [WORKFLOW_STEP_STATUS.PENDING]: {
    icon: 'i-lucide-circle',
    dot: 'bg-elevated text-dimmed border-default',
    label: 'Pending',
    labelClass: 'text-dimmed',
    dashed: true,
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.SKIPPED]: {
    icon: 'i-lucide-minus',
    dot: 'bg-elevated text-muted border-default',
    label: 'Skipped',
    labelClass: 'text-muted',
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.FAILED]: {
    icon: 'i-lucide-x',
    dot: 'bg-error/10 text-error border-error',
    label: 'Failed',
    labelClass: 'text-error',
  },
}

const config = computed(() =>
  STATUS_CONFIG[props.step.status] ?? STATUS_CONFIG[WORKFLOW_STEP_STATUS.PENDING],
)

const isExpandable = computed(() =>
  !!props.step.summary
  || (Array.isArray(props.step.details) && props.step.details.length > 0),
)

// Static duration for a completed step (start → finish). Null when either
// timestamp is missing.
//
// ⚠️ STEP 2 (after DB schema change + migration): per-step startedAt/completedAt
// do NOT exist on workflow_runs yet — only run-level created_at/completed_at.
// Until the migration adds per-step timestamp columns, real data omits these and
// no duration renders (no crash — the guards below return null). MOCK data does
// carry them so the visual can be verified now.
const duration = computed(() => {
  const { startedAt, completedAt } = props.step
  if (!startedAt || !completedAt) {
    return null
  }
  const seconds = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
  return dateUtils.formatDuration(seconds)
})

// Elapsed for a still-running step, from its start to the parent's live `now`.
// ⚠️ STEP 2: same missing-timestamp caveat as `duration` above.
const elapsed = computed(() => {
  const { startedAt } = props.step
  if (!startedAt) {
    return null
  }
  return dateUtils.formatDuration(Math.floor((props.now - new Date(startedAt)) / 1000))
})

const isCompleted = computed(() => props.step.status === WORKFLOW_STEP_STATUS.COMPLETED)
const isProcessing = computed(() => props.step.status === WORKFLOW_STEP_STATUS.PROCESSING)
</script>

<template>
  <li class="relative flex gap-3 pb-6 last:pb-0">
    <!-- Connector line (this dot → next). Hidden on last item. -->
    <span
      v-if="!isLast"
      class="absolute left-[9px] top-9 -bottom-0 w-px bg-neutral-300 dark:bg-neutral-600"
      aria-hidden="true"
    />

    <!-- Status dot (mt nudges the check to align with the step label, which
         sits below the box's top padding) -->
    <span
      class="relative z-10 mt-3 flex size-5 shrink-0 items-center justify-center rounded-full border"
      :class="config.dot"
    >
      <UIcon
        :name="config.icon"
        class="size-3"
        :class="config.iconClass"
      />
    </span>

    <!-- Box -->
    <div
      class="flex-1 min-w-0 rounded-lg border border-default bg-default"
      :class="[
        config.dashed ? 'border-dashed' : '',
        config.dim ? 'opacity-60' : '',
      ]"
    >
      <!-- Header (clickable when expandable) -->
      <button
        type="button"
        class="w-full px-3 py-3 text-left"
        :class="isExpandable ? 'cursor-pointer' : 'cursor-default'"
        @click="isExpandable && $emit('toggle', step.key)"
      >
        <div class="flex items-center gap-2 min-w-0">
          <p class="text-sm font-medium text-default max-w-[70%] truncate mb-0.5">
            {{ step.label }}
          </p>
          <span class="ml-auto flex shrink-0 items-center gap-1.5 text-xs">
            <!-- Leading status dot (e.g. green for completed) -->
            <span
              v-if="config.dotColor"
              class="size-2 rounded-full"
              :class="config.dotColor"
            />
            <span
              class="font-medium"
              :class="config.labelClass"
            >
              {{ config.label }}
            </span>
            <!-- Completed → static duration; Processing → live elapsed.
                 Both render only when timestamps exist (⚠️ step 2). -->
            <span
              v-if="isCompleted && duration"
              class="text-muted tabular-nums"
            >
              · {{ duration }}
            </span>
            <span
              v-else-if="isProcessing && elapsed"
              class="text-muted tabular-nums"
            >
              · {{ elapsed }}
            </span>
          </span>
          <UIcon
            v-if="isExpandable"
            name="i-lucide-chevron-down"
            class="size-4 shrink-0 text-highlighted transition-transform"
            :class="expanded ? 'rotate-180' : ''"
          />
        </div>
      </button>

      <!-- Expanded detail -->
      <UploadWorkflowTimelineStepContent
        v-if="isExpandable && expanded"
        :description="step.description"
        :summary="step.summary"
        :rows="step.details"
      >
        <!-- Pass-through slots so the parent can override summary/footer per
             step (e.g. the Create Expense step's link-to-expense footer). -->
        <template v-if="$slots.summary" #summary>
          <slot name="summary" />
        </template>
        <template v-if="$slots.footer" #footer>
          <slot name="footer" />
        </template>
      </UploadWorkflowTimelineStepContent>
    </div>
  </li>
</template>
