import { defineStore } from 'pinia'

/**
 * Dashboard metrics store. Single read-only resource — fetched on page
 * load + manual refresh. Scope is implicit (current session's household).
 */
export const useDashboardStore = defineStore('dashboard', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const metrics = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const confidenceTotal = computed(() =>
    metrics.value.confidenceDistribution.high
    + metrics.value.confidenceDistribution.medium
    + metrics.value.confidenceDistribution.low)

  // -------- ACTIONS --------

  async function fetchMetrics () {
    loading.value = true
    error.value = null
    try {
      metrics.value = await requestFetch('/api/dashboard/metrics')
      return metrics.value
    }
    catch (err) {
      error.value = err
      console.error('[DashboardStore] failed to fetch metrics:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    confidenceTotal,
  }
})
