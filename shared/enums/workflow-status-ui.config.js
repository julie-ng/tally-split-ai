// Single source of truth for status → presentation (label + color) across the
// uploads/workflow UI. Keyed off the WORKFLOW_STATUS / WORKFLOW_STEP_STATUS
// enums so there's one map per enum, not a copy per component.
//
// ── The Tailwind rule this file obeys ──────────────────────────────────────
// `color` is a semantic Nuxt UI color NAME ('success', 'warning', …) passed to
// a `:color` prop — Nuxt UI owns the literal classes, so these are purge-safe.
//
// Every *class string* here (dot, textClass) is a COMPLETE literal — never
// interpolated like `text-${x}-500`. Tailwind only keeps classes it finds as
// literal text at build time; a runtime-built class name gets purged and renders
// unstyled. So the maps store full strings and callers just look them up.

import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from './workflow-status.js'

// Run-level (orchestrator) status → badge/dot presentation.
//   color    — semantic name for `:color` (UBadge)
//   label    — human label
//   dot      — full literal bg-* class for the "dot + label" indicator
export const WORKFLOW_STATUS_UI_CONFIG = {
  [WORKFLOW_STATUS.QUEUED]: { label: 'Queued', color: 'neutral', dot: 'bg-neutral-400' },
  [WORKFLOW_STATUS.PROCESSING]: { label: 'Processing…', color: 'primary', dot: 'bg-primary' },
  [WORKFLOW_STATUS.COMPLETED]: { label: 'Completed', color: 'success', dot: 'bg-success' },
  [WORKFLOW_STATUS.PARTIAL]: { label: 'Needs review', color: 'warning', dot: 'bg-warning' },
  [WORKFLOW_STATUS.FAILED]: { label: 'Failed', color: 'error', dot: 'bg-error' },
  // Expired = "no worker ran it" — retryable, reads yellow/warning (NOT error).
  [WORKFLOW_STATUS.EXPIRED]: { label: 'Expired', color: 'warning', dot: 'bg-warning' },
}

// ── 6-circle palette A/B toggle ────────────────────────────────────────────
// The 6-circle glance (uploads/workflow-steps.vue) historically used RAW palette
// hues (text-green-500 …) while every other status site uses SEMANTIC tokens
// (text-success …). We're aligning it to semantic. To compare the two side by
// side, flip this one flag and reload — the step config's `iconClass` switches
// between the two literal sets below. (Both are full literals, so both survive
// purge regardless of which is active.)
export const USE_RAW_STEP_PALETTE = false

// Step-level (per-step) status → presentation. Two visual contexts share this
// map but render the icon DIFFERENTLY, so each has its own icon field:
//   • the 6-circle glance (uploads/workflow-steps.vue) draws a standalone
//     circle-icon tinted by `glanceIconClass`.
//   • the timeline step (WorkflowTimelineStep.vue) draws a filled/bordered dot
//     (`dot`) with a BARE glyph (`timelineIcon`) inside it.
// Fields:
//   color          — semantic name for `:color` props
//   label          — human label
//   glanceIcon     — lucide circle-icon for the 6-circle glance
//   glanceIconClass— full literal text-* tint for the glance (semantic vs raw,
//                    chosen by USE_RAW_STEP_PALETTE)
//   spin           — glance/timeline icon spins (processing only)
//   timelineIcon   — bare lucide glyph shown inside the timeline dot
//   dot            — full literal classes for the timeline dot (bg/border)
//   dotColor       — full literal bg-* for the shared inline indicator's dot
//   labelClass     — timeline step header text color
//   dashed / dim   — timeline step box modifiers
const glanceIconClass = (semantic, raw) => (USE_RAW_STEP_PALETTE ? raw : semantic)

export const WORKFLOW_STEP_STATUS_UI_CONFIG = {
  [WORKFLOW_STEP_STATUS.COMPLETED]: {
    color: 'success',
    label: 'Completed',
    glanceIcon: 'i-lucide-circle-check',
    glanceIconClass: glanceIconClass('text-success', 'text-green-500'),
    timelineIcon: 'i-lucide-check',
    dot: 'bg-inverted text-inverted border-inverted',
    dotColor: 'bg-success',
    labelClass: 'text-default',
  },
  [WORKFLOW_STEP_STATUS.PROCESSING]: {
    color: 'primary',
    label: 'Processing',
    glanceIcon: 'i-lucide-loader-circle',
    glanceIconClass: glanceIconClass('text-primary', 'text-blue-500'),
    spin: true,
    timelineIcon: 'i-lucide-loader-circle',
    dot: 'bg-primary/10 text-primary border-primary',
    labelClass: 'text-primary',
  },
  [WORKFLOW_STEP_STATUS.PENDING]: {
    color: 'neutral',
    label: 'Pending',
    glanceIcon: 'i-lucide-circle',
    glanceIconClass: glanceIconClass('text-dimmed', 'text-neutral-300'),
    timelineIcon: 'i-lucide-circle',
    dot: 'bg-elevated text-dimmed border-default',
    labelClass: 'text-dimmed',
    dashed: true,
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.SKIPPED]: {
    color: 'neutral',
    label: 'Skipped',
    glanceIcon: 'i-lucide-circle-minus',
    glanceIconClass: glanceIconClass('text-dimmed', 'text-neutral-400'),
    timelineIcon: 'i-lucide-minus',
    dot: 'bg-elevated text-muted border-default',
    labelClass: 'text-muted',
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.FAILED]: {
    color: 'warning',
    label: 'Failed',
    glanceIcon: 'i-lucide-circle-alert',
    glanceIconClass: glanceIconClass('text-warning', 'text-amber-500'),
    timelineIcon: 'i-lucide-x',
    dot: 'bg-error/10 text-error border-error',
    labelClass: 'text-error',
  },
}
