<script setup>
// <UiStatusLabel> — the ONE status LABEL component. Give it a `type` (visual
// form) and a `status` (enum value); it looks up the shared UI config and
// renders the label. All per-status color/label config is buried HERE — call
// sites don't pass colors/labels.
//
// `type` picks the visual form:
//   • 'badge'  → soft UBadge (the loud form)
//   • 'subtle' → small solid dot + colored label
//   • 'bubble' → NO-TEXT exception: standalone tinted circle-icon
//
// bubble is the odd one out — it's the icon-only glance with no label at all —
// but it lives here because it's still "this status, rendered", just wordless.
//
// The `status` value is resolved against BOTH the run and step config maps (run
// first). The two enums overlap partially; a run-only value (partial/expired) or
// a step-only value (pending/skipped) each resolves from its own map, so a caller
// can pass EITHER kind of status. Shared values (completed/processing/failed)
// carry the same label + semantic color in both maps, so run-first is a no-op
// for them. (This dual lookup can collapse once the enums are cleaned up.)
//
// This component is DUMB about business rules — e.g. "completed runs render
// subtle instead of badge" is NOT here. The CALLER decides the `type` and passes
// it in. It renders the type it's told.
//
// DURATION is a separate concern — see <UiDuration>. Render it as an inline
// sibling beside this component.
import {
  WORKFLOW_STATUS_UI_CONFIG,
  WORKFLOW_STEP_STATUS_UI_CONFIG,
} from '#shared/enums/workflow-status-ui.config.js'

const props = defineProps({
  // Which visual form. See the map above.
  type: {
    type: String,
    required: true,
    validator: v => ['badge', 'subtle', 'bubble'].includes(v),
  },
  // A status enum value — WORKFLOW_STATUS (badge/subtle) or WORKFLOW_STEP_STATUS
  // (bubble). Which enum is inferred from `type`.
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

// bubble reads the step map directly — it needs the step-only ICON fields
// (bubbleIcon/bubbleIconClass/spin) the run map doesn't have. badge/subtle
// resolve run-first then fall back to step, so a caller can pass a run status
// (uploads table) OR a step status (timeline). The values shared by both enums
// (completed/processing/failed) mean the same thing + same semantic color in
// both, so run-first is a safe no-op for them.
const config = computed(() => {
  if (props.type === 'bubble') {
    return WORKFLOW_STEP_STATUS_UI_CONFIG[props.status] ?? null
  }
  return WORKFLOW_STATUS_UI_CONFIG[props.status]
    ?? WORKFLOW_STEP_STATUS_UI_CONFIG[props.status]
    ?? null
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

      <!-- subtle: small solid dot + colored label. Uses the config's per-status
           labelClass when present (step configs have one), else text-default
           (run configs). Dot prefers the solid `dotColor` (step) then `dot`. -->
      <span v-else-if="type === 'subtle'" class="inline-flex items-center gap-1.5 text-xs">
        <span class="size-2 rounded-full" :class="config.dotColor ?? config.dot" />
        <span class="font-medium" :class="config.labelClass ?? 'text-default'">{{ label }}</span>
      </span>

      <!-- bubble: NO-TEXT exception — standalone tinted circle-icon -->
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
    </template>
  </span>
</template>
