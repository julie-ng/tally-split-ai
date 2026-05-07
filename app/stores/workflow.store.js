import { defineStore } from 'pinia'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'

/**
 * Store for managing workflow run data.
 * Normalized map keyed by uploadId, fetches from /api/workflows.
 */
export const useWorkflowStore = defineStore('workflow', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const runs = ref({}) // Map: { [uploadId]: WorkflowRun[] }
  const loading = ref(false)
  const debug = ref(false)

  // -------- GETTERS --------

  const getRunsById = computed(() => id => runs.value[id] ?? [])

  const latestRunById = computed(() => id => runs.value[id]?.[0] ?? null)

  const runCountById = computed(() => id => runs.value[id]?.length ?? 0)

  const hasErrorsById = computed(() => (id) => {
    const count = runs.value[id]?.length ?? 0
    if (count >= 2) return true

    const latest = runs.value[id]?.[0]
    if (!latest) return false

    return latest.status === WORKFLOW_STATUS.FAILED
      || latest.status === WORKFLOW_STATUS.PARTIAL
  })

  const DEFAULT_STEP_STATUSES = {
    ocrStatus: WORKFLOW_STEP_STATUS.PENDING,
    annotationsStatus: WORKFLOW_STEP_STATUS.PENDING,
    normalizeStatus: WORKFLOW_STEP_STATUS.PENDING,
    createSplitStatus: WORKFLOW_STEP_STATUS.PENDING,
    adjustSplitStatus: WORKFLOW_STEP_STATUS.PENDING,
  }

  const stepStatusesById = computed(() => (id) => {
    const latest = runs.value[id]?.[0]
    if (!latest) return { ...DEFAULT_STEP_STATUSES }

    return {
      ocrStatus: latest.ocrStatus ?? WORKFLOW_STEP_STATUS.PENDING,
      annotationsStatus: latest.annotationsStatus ?? WORKFLOW_STEP_STATUS.PENDING,
      normalizeStatus: latest.normalizeStatus ?? WORKFLOW_STEP_STATUS.PENDING,
      createSplitStatus: latest.createSplitStatus ?? WORKFLOW_STEP_STATUS.PENDING,
      adjustSplitStatus: latest.adjustSplitStatus ?? WORKFLOW_STEP_STATUS.PENDING,
    }
  })

  const isProcessingById = computed(() => (id) => {
    const latest = runs.value[id]?.[0]
    if (!latest) return false
    return latest.status === WORKFLOW_STATUS.QUEUED
      || latest.status === WORKFLOW_STATUS.PROCESSING
  })

  // -------- ACTIONS --------

  /**
   * Fetch all workflow runs for the current user
   */
  async function fetchAll () {
    loading.value = true
    try {
      const data = await requestFetch('/api/workflows')
      runs.value = data
      _log(`[WorkflowStore] ✅ fetched workflows for ${Object.keys(data).length} uploads`)
    }
    catch (err) {
      console.error('[WorkflowStore] ❌ failed to fetch workflows:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch workflow runs for a single upload
   *
   * @param {string} id
   */
  async function fetchByUploadId (id) {
    try {
      const data = await requestFetch(`/api/workflows/${id}`)
      runs.value[id] = data
      _log(`[WorkflowStore] ✅ fetched ${data.length} runs for ${id}`)
    }
    catch (err) {
      console.error(`[WorkflowStore] ❌ failed to fetch workflows for ${id}:`, err)
    }
  }

  /**
   * Update a workflow step status in-memory from an SSE event.
   *
   * @param {string} id
   * @param {string} step - e.g. 'ocr', 'annotations', 'split', 'workflow'
   * @param {string} status
   * @param {string} [error] - Error message for failed steps
   */
  function updateStepStatus (id, step, status, error) {
    // Create skeleton run if none exists yet (SSE arrived before fetch)
    if (!runs.value[id]?.length) {
      runs.value[id] = [{ ...DEFAULT_STEP_STATUSES, status: WORKFLOW_STATUS.PROCESSING }]
    }

    const latest = runs.value[id][0]

    if (step === WORKFLOW_STEP.ORCHESTRATOR) {
      latest.status = status
    }
    else {
      const stepKey = step + 'Status'
      latest[stepKey] = status
    }

    if (error) {
      if (!latest.errors) latest.errors = {}
      latest.errors[step] = error
    }

    _log(`[WorkflowStore] 🔄 ${id} ${step}=${status}${error ? ` error="${error}"` : ''}`)
  }

  /**
   * Trigger the analysis workflow for an upload
   *
   * @param {string} id
   */
  async function triggerWorkflow (id) {
    try {
      await $fetch(`/api/workflows/${id}`, { method: 'POST' })
      _log(`[WorkflowStore] ✅ triggered workflow for ${id}`)
      await fetchByUploadId(id)
    }
    catch (err) {
      console.error(`[WorkflowStore] ❌ failed to trigger workflow for ${id}:`, err)
      throw err
    }
  }

  /**
   * Remove workflow data for an upload
   * @param {string} id
   */
  function removeById (id) {
    delete runs.value[id]
  }

  /**
   * @private
   */
  function _log (...args) {
    if (debug.value) {
      console.log(...args)
    }
  }

  return {
    // State
    runs,
    loading,
    debug,

    // Getters
    getRunsById,
    latestRunById,
    runCountById,
    hasErrorsById,
    isProcessingById,
    stepStatusesById,

    // Actions
    fetchAll,
    fetchByUploadId,
    triggerWorkflow,
    updateStepStatus,
    removeById,
  }
})
