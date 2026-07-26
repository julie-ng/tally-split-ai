<script setup>
// Living reference for every status → presentation variation, rendered through
// the single <UiStatusLabel> component. Shows each `type` + `status` combination so
// we can SEE what's available and copy the exact call. Driven by the enums so it
// stays in sync as statuses are added.
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

useHead({
  title: 'Status Styles',
})

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
        <code class="font-mono">&lt;UiStatusLabel&gt;</code>. Pass a
        <code class="font-mono">type</code> (visual form) and a
        <code class="font-mono">status</code> (enum value); all color/icon/label
        config lives inside the component. Duration is separate —
        <code class="font-mono">&lt;UiDuration&gt;</code>.
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
          lives in the caller, not <code class="font-mono">UiStatusLabel</code>).
          Duration is NOT part of <code class="font-mono">UiStatusLabel</code> — it's a
          caller-computed inline sibling (see Example usage).
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
                  <UiStatusLabel type="badge" :status="status" />
                </td>
                <td class="px-4 py-3">
                  <UiStatusLabel type="subtle" :status="status" />
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
          One pipeline step (OCR, Normalize, …). One type:
          <code class="font-mono">bubble</code> (icon only, no text — the uploads
          table row). The preview timeline keeps its own bespoke markup and does
          NOT use <code class="font-mono">UiStatusLabel</code>.
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
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="status in stepStatuses" :key="status">
                <td class="px-4 py-3 font-mono text-xs text-dimmed">
                  {{ status }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-center">
                    <UiStatusLabel type="bubble" :status="status" />
                  </div>
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
&lt;UiStatusLabel type="badge" status="partial" /&gt;
&lt;UiStatusLabel type="subtle" status="completed" /&gt;

&lt;!-- step status --&gt;
&lt;UiStatusLabel type="bubble" status="processing" /&gt;

&lt;!-- optional label override --&gt;
&lt;UiStatusLabel type="badge" status="partial" label="Needs your review" /&gt;

&lt;!-- duration is separate — pair with &lt;UiDuration&gt; as inline siblings --&gt;
&lt;span class="inline-flex items-baseline gap-2"&gt;
  &lt;UiStatusLabel type="badge" :status="run.status" /&gt;
  &lt;UiDuration :value="run.duration" /&gt;
&lt;/span&gt;</code></pre>
      </section>
    </template>
  </UDashboardPanel>
</template>
