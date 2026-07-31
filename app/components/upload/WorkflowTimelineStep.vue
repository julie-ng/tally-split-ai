<script setup>
// ONE step box in the workflow timeline: the status dot, the connector line to
// the next step, the clickable header (label · status · duration · chevron),
// and — when expanded — the StepContent body.
//
// Pure leaf: owns per-step VISUAL concerns (timeline icon lookup, duration
// display) but no run-level state. The parent (UploadWorkflowTimeline) owns the
// live `now` tick and the expanded set; this component just receives them and
// emits @toggle.
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'

// Timeline-VISUAL config for the gutter dot — deliberately SEPARATE from the
// status-STATE config (UiStatusLabel / workflow-status-ui.config). The gutter
// dot is a big element that only *references* the step status; on purpose it does
// NOT carry the full status palette (a large icon in five saturated colors is too
// noisy), and it has its own bare glyphs. Local to this one component — hardcoded
// here rather than shared. Every class is a COMPLETE literal (Tailwind purge).
const TIMELINE_STEP_CONFIG = {
  [WORKFLOW_STEP_STATUS.COMPLETED]: {
    icon: 'i-lucide-check',
    iconClass: 'bg-inverted text-inverted border-inverted',
  },
  [WORKFLOW_STEP_STATUS.PROCESSING]: {
    icon: 'i-lucide-loader-circle',
    iconClass: 'bg-primary/10 text-primary border-primary',
    spin: true,
  },
  [WORKFLOW_STEP_STATUS.PENDING]: {
    icon: 'i-lucide-circle',
    iconClass: 'bg-elevated text-dimmed border-default',
    dashed: true,
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.SKIPPED]: {
    icon: 'i-lucide-minus',
    iconClass: 'bg-elevated text-muted border-default',
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.FAILED]: {
    icon: 'i-lucide-x',
    iconClass: 'bg-error/10 text-error border-error',
  },
}

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

const timelineStep = computed(() =>
  TIMELINE_STEP_CONFIG[props.step.status]
  ?? TIMELINE_STEP_CONFIG[WORKFLOW_STEP_STATUS.PENDING],
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

    <!-- Timeline step icon (mt nudges the glyph to align with the step label,
         which sits below the box's top padding) -->
    <span
      class="relative z-10 mt-3 flex size-5 shrink-0 items-center justify-center rounded-full border"
      :class="timelineStep.iconClass"
    >
      <UIcon
        :name="timelineStep.icon"
        class="size-3"
        :class="timelineStep.spin ? 'animate-spin' : ''"
      />
    </span>

    <!-- Box. Fully CONTROLLED: the timeline owns the expanded set, so bind
         :open + @update:open rather than the card's uncontrolled default. -->
    <UiCollapsibleCard
      class="flex-1 min-w-0"
      :class="[
        timelineStep.dashed ? 'border-dashed' : '',
        timelineStep.dim ? 'opacity-60' : '',
      ]"
      :collapsible="isExpandable"
      padding="sm"
      :open="expanded"
      @update:open="$emit('toggle', step.key)"
    >
      <template #header>
        <p class="text-sm font-medium text-default max-w-[70%] truncate mb-0.5">
          {{ step.label }}
        </p>
      </template>

      <!-- Status label (subtle) + trailing time. Completed → static duration;
           Processing → live elapsed; else → placeholder. -->
      <template #actions>
        <UiStatusLabel
          type="subtle"
          :status="step.status"
        />
        <UiDuration :value="isCompleted ? duration : isProcessing ? elapsed : null" />
      </template>

      <!-- Expanded detail -->
      <UploadWorkflowTimelineStepContent
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
    </UiCollapsibleCard>
  </li>
</template>
