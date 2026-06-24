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
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #left>
          <UBreadcrumb :items="[{ label: 'Dashboard', class: 'font-semibold text-default' }]" />
        </template>
        <template #right>
          <!-- <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-refresh-cw"
            :loading="dashboardStore.loading"
            :disabled="dashboardStore.loading"
            class="cursor-pointer"
            @click="refresh"
          >
            Refresh
          </UButton> -->
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!metrics" class="text-dimmed">
        Loading metrics…
      </div>

      <template v-else>
        <!-- LLM accuracy -->
        <div>
          <h2 class="font-semibold text-lg mb-1">
            AI Accuracy - Handwritten Assignments
          </h2>
          <p class="text-sm text-dimmed">
            How often the adjust-expense task matched handwritten initials to a household member.
            Out of {{ metrics.llmAccuracy.llmRan }} expenses the LLM has run on
            ({{ metrics.llmAccuracy.unresolved }} pending,
            {{ metrics.llmAccuracy.total }} total).
          </p>
        </div>
        <div class="grid grid-cols-4 gap-4 mb-8">
          <dashboard-card
            :metric="pct(metrics.llmAccuracy.matchedRate)"
            :note="`${metrics.llmAccuracy.matched} of ${metrics.llmAccuracy.llmRan} handwritten annotations matched.`"
            subtitle="Matched"
            icon="i-lucide-circle-check"
            full-height
          />
          <dashboard-card
            icon="i-lucide-user-check"
            :metric="pct(metrics.humanOverrides.paidByOverrideRate)"
            :note="`${metrics.humanOverrides.paidByOverridden} of ${metrics.llmAccuracy.total} updated by humans post analysis.`"
            subtitle="Human Updated"
            full-height
          />
          <dashboard-card
            :metric="metrics.llmAccuracy.mismatched"
            subtitle="Mismatched"
            note="Analyzed, but not matching household member."
            icon="i-lucide-triangle-alert"
            full-height
          />
          <dashboard-card
            :metric="metrics.llmAccuracy.missing"
            subtitle="Missing"
            note="No handwritten initials found."
            icon="i-lucide-search-x"
            full-height
          />
        </div>

        <div>
          <h2 class="font-semibold text-lg mb-1">
            AI Confidence
          </h2>
          <p class="text-sm text-dimmed mb-4">
            Per-expense overall confidence reported by the LLM.
            Buckets: high ≥ 0.8, medium 0.5–0.8, low &lt; 0.5.
          </p>
          <dashboard-confidence-graph class="mb-8" />
        </div>

        <!-- Activity -->
        <div>
          <h2 class="font-semibold text-lg mb-3">
            Activity
          </h2>
          <div class="grid grid-cols-4 gap-4 mb-8">
            <dashboard-card
              :metric="metrics.activity.expensesLast30Days"
              subtitle="Expenses in last 30 days"
              icon="i-lucide-coins"
            />
          </div>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
