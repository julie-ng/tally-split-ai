<script setup>
// Living reference for every status → presentation variation in the app, so we
// can SEE (and reuse) what exists without hunting through components. Renders
// the real shared config + components — NOT hardcoded copies — so this page
// drifts if the source does.
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import {
  WORKFLOW_STATUS_UI_CONFIG,
  WORKFLOW_STEP_STATUS_UI_CONFIG,
} from '#shared/enums/workflow-status-ui.config.js'

useHead({
  title: 'Status Styles',
})

// A representative duration so the "· 40s" trailing time is visible in samples.
const SAMPLE_DURATION = '40s'

// Run-level statuses, in pipeline order. `treatment` = which of the two visual
// forms a real run-level cell uses for that status:
//   • 'indicator' → the subtle dot + label (UploadStatusIndicator) — only
//     COMPLETED renders this way in UploadStatusCell.
//   • 'badge'     → a soft UBadge — every non-completed status.
const runStatuses = Object.values(WORKFLOW_STATUS).map(key => ({
  key,
  ...WORKFLOW_STATUS_UI_CONFIG[key],
  treatment: key === WORKFLOW_STATUS.COMPLETED ? 'indicator' : 'badge',
}))

// Step-level statuses, in a readable order.
const stepOrder = [
  WORKFLOW_STEP_STATUS.PENDING,
  WORKFLOW_STEP_STATUS.PROCESSING,
  WORKFLOW_STEP_STATUS.COMPLETED,
  WORKFLOW_STEP_STATUS.SKIPPED,
  WORKFLOW_STEP_STATUS.FAILED,
]
const stepStatuses = stepOrder.map(key => ({
  key,
  ...WORKFLOW_STEP_STATUS_UI_CONFIG[key],
}))

// Shared-primitive samples (UploadStatusIndicator prop combos). Each object IS
// the props passed to the sample below — the table renders them verbatim so the
// "props" column is the real API, not a description of the result.
const indicatorSamples = [
  { label: 'Completed', dotColor: 'bg-success', labelClass: 'text-default', duration: SAMPLE_DURATION },
  { label: 'Processing', dotColor: 'bg-primary', labelClass: 'text-primary', duration: null },
  { label: 'Pending', dotColor: null, labelClass: 'text-dimmed', duration: null },
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Status Styles">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'UI', class: 'font-semibold text-default' },
              { label: 'Statuses', to: $route.path },
            ]"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <h1 class="text-3xl font-bold">
        Status Styles
      </h1>
      <p class="text-sm text-muted mb-8 max-w-2xl">
        Every status → presentation variation, rendered from the shared config
        (<code class="font-mono">shared/enums/workflow-status-ui.config.js</code>)
        and the real components. One source of truth per enum; this page just
        shows what's available and where each treatment is used.
      </p>

      <!-- ── Run-level (WORKFLOW_STATUS) ─────────────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Run status
          <span class="font-mono font-normal text-muted">WORKFLOW_STATUS</span>
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          The orchestrator-level status of a whole workflow run. Rendered by
          <code class="font-mono">UploadStatusCell</code> (uploads table) and the
          <code class="font-mono">UploadWorkflowTimeline</code> header badge.
          <strong>Completed</strong> gets the subtle dot+label; every other status
          gets a soft badge so it pops. Finished runs show a duration.
        </p>

        <div class="rounded-lg border border-default overflow-hidden max-w-3xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/40 text-xs font-semibold text-muted text-left">
                <th class="px-4 py-2 font-semibold">
                  Sample
                </th>
                <th class="px-4 py-2 font-semibold">
                  Enum
                </th>
                <th class="px-4 py-2 font-semibold">
                  Color
                </th>
                <th class="px-4 py-2 font-semibold">
                  Treatment
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="s in runStatuses" :key="s.key">
                <td class="px-4 py-3">
                  <UploadStatusIndicator
                    v-if="s.treatment === 'indicator'"
                    :label="s.label"
                    :dot-color="s.dot"
                    :duration="SAMPLE_DURATION"
                  />
                  <span v-else class="inline-flex items-baseline gap-2">
                    <UBadge :color="s.color" variant="soft">
                      {{ s.label }}
                    </UBadge>
                    <span class="text-xs text-dimmed tabular-nums">{{ SAMPLE_DURATION }}</span>
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-dimmed">
                  {{ s.key }}
                </td>
                <td class="px-4 py-3 font-mono text-xs text-toned">
                  {{ s.color }}
                </td>
                <td class="px-4 py-3 font-mono text-xs text-muted">
                  {{ s.treatment === 'indicator' ? '<UploadStatusIndicator />' : '<UBadge variant="soft" />' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── Step-level (WORKFLOW_STEP_STATUS) ───────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Step status
          <span class="font-mono font-normal text-muted">WORKFLOW_STEP_STATUS</span>
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          One pipeline step (OCR, Normalize, …). TWO visual forms share the config
          but draw the icon differently — the <strong>Bubble</strong> (uploads
          table row) is a standalone tinted circle-icon; the
          <strong>Timeline</strong> (preview panel) is a bare glyph in a filled dot
          plus a colored label.
        </p>

        <div class="rounded-lg border border-default overflow-hidden max-w-3xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/40 text-xs font-semibold text-muted text-left">
                <th class="px-4 py-2 font-semibold">
                  Status
                </th>
                <th class="px-4 py-2 font-semibold">
                  Enum
                </th>
                <th class="px-4 py-2 font-semibold text-center">
                  Bubble
                </th>
                <th class="px-4 py-2 font-semibold text-center">
                  Timeline
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="s in stepStatuses" :key="s.key">
                <td class="px-4 py-3 text-sm font-medium text-default">
                  {{ s.label }}
                </td>
                <td class="px-4 py-3 font-mono text-xs text-dimmed">
                  {{ s.key }} · {{ s.color }}
                </td>

                <!-- Bubble treatment (uploads/TableWorkflowBubbles.vue). -->
                <td class="px-4 py-3">
                  <div class="flex justify-center">
                    <span class="size-5 text-center rounded-full" :class="s.bubbleIconClass">
                      <UIcon
                        :name="s.bubbleIcon"
                        class="size-4 align-middle"
                        :class="s.spin ? 'animate-spin' : ''"
                      />
                    </span>
                  </div>
                </td>

                <!-- Timeline treatment (upload/WorkflowTimelineStep.vue). -->
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-2">
                    <span
                      class="relative flex size-5 shrink-0 items-center justify-center rounded-full border"
                      :class="s.dot"
                    >
                      <UIcon
                        :name="s.timelineIcon"
                        class="size-3"
                        :class="s.spin ? 'animate-spin' : ''"
                      />
                    </span>
                    <span class="text-xs font-medium" :class="s.labelClass">{{ s.label }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── Shared primitive ────────────────────────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Shared primitive
          <span class="font-mono font-normal text-muted">UploadStatusIndicator</span>
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          The inline <code class="font-mono">[dot] label [· duration]</code> render.
          Used by <code class="font-mono">UploadStatusCell</code> (completed) and
          <code class="font-mono">UploadWorkflowTimelineStep</code>. Caller supplies
          label / dot color / label color / duration.
        </p>

        <div class="rounded-lg border border-default overflow-hidden max-w-3xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/40 text-xs font-semibold text-muted text-left">
                <th class="px-4 py-2 font-semibold">
                  Sample
                </th>
                <th class="px-4 py-2 font-semibold font-mono">
                  label
                </th>
                <th class="px-4 py-2 font-semibold font-mono">
                  dot-color
                </th>
                <th class="px-4 py-2 font-semibold font-mono">
                  label-class
                </th>
                <th class="px-4 py-2 font-semibold font-mono">
                  duration
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="sample in indicatorSamples" :key="sample.label">
                <td class="px-4 py-3">
                  <UploadStatusIndicator
                    :label="sample.label"
                    :dot-color="sample.dotColor"
                    :label-class="sample.labelClass"
                    :duration="sample.duration"
                  />
                </td>
                <td class="px-4 py-3 font-mono text-xs text-toned">
                  {{ sample.label }}
                </td>
                <td class="px-4 py-3 font-mono text-xs">
                  <span v-if="sample.dotColor" class="text-toned">{{ sample.dotColor }}</span>
                  <span v-else class="text-dimmed">—</span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-toned">
                  {{ sample.labelClass }}
                </td>
                <td class="px-4 py-3 font-mono text-xs">
                  <span v-if="sample.duration" class="text-toned">{{ sample.duration }}</span>
                  <span v-else class="text-dimmed">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Example usage (matches the first sample row above) -->
        <p class="text-xs font-semibold text-muted mt-6 mb-2">
          Example usage
        </p>
        <pre class="rounded-lg border border-default bg-elevated/40 p-4 overflow-x-auto max-w-3xl"><code class="font-mono text-xs text-toned">&lt;UploadStatusIndicator
  label="Completed"
  dot-color="bg-success"
  label-class="text-default"
  :duration="'40s'"
/&gt;</code></pre>
      </section>
    </template>
  </UDashboardPanel>
</template>
