<script setup>
// Living reference for every status → presentation variation, rendered through
// the single <UiStatus> component. Shows each `type` + `status` combination so
// we can SEE what's available and copy the exact call. Driven by the enums so it
// stays in sync as statuses are added.
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

useHead({
  title: 'Status Styles',
})

// A representative duration so the trailing time is visible in samples.
const SAMPLE_DURATION = '40s'

// Run statuses (badge / subtle types), in pipeline order.
const runStatuses = Object.values(WORKFLOW_STATUS)

// Step statuses (bubble / step types), in a readable order.
const stepStatuses = [
  WORKFLOW_STEP_STATUS.PENDING,
  WORKFLOW_STEP_STATUS.PROCESSING,
  WORKFLOW_STEP_STATUS.COMPLETED,
  WORKFLOW_STEP_STATUS.SKIPPED,
  WORKFLOW_STEP_STATUS.FAILED,
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
        Every status presentation, rendered through one component:
        <code class="font-mono">&lt;UiStatus&gt;</code>. Pass a
        <code class="font-mono">type</code> (visual form) and a
        <code class="font-mono">status</code> (enum value); all color/icon/label
        config lives inside the component. The <code class="font-mono">type</code>
        also picks which enum the status belongs to.
      </p>

      <!-- ── Run-status types (badge / subtle) ───────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Run status
          <span class="font-mono font-normal text-muted">WORKFLOW_STATUS</span>
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          The orchestrator-level status of a whole run. Two types:
          <code class="font-mono">badge</code> (loud, soft UBadge) and
          <code class="font-mono">subtle</code> (quiet dot + label). Callers pick
          which — e.g. <code class="font-mono">UploadStatusCell</code> uses
          <code class="font-mono">subtle</code> for <strong>completed</strong> and
          <code class="font-mono">badge</code> for everything else (that exception
          lives in the caller, not <code class="font-mono">UiStatus</code>). Both
          types take an optional <code class="font-mono">duration</code>.
        </p>

        <div class="rounded-lg border border-default overflow-hidden max-w-3xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/40 text-xs font-semibold text-muted text-left">
                <th class="px-4 py-2 font-semibold">
                  Status
                </th>
                <th class="px-4 py-2 font-semibold">
                  type="badge"
                </th>
                <th class="px-4 py-2 font-semibold">
                  type="subtle"
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="status in runStatuses" :key="status">
                <td class="px-4 py-3 font-mono text-xs text-dimmed">
                  {{ status }}
                </td>
                <td class="px-4 py-3">
                  <UiStatus type="badge" :status="status" :duration="SAMPLE_DURATION" />
                </td>
                <td class="px-4 py-3">
                  <UiStatus type="subtle" :status="status" :duration="SAMPLE_DURATION" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── Step-status types (bubble / step) ───────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-1">
          Step status
          <span class="font-mono font-normal text-muted">WORKFLOW_STEP_STATUS</span>
        </h2>
        <p class="text-xs text-muted mb-4 max-w-2xl">
          One pipeline step (OCR, Normalize, …). Two types:
          <code class="font-mono">bubble</code> (icon only, no text — the uploads
          table row) and <code class="font-mono">step</code> (dot + glyph + label —
          the preview timeline).
        </p>

        <div class="rounded-lg border border-default overflow-hidden max-w-3xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/40 text-xs font-semibold text-muted text-left">
                <th class="px-4 py-2 font-semibold">
                  Status
                </th>
                <th class="px-4 py-2 font-semibold text-center">
                  type="bubble"
                </th>
                <th class="px-4 py-2 font-semibold">
                  type="step"
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="status in stepStatuses" :key="status">
                <td class="px-4 py-3 font-mono text-xs text-dimmed">
                  {{ status }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-center">
                    <UiStatus type="bubble" :status="status" />
                  </div>
                </td>
                <td class="px-4 py-3">
                  <UiStatus type="step" :status="status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── Example usage ───────────────────────────────────────────────── -->
      <section class="mb-12">
        <h2 class="text-sm font-semibold text-highlighted mb-2">
          Example usage
        </h2>
        <pre class="rounded-lg border border-default bg-elevated/40 p-4 overflow-x-auto max-w-3xl"><code class="font-mono text-xs text-toned">&lt;!-- run status --&gt;
&lt;UiStatus type="badge" status="partial" /&gt;
&lt;UiStatus type="subtle" status="completed" :duration="run.duration" /&gt;

&lt;!-- step status --&gt;
&lt;UiStatus type="bubble" status="processing" /&gt;
&lt;UiStatus type="step" status="failed" /&gt;

&lt;!-- optional label override --&gt;
&lt;UiStatus type="badge" status="partial" label="Needs your review" /&gt;</code></pre>
      </section>
    </template>
  </UDashboardPanel>
</template>
