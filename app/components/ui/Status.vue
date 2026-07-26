<script setup>
// <UiStatus> — the ONE status presentation component. Give it a `type` (which
// visual form) and a `status` (an enum value); it looks up the shared UI config
// and renders. All the per-status color/icon/label config is buried HERE — call
// sites don't pass dot-color / label-class / icons anymore.
//
// The `type` also picks WHICH enum the status belongs to (the two enums have
// overlapping values but different domains):
//   • 'badge'  → run status, soft UBadge (the loud form)         [WORKFLOW_(RUN_)STATUS]
//   • 'subtle' → run status, dot + label                         [WORKFLOW_(RUN_)STATUS]
//   • 'bubble' → step status, standalone tinted circle-icon, no text  [WORKFLOW_STEP_STATUS]
//   • 'step'   → step status, filled/bordered dot + bare glyph + label [WORKFLOW_STEP_STATUS]
//
// This component is DUMB about business rules — e.g. "completed runs render
// subtle instead of badge" is NOT here. The CALLER decides the `type`
// (`status === completed ? 'subtle' : 'badge'`) and passes it in. UiStatus just
// renders the type it's told.
//
// DURATION is NOT here either — it's a separate, caller-computed concern (needs
// the run's before/after timestamps). Both UiStatus and a duration span are
// inline, so the caller renders its own `<span>· 40s</span>` beside <UiStatus>.
import {
  WORKFLOW_STATUS_UI_CONFIG,
  WORKFLOW_STEP_STATUS_UI_CONFIG,
} from '#shared/enums/workflow-status-ui.config.js'

const props = defineProps({
  // Which visual treatment. See the map above.
  type: {
    type: String,
    required: true,
    validator: v => ['badge', 'subtle', 'bubble', 'step'].includes(v),
  },
  // An enum value — a WORKFLOW_STATUS (badge/subtle) or WORKFLOW_STEP_STATUS
  // (bubble/step) string. Which enum is inferred from `type`.
  status: {
    type: String,
    required: true,
  },
  // Optional label override. Defaults to the config's label for the status.
  label: {
    type: String,
    default: null,
  },
})

// badge/subtle read the run-status config; bubble/step read the step config.
const isStepType = computed(() => props.type === 'bubble' || props.type === 'step')

const config = computed(() => {
  const map = isStepType.value ? WORKFLOW_STEP_STATUS_UI_CONFIG : WORKFLOW_STATUS_UI_CONFIG
  return map[props.status] ?? null
})

const label = computed(() => props.label ?? config.value?.label ?? props.status)
</script>

<template>
  <!-- Single wrapping root so fallthrough attrs (e.g. UTooltip's aria-describedby
       / data-state) inherit onto ONE element. Without it the v-if/v-else-if
       branches are a fragment root and Vue warns. Unknown status → empty root. -->
  <span class="inline-flex">
    <template v-if="config">
      <!-- badge: soft UBadge -->
      <UBadge v-if="type === 'badge'" :color="config.color" variant="soft">
        {{ label }}
      </UBadge>

      <!-- subtle: dot + label -->
      <span v-else-if="type === 'subtle'" class="inline-flex items-center gap-1.5 text-xs">
        <span class="size-2 rounded-full" :class="config.dot" />
        <span class="font-medium text-default">{{ label }}</span>
      </span>

      <!-- bubble: standalone tinted circle-icon, no text -->
      <span
        v-else-if="type === 'bubble'"
        class="size-5 text-center rounded-full"
        :class="config.bubbleIconClass"
      >
        <UIcon
          :name="config.bubbleIcon"
          class="size-4 align-middle"
          :class="config.spin ? 'animate-spin' : ''"
        />
      </span>

      <!-- step: filled/bordered dot with a bare glyph inside + colored label -->
      <span v-else-if="type === 'step'" class="inline-flex items-center gap-2">
        <span
          class="relative flex size-5 shrink-0 items-center justify-center rounded-full border"
          :class="config.dot"
        >
          <UIcon
            :name="config.timelineIcon"
            class="size-3"
            :class="config.spin ? 'animate-spin' : ''"
          />
        </span>
        <span class="text-xs font-medium" :class="config.labelClass">{{ label }}</span>
      </span>
    </template>
  </span>
</template>
