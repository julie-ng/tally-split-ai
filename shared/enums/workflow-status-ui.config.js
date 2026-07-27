// Single source of truth for status → presentation (label + color) across the
// uploads/workflow UI. Keyed off the WORKFLOW_RUN_STATUS / WORKFLOW_STEP_STATUS
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

import { WORKFLOW_RUN_STATUS } from './workflow-run-status.js'
import { WORKFLOW_STEP_STATUS } from './workflow-step-status.js'

// Run-level (orchestrator) status → badge/dot presentation.
//   color    — semantic name for `:color` (UBadge)
//   label    — human label
//   dot      — full literal bg-* class for the "dot + label" indicator
export const WORKFLOW_RUN_STATUS_UI_CONFIG = {
  [WORKFLOW_RUN_STATUS.QUEUED]: { label: 'Queued', color: 'neutral', dot: 'bg-neutral-400' },
  [WORKFLOW_RUN_STATUS.PROCESSING]: { label: 'Processing…', color: 'primary', dot: 'bg-primary' },
  [WORKFLOW_RUN_STATUS.COMPLETED]: { label: 'Completed', color: 'success', dot: 'bg-success' },
  // 'Partial' is a TECHNICAL outcome — the pipeline ran to the end but a
  // non-fatal step failed (HTTP 206 in spirit). It is NOT the human-attention
  // signal: this label used to read "Needs review", which conflated the two.
  // "Needs review" is reserved for a DERIVED, expense-level signal (LLM
  // confidence + paidByMatch + partial), which doesn't exist yet.
  [WORKFLOW_RUN_STATUS.PARTIAL]: { label: 'Partial', color: 'warning', dot: 'bg-warning' },
  [WORKFLOW_RUN_STATUS.FAILED]: { label: 'Failed', color: 'error', dot: 'bg-error' },
  // Expired = "no worker ran it" — retryable, reads yellow/warning (NOT error).
  [WORKFLOW_RUN_STATUS.EXPIRED]: { label: 'Expired', color: 'warning', dot: 'bg-warning' },
}

// Step-level (per-step) status → presentation. Two visual contexts share this
// map but render the icon DIFFERENTLY, so each has its own icon field:
//   • the bubble row-cell (uploads/TableWorkflowBubbles.vue) draws a standalone
//     circle-icon tinted by `bubbleIconClass`.
//   • the timeline step (WorkflowTimelineStep.vue) draws a filled/bordered dot
//     (`dot`) with a BARE glyph (`timelineIcon`) inside it.
// Fields:
//   color          — semantic name for `:color` props
//   label          — human label
//   bubbleIcon     — lucide circle-icon for the bubble row-cell
//   bubbleIconClass— full literal text-* tint for the bubble (semantic token)
//   spin           — bubble/timeline icon spins (processing only)
//   timelineIcon   — bare lucide glyph shown inside the timeline dot
//   dot            — full literal classes for the timeline dot (bg/border)
//   dotColor       — full literal bg-* for the shared inline indicator's dot
//   labelClass     — timeline step header text color
//   dashed / dim   — timeline step box modifiers
export const WORKFLOW_STEP_STATUS_UI_CONFIG = {
  [WORKFLOW_STEP_STATUS.COMPLETED]: {
    color: 'success',
    label: 'Completed',
    bubbleIcon: 'i-lucide-circle-check',
    bubbleIconClass: 'text-success',
    timelineIcon: 'i-lucide-check',
    dot: 'bg-inverted text-inverted border-inverted',
    dotColor: 'bg-success',
    labelClass: 'text-default',
  },
  [WORKFLOW_STEP_STATUS.PROCESSING]: {
    color: 'primary',
    label: 'Processing',
    bubbleIcon: 'i-lucide-loader-circle',
    bubbleIconClass: 'text-primary',
    spin: true,
    timelineIcon: 'i-lucide-loader-circle',
    dot: 'bg-primary/10 text-primary border-primary',
    labelClass: 'text-primary',
  },
  [WORKFLOW_STEP_STATUS.PENDING]: {
    color: 'neutral',
    label: 'Pending',
    bubbleIcon: 'i-lucide-circle',
    bubbleIconClass: 'text-dimmed',
    timelineIcon: 'i-lucide-circle',
    dot: 'bg-elevated text-dimmed border-default',
    labelClass: 'text-dimmed',
    dashed: true,
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.SKIPPED]: {
    color: 'neutral',
    label: 'Skipped',
    bubbleIcon: 'i-lucide-circle-minus',
    bubbleIconClass: 'text-dimmed',
    timelineIcon: 'i-lucide-minus',
    dot: 'bg-elevated text-muted border-default',
    labelClass: 'text-muted',
    dim: true,
  },
  [WORKFLOW_STEP_STATUS.FAILED]: {
    color: 'warning',
    label: 'Failed',
    bubbleIcon: 'i-lucide-circle-alert',
    bubbleIconClass: 'text-warning',
    timelineIcon: 'i-lucide-x',
    dot: 'bg-error/10 text-error border-error',
    labelClass: 'text-error',
  },
}
