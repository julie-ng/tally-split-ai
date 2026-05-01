<script setup>
import { useDashboardStore } from '~/stores/dashboard.store'

const dashboardStore = useDashboardStore()

useHead({
  title: 'Dashboard',
})

await useAsyncData('dashboard-metrics', () => dashboardStore.fetchMetrics())

const metrics = computed(() => dashboardStore.metrics)

function pct (n) {
  return `${Math.round(n * 100)}%`
}

function fmtConfidence (n) {
  if (n == null) return '—'
  return n.toFixed(2)
}

async function refresh () {
  try {
    await dashboardStore.fetchMetrics()
  }
  catch {
    // error already logged in store
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #left>
          <UBreadcrumb :items="[{ label: 'Dashboard' }]" />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-refresh-cw"
            :loading="dashboardStore.loading"
            :disabled="dashboardStore.loading"
            class="cursor-pointer"
            @click="refresh"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!metrics" class="text-dimmed">
        Loading metrics…
      </div>

      <template v-else>
        <!-- LLM accuracy -->
        <h2 class="font-semibold text-lg mb-3">
          LLM accuracy (paid-by matching)
        </h2>
        <p class="text-sm text-dimmed mb-3">
          How often the adjust-split task matched handwritten initials to a household member.
          Out of {{ metrics.llmAccuracy.llmRan }} splits the LLM has run on
          ({{ metrics.llmAccuracy.unresolved }} pending,
          {{ metrics.llmAccuracy.total }} total).
        </p>
        <div class="grid grid-cols-4 gap-4 mb-8">
          <dashboard-card
            :title="pct(metrics.llmAccuracy.matchedRate)"
            :note="`${metrics.llmAccuracy.matched} of ${metrics.llmAccuracy.llmRan}`"
            subtitle="Matched"
          />
          <dashboard-card
            :title="metrics.llmAccuracy.mismatched"
            subtitle="Mismatched"
            note="Initials found, no household member"
          />
          <dashboard-card
            :title="metrics.llmAccuracy.missing"
            subtitle="Missing"
            note="No initials found"
          />
          <dashboard-card
            :title="metrics.llmAccuracy.unresolved"
            subtitle="Unresolved"
            note="LLM hasn't run yet"
          />
        </div>

        <!-- Human override behavior -->
        <h2 class="font-semibold text-lg mb-3">
          Human overrides
        </h2>
        <p class="text-sm text-dimmed mb-3">
          Splits where a human edited paidByUserId. Note: a "matched" LLM run
          can still be overridden by a human — paidByMatch tracks LLM behavior,
          not correctness.
        </p>
        <div class="grid grid-cols-2 gap-4 mb-8 max-w-2xl">
          <dashboard-card
            :title="metrics.humanOverrides.paidByOverridden"
            :note="`${pct(metrics.humanOverrides.paidByOverrideRate)} of ${metrics.llmAccuracy.total}`"
            subtitle="paidBy edits by humans"
          />
        </div>

        <!-- Confidence distribution -->
        <h2 class="font-semibold text-lg mb-3">
          LLM confidence distribution
        </h2>
        <p class="text-sm text-dimmed mb-3">
          Per-split overall confidence reported by the LLM.
          Buckets: high ≥ 0.8, medium 0.5–0.8, low &lt; 0.5.
        </p>
        <div class="grid grid-cols-4 gap-4 mb-8">
          <dashboard-card
            :title="metrics.confidenceDistribution.high"
            subtitle="High"
            note="≥ 0.8"
          />
          <dashboard-card
            :title="metrics.confidenceDistribution.medium"
            subtitle="Medium"
            note="0.5–0.8"
          />
          <dashboard-card
            :title="metrics.confidenceDistribution.low"
            subtitle="Low"
            note="< 0.5"
          />
          <dashboard-card
            :title="fmtConfidence(metrics.confidenceDistribution.avg)"
            subtitle="Average"
          />
        </div>

        <!-- Activity -->
        <h2 class="font-semibold text-lg mb-3">
          Activity
        </h2>
        <div class="grid grid-cols-4 gap-4 mb-8">
          <dashboard-card
            :title="metrics.activity.splitsLast30Days"
            subtitle="Splits in last 30 days"
          />
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
