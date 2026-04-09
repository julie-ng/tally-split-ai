import { defineStore } from 'pinia'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '~~/shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '~~/shared/enums/workflow-step.js'

/**
 * Store for managing workflow run data.
 * Normalized map keyed by uploadHashId, fetches from /api/workflows.
 */
export const useWorkflowStore = defineStore('workflow', () => {
  // -------- STATE --------

  const runs = ref({}) // Map: { [uploadHashId]: WorkflowRun[] }
  const loading = ref(false)
  const debug = ref(false)

  // -------- GETTERS --------

  const getRunsByHashId = computed(() => hashId => runs.value[hashId] ?? [])

  const latestRunByHashId = computed(() => hashId => runs.value[hashId]?.[0] ?? null)

  const runCountByHashId = computed(() => hashId => runs.value[hashId]?.length ?? 0)

  const hasErrorsByHashId = computed(() => (hashId) => {
    const count = runs.value[hashId]?.length ?? 0
    if (count >= 2) return true

    const latest = runs.value[hashId]?.[0]
    if (!latest) return false

    return latest.status === WORKFLOW_STATUS.FAILED
      || latest.status === WORKFLOW_STATUS.PARTIAL
  })

  const DEFAULT_STEP_STATUSES = {
    ocrStatus: WORKFLOW_STEP_STATUS.PENDING,
    annotationsStatus: WORKFLOW_STEP_STATUS.PENDING,
    splitStatus: WORKFLOW_STEP_STATUS.PENDING,
  }

  const stepStatusesByHashId = computed(() => (hashId) => {
    const latest = runs.value[hashId]?.[0]
    if (!latest) return { ...DEFAULT_STEP_STATUSES }

    return {
      ocrStatus: latest.ocrStatus ?? WORKFLOW_STEP_STATUS.PENDING,
      annotationsStatus: latest.annotationsStatus ?? WORKFLOW_STEP_STATUS.PENDING,
      splitStatus: latest.splitStatus ?? WORKFLOW_STEP_STATUS.PENDING,
    }
  })

  // -------- ACTIONS --------

  /**
   * Fetch all workflow runs for the current user
   */
  async function fetchAll () {
    loading.value = true
    try {
      const data = await $fetch('/api/workflows')
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
   * @param {string} hashId
   */
  async function fetchByUploadHashId (hashId) {
    try {
      const data = await $fetch(`/api/workflows/${hashId}`)
      runs.value[hashId] = data
      _log(`[WorkflowStore] ✅ fetched ${data.length} runs for ${hashId}`)
    }
    catch (err) {
      console.error(`[WorkflowStore] ❌ failed to fetch workflows for ${hashId}:`, err)
    }
  }

  /**
   * Update a workflow step status in-memory from an SSE event.
   * @param {string} hashId
   * @param {string} step - e.g. 'ocr', 'annotations', 'split', 'workflow'
   * @param {string} status
   */
  function updateStepStatus (hashId, step, status) {
    // Create skeleton run if none exists yet (SSE arrived before fetch)
    if (!runs.value[hashId]?.length) {
      runs.value[hashId] = [{ ...DEFAULT_STEP_STATUSES, status: WORKFLOW_STATUS.PROCESSING }]
    }

    const latest = runs.value[hashId][0]

    if (step === WORKFLOW_STEP.WORKFLOW) {
      latest.status = status
    }
    else {
      const stepKey = step + 'Status'
      latest[stepKey] = status
    }

    _log(`[WorkflowStore] 🔄 ${hashId} ${step}=${status}`)
  }

  /**
   * Remove workflow data for an upload
   * @param {string} hashId
   */
  function removeByHashId (hashId) {
    delete runs.value[hashId]
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
    getRunsByHashId,
    latestRunByHashId,
    runCountByHashId,
    hasErrorsByHashId,
    stepStatusesByHashId,

    // Actions
    fetchAll,
    fetchByUploadHashId,
    updateStepStatus,
    removeByHashId,
  }
})
