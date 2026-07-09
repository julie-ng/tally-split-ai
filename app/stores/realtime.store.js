import { defineStore } from 'pinia'
import { createClient } from '@supabase/supabase-js'
import { useUploadQueueStore } from '~/stores/upload-queue.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { useHouseholdStore } from '~/stores/household.store'

/**
 * Realtime store — Supabase Realtime (websockets) for live workflow_runs updates.
 *
 * Replaces the previous SSE implementation (Vercel function timeouts made SSE
 * unworkable; see docs/REALTIME.md). Same external API — connect() / disconnect()
 * — so consumers (pages/uploads, useLogout) are unchanged.
 *
 * Auth: we keep our own auth in nuxt-auth-utils. This store fetches a short-lived
 * ES256 JWT from /api/realtime/token and hands it to Supabase via setAuth. There
 * is no RLS yet, so the subscription is wide-open and we filter client-side by
 * the current household (the workflow_runs.household_id column). RLS (a later
 * phase) will move that filter into the DB and this client-side check goes away.
 */
export const useRealtimeStore = defineStore('realtime', () => {
  const client = ref(null)
  const channel = ref(null)
  const isConnected = ref(false)
  const hasShownDisconnectToast = ref(false)
  let refreshTimer = null

  // Refresh the access token before it expires (token TTL is 1h; refresh at 50m).
  const TOKEN_REFRESH_MS = 50 * 60 * 1000

  async function fetchToken () {
    // $fetch (not useRequestFetch) — connect() runs client-side on user action.
    const { token } = await $fetch('/api/realtime/token')
    return token
  }

  function getClient () {
    if (client.value) return client.value

    const config = useRuntimeConfig()
    const url = config.public.supabaseUrl
    const publishableKey = config.public.supabasePublishableKey

    if (!url || !publishableKey) {
      console.error('[RealtimeStore] Supabase URL/publishable key not configured')
      return null
    }

    // No Supabase Auth session persistence — we drive auth via setAuth(token).
    client.value = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return client.value
  }

  async function connect () {
    if (channel.value) return

    const supabase = getClient()
    if (!supabase) return

    let token
    try {
      token = await fetchToken()
    }
    catch (err) {
      console.error('[RealtimeStore] failed to fetch realtime token:', err)
      return
    }

    await supabase.realtime.setAuth(token)
    _scheduleTokenRefresh(supabase)

    channel.value = supabase
      .channel('workflow-runs')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_runs' },
        payload => handleRowChange(payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeStore] subscribed')
          isConnected.value = true
        }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isConnected.value = false
          _maybeShowDisconnectToast()
        }
      })
  }

  function disconnect () {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    if (channel.value && client.value) {
      client.value.removeChannel(channel.value)
    }
    channel.value = null
    isConnected.value = false
    hasShownDisconnectToast.value = false
  }

  /**
   * Handle a workflow_runs change. No RLS yet, so filter client-side by the
   * current household before acting on the row.
   */
  function handleRowChange (payload) {
    const row = payload.new
    if (!row) return

    const householdStore = useHouseholdStore()
    // Only act on runs belonging to the current household. (RLS will make this
    // redundant later.) If the household id isn't loaded yet, err on ignoring —
    // a fetch on mount will reconcile the authoritative state anyway.
    if (!householdStore.id || row.household_id !== householdStore.id) return

    const uploadId = row.upload_id
    if (!uploadId) return

    // 1. Upload queue (client-side upload progress) — set all step statuses.
    const uploadQueueStore = useUploadQueueStore()
    const queueItem = uploadQueueStore.uploads.find(u => u.id === uploadId)
    if (queueItem) {
      queueItem.workflowStatus = {
        ocr: row.ocr_status,
        annotations: row.annotations_status,
        normalize: row.normalize_status,
        createExpense: row.create_expense_status,
        adjustExpense: row.adjust_expense_status,
        _orchestrator: row.status,
      }
    }

    // 2. Workflow store (DB-backed data) — ingest the full authoritative row.
    const workflowStore = useWorkflowStore()
    workflowStore.ingestRun(row)

    // 3. Pull the upload row in ONLY if it isn't already loaded. A workflow run
    //    updates workflow_runs many times per upload (once per step transition);
    //    the upload row itself doesn't change during a run, and its live status
    //    comes from the workflow store above. So fetch at most once — when we
    //    first see a run for an upload not yet in the table — instead of on every
    //    event (which was ~14 redundant refetches per upload).
    const uploadsStore = useUploadsStore()
    if (!uploadsStore.getUploadById(uploadId)) {
      uploadsStore.refreshUploadById(uploadId)
    }
  }

  function _scheduleTokenRefresh (supabase) {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(async () => {
      try {
        const token = await fetchToken()
        await supabase.realtime.setAuth(token)
        _scheduleTokenRefresh(supabase)
      }
      catch (err) {
        console.error('[RealtimeStore] token refresh failed:', err)
      }
    }, TOKEN_REFRESH_MS)
  }

  function _maybeShowDisconnectToast () {
    // Suppress when logged out — session destruction closes the channel, expected.
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) return
    if (hasShownDisconnectToast.value) return

    hasShownDisconnectToast.value = true
    useToast().add({
      title: 'Realtime updates disconnected',
      description: 'Connection lost.',
      color: 'warning',
      icon: 'i-lucide-wifi-off',
      duration: 0,
      actions: [{
        label: 'Refresh to re-connect',
        onClick: () => window.location.reload(),
      }],
    })
  }

  return {
    isConnected,
    connect,
    disconnect,
  }
})
