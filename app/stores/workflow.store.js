import { defineStore } from 'pinia'
import { WORKFLOW_RUN_STATUS } from '#shared/enums/workflow-run-status.js'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'
import { WORKFLOW_STEP, WORKFLOW_STEP_KEYS } from '#shared/enums/workflow-step.js'
import { useRealtimeStore } from '~/stores/realtime.store'

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

  // Reads the LATEST run's status only — "is this upload currently broken?".
  //
  // A previous version also returned true when an upload had >= 2 runs, on the
  // theory that a re-run implied something had failed. That was wrong: Trigger's
  // own retries (maxAttempts) re-execute WITHIN a run and create no new rows, so
  // extra rows only ever come from a human pressing re-run. It flagged uploads
  // the user had already fixed — run #1 fails, retry, run #2 succeeds, and the
  // error badge stayed lit forever. Run HISTORY is a separate question from
  // CURRENT state; if history is ever worth surfacing, use runCountById.
  const hasErrorsById = computed(() => (id) => {
    const latest = runs.value[id]?.[0]
    if (!latest) return false

    return latest.status === WORKFLOW_RUN_STATUS.FAILED
      || latest.status === WORKFLOW_RUN_STATUS.PARTIAL
      || latest.status === WORKFLOW_RUN_STATUS.EXPIRED
  })

  // Distinct from FAILED: the run was never dequeued by a worker (TTL expired).
  // Set by the reconcile path, not by the workflow callback.
  const isExpiredById = computed(() => (id) => {
    return runs.value[id]?.[0]?.status === WORKFLOW_RUN_STATUS.EXPIRED
  })

  // { ocrStatus: 'pending', annotationsStatus: 'pending', … } — derived from the
  // step registry so adding a step doesn't need an edit here.
  const DEFAULT_STEP_STATUSES = Object.fromEntries(
    WORKFLOW_STEP_KEYS.map(key => [`${key}Status`, WORKFLOW_STEP_STATUS.PENDING]),
  )

  const stepStatusesById = computed(() => (id) => {
    const latest = runs.value[id]?.[0]
    if (!latest) return { ...DEFAULT_STEP_STATUSES }

    return Object.fromEntries(
      WORKFLOW_STEP_KEYS.map((key) => {
        const field = `${key}Status`
        return [field, latest[field] ?? WORKFLOW_STEP_STATUS.PENDING]
      }),
    )
  })

  const isProcessingById = computed(() => (id) => {
    const latest = runs.value[id]?.[0]
    if (!latest) return false
    return latest.status === WORKFLOW_RUN_STATUS.QUEUED
      || latest.status === WORKFLOW_RUN_STATUS.PROCESSING
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
   * @param {string} step - One of `WORKFLOW_STEP` values (see #shared/enums/workflow-step.js)
   * @param {string} status
   * @param {string} [error] - Error message for failed steps
   */
  function updateStepStatus (id, step, status, error) {
    // Create skeleton run if none exists yet (SSE arrived before fetch)
    if (!runs.value[id]?.length) {
      runs.value[id] = [{ ...DEFAULT_STEP_STATUSES, status: WORKFLOW_RUN_STATUS.PROCESSING }]
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
   * Ingest a broadcast payload from the `workflow_runs` topic (migration 0026).
   *
   * The payload is a complete scalar snapshot of the run, built in camelCase by
   * the Postgres trigger — so unlike the old postgres_changes path there is no
   * snake_case mapping here. Per-step statuses and timestamps arrive as
   * `${step}Status` / `${step}StartedAt` / `${step}CompletedAt` already.
   *
   * Upserted as the latest run for its upload — no delta reconstruction, the row
   * is the source of truth.
   *
   * @param {object} payload - camelCase payload built by the Postgres trigger
   * @param {UUID} payload.id - message ID generated by supabase
   * @param {number} payload.runId - workflow_runs.id
   */
  function ingestRun (payload) {
    if (!payload?.uploadId) return

    const uploadId = payload.uploadId

    // Ensure our runId (not payload id) is mapped to id
    // eslint-disable-next-line no-unused-vars
    const { id: _messageId, runId, ...fields } = payload

    const mapped = { ...fields, id: runId }

    const existing = runs.value[uploadId] ?? []
    const idx = existing.findIndex(r => r.id === mapped.id)
    const previous = idx === -1 ? null : existing[idx]

    if (idx === -1) {
      // New run — prepend (latest-first ordering the getters rely on).
      runs.value[uploadId] = [mapped, ...existing]
    }
    else {
      // Update in place, preserving array position.
      existing[idx] = mapped
      runs.value[uploadId] = [...existing]
    }

    // Log only what changed. A run updates workflow_runs once per step
    // transition while the run-level status stays 'processing', so logging the
    // whole row makes distinct events look identical (the console collapses them
    // into a single "10x" line). Diff against the previous row and log the delta.
    if (!previous) {
      _log(`[WorkflowStore] 🔄 new run ${mapped.id} for ${uploadId} (status=${mapped.status})`)
    }
    else {
      const changed = Object.keys(mapped)
        .filter(k => mapped[k] !== previous[k])
        .map(k => `${k}=${mapped[k]}`)
        .join(' ')
      _log(`[WorkflowStore] 🔄 run ${mapped.id} for ${uploadId} changed: ${changed || '(no field change)'}`)
    }
  }

  /**
   * Reconcile stuck runs against Trigger.dev before fetching. A run no worker
   * ever dequeued stays 'queued' locally forever; the server asks Trigger for
   * the real state and finalizes expired/crashed runs so the UI can surface
   * them. Best-effort — failure here must not block loading workflow data.
   */
  async function reconcile () {
    try {
      await $fetch('/api/workflows/reconcile', { method: 'POST' })
    }
    catch (err) {
      _log(`[WorkflowStore] reconcile skipped: ${err.message}`)
    }
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
   * Subscribe this store to its own broadcast topic. Called from the default
   * layout — stores are lazy, and one no page has touched would miss the INSERT
   * that creates a run.
   *
   * @param {string} householdId
   * @returns {() => void} unsubscribe
   */
  function subscribeToWorkflowRuns (householdId) {
    if (!householdId) return () => {}

    return useRealtimeStore().subscribe(
      `household:${householdId}:workflow_runs`,
      ingestRun,
    )
  }

  /**
   * Remove workflow data for an upload
   * @param {string} id
   */
  function removeById (id) {
    delete runs.value[id]
  }

  /**
   * Drop all session-scoped state. Called on logout — `debug` is a dev setting,
   * not user data, so it stays.
   */
  function reset () {
    runs.value = {}
    loading.value = false
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
    isExpiredById,
    isProcessingById,
    stepStatusesById,

    // Actions
    fetchAll,
    fetchByUploadId,
    reconcile,
    triggerWorkflow,
    updateStepStatus,
    ingestRun,
    subscribeToWorkflowRuns,
    removeById,
    reset,
  }
})
