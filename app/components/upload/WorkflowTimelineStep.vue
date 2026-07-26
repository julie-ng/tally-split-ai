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
import { WORKFLOW_STEP_STATUS_UI_CONFIG } from '#shared/enums/workflow-status-ui.config.js'

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

const config = computed(() =>
  WORKFLOW_STEP_STATUS_UI_CONFIG[props.step.status]
  ?? WORKFLOW_STEP_STATUS_UI_CONFIG[WORKFLOW_STEP_STATUS.PENDING],
)

const isExpandable = computed(() =>
  !!props.step.summary
  || (Array.isArray(props.step.details) && props.step.details.length > 0),
)

// Static duration for a completed step (start → finish). Null when either
// per-step timestamp is missing (e.g. runs created before the timestamp columns
// existed) — durationBetween guards, no crash.
const duration = computed(() =>
  dateUtils.durationBetween(props.step.startedAt, props.step.completedAt),
)

// Elapsed for a still-running step, from its start to the parent's live `now`.
// Passing a live `now` as the end is SAFE here (unlike the run-level cells)
// because per-step *StartedAt are TZ-aware timestamptz columns.
const elapsed = computed(() =>
  dateUtils.durationBetween(props.step.startedAt, props.now),
)

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
        :name="config.timelineIcon"
        class="size-3"
        :class="config.spin ? 'animate-spin' : ''"
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
          <!-- Status label (subtle) + trailing time. Completed → static duration;
               Processing → live elapsed; else → placeholder. -->
          <UiStatusLabel
            type="subtle"
            :status="step.status"
            class="ml-auto shrink-0"
          />
          <UiDuration :value="isCompleted ? duration : isProcessing ? elapsed : null" />
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
