import { defineStore } from 'pinia'
import { createClient } from '@supabase/supabase-js'
import { useUploadQueueStore } from '~/stores/upload-queue.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'

/**
 * Realtime store — Supabase Realtime (websockets) for live workflow_runs updates.
 *
 * Replaces the previous SSE implementation (Vercel function timeouts made SSE
 * unworkable; see docs/REALTIME.md). Same external API — connect() / disconnect()
 * — so consumers (pages/uploads, useLogout) are unchanged.
 *
 * Auth: we keep our own auth in nuxt-auth-utils. This store fetches a short-lived
 * ES256 JWT from /api/realtime/token and hands it to Supabase via setAuth. Household
 * scoping is enforced by RLS on workflow_runs (migration 0018): Supabase only
 * forwards rows for the user's own household, so there is no client-side filter.
 */
export const useRealtimeStore = defineStore('realtime', () => {
  const client = ref(null)
  const channel = ref(null)
  const isConnected = ref(false)
  const hasShownDisconnectToast = ref(false)
  let refreshTimer = null
  // Set while disconnect() tears down so the subscribe() callback ignores the
  // CLOSED status that removeChannel() fires — that's an intentional teardown
  // (e.g. navigating away from /uploads), not a lost connection.
  let isDisconnecting = false

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

    // Re-arm: clear the teardown flag so a real disconnect on this fresh
    // connection surfaces the toast.
    isDisconnecting = false

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
          // Suppress on intentional teardown — removeChannel() fires CLOSED.
          if (!isDisconnecting) {
            _maybeShowDisconnectToast()
          }
        }
      })
  }

  function disconnect () {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    // Stays true past this sync body: removeChannel() fires CLOSED on the
    // subscribe() callback asynchronously. connect() clears it on next use.
    isDisconnecting = true
    if (channel.value && client.value) {
      client.value.removeChannel(channel.value)
    }
    channel.value = null
    isConnected.value = false
    hasShownDisconnectToast.value = false
  }

  /**
   * Handle a workflow_runs change. Household scoping is enforced by RLS on
   * workflow_runs (migration 0018) — Supabase only forwards rows for the user's
   * own household, so there is no client-side household filter here.
   */
  function handleRowChange (payload) {
    const row = payload.new
    if (!row) return

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
