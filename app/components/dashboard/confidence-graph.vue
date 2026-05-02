<script setup>
import { useDashboardStore } from '~/stores/dashboard.store'

const dashboardStore = useDashboardStore()
await useAsyncData('dashboard-metrics', () => dashboardStore.fetchMetrics())

const buckets = [
  { key: 'high', label: 'high', range: '≥ 0.8', color: 'bg-success' },
  { key: 'medium', label: 'medium', range: '0.5–0.8', color: 'bg-warning' },
  { key: 'low', label: 'low', range: '< 0.5', color: 'bg-error' },
]

function count (key) {
  return dashboardStore.metrics.confidenceDistribution[key]
}

function percent (val) {
  const total = dashboardStore.confidenceTotal
  if (!total) return 0
  return Math.round((val / total) * 100)
}

function width (val) {
  const total = dashboardStore.confidenceTotal
  if (!total) return { width: '0%' }
  return { width: `${(val / total) * 100}%` }
}

function fmtConfidence (n) {
  if (n == null) return '—'
  return n.toFixed(2)
}
</script>

<template>
  <div v-if="dashboardStore.metrics" class="grid grid-cols-4 gap-4">
    <dashboard-card
      :metric="fmtConfidence(dashboardStore.metrics.confidenceDistribution.avg)"
      subtitle="Average"
      icon="i-lucide-target"
      full-height
    />
    <UCard class="shadow-md/5 col-span-3 h-full">
      <div class="flex flex-col gap-3 h-full">
        <div class="flex gap-px h-3 w-full overflow-hidden rounded bg-elevated">
          <div
            v-for="bucket in buckets"
            :key="bucket.key"
            :class="bucket.color"
            :style="width(count(bucket.key))"
          />
        </div>
        <div class="flex gap-px">
          <div
            v-for="bucket in buckets"
            v-show="count(bucket.key) > 0"
            :key="bucket.key"
            :style="width(count(bucket.key))"
          >
            <div class="text-xl">
              {{ percent(count(bucket.key)) }}%
            </div>
            <div class="text-xs text-muted">
              assigned with {{ bucket.label }} confidence<br>
              ({{ bucket.range }})
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
