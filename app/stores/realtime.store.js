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
  let refreshTimer = null
  // Unix seconds when the current token expires. Used to decide, on tab-visible,
  // whether the token went stale while the tab was backgrounded (the refresh
  // timer doesn't fire while asleep).
  let tokenExpiresAt = 0
  // Count of consecutive token-mint failures during (re)connect. A dropped
  // channel is normal — the SDK auto-reconnects — but if we can't mint an auth
  // token at all, Realtime is genuinely unavailable, and we surface it once.
  let authFailureCount = 0
  let hasShownErrorToast = false

  // Refresh the access token before it expires (token TTL is 1h; refresh at 50m).
  const TOKEN_REFRESH_MS = 50 * 60 * 1000
  // On tab-visible, re-mint only if the token has < this much life left;
  // otherwise the existing refresh timer still covers it.
  const REMINT_THRESHOLD_MS = 10 * 60 * 1000
  // Give up (and surface a toast) after this many consecutive mint failures.
  const MAX_AUTH_FAILURES = 3

  async function fetchToken () {
    // $fetch (not useRequestFetch) — connect() runs client-side on user action.
    const { token, expiresAt } = await $fetch('/api/realtime/token')
    tokenExpiresAt = expiresAt || 0
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
      authFailureCount = 0
    }
    catch (err) {
      console.error('[RealtimeStore] failed to fetch realtime token:', err)
      _handleAuthFailure()
      return
    }

    await supabase.realtime.setAuth(token)
    _scheduleTokenRefresh(supabase)

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', _onVisibilityChange)
    }

    channel.value = supabase
      .channel('workflow-runs')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_runs' },
        payload => handleRowChange(payload))
      .subscribe((status) => {
        // The SDK auto-reconnects (exponential backoff) on CHANNEL_ERROR /
        // TIMED_OUT and rejoins after network interruptions, re-firing
        // SUBSCRIBED on recovery. So a dropped channel needs no user-facing
        // toast and no manual retry — we only track isConnected for the UI.
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeStore] subscribed')
          isConnected.value = true
        }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isConnected.value = false
        }
      })
  }

  function disconnect () {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', _onVisibilityChange)
    }
    if (channel.value && client.value) {
      client.value.removeChannel(channel.value)
    }
    channel.value = null
    isConnected.value = false
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

  async function _refreshToken (supabase) {
    const token = await fetchToken()
    await supabase.realtime.setAuth(token)
    _scheduleTokenRefresh(supabase)
  }

  function _scheduleTokenRefresh (supabase) {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(async () => {
      try {
        await _refreshToken(supabase)
      }
      catch (err) {
        console.error('[RealtimeStore] token refresh failed:', err)
      }
    }, TOKEN_REFRESH_MS)
  }

  /**
   * On tab-visible, the refresh timer may have been throttled/paused while the
   * tab was backgrounded, leaving a stale token for the SDK's auto-reconnect to
   * present. Re-mint only when the token is expired or near-expiry; a brief tab
   * switch (token still has ample life) is left to the existing timer.
   */
  async function _onVisibilityChange () {
    if (document.visibilityState !== 'visible') return
    if (!client.value) return

    const msLeft = tokenExpiresAt * 1000 - Date.now()
    if (msLeft > REMINT_THRESHOLD_MS) return

    try {
      await _refreshToken(client.value)
    }
    catch (err) {
      console.error('[RealtimeStore] token re-mint on visible failed:', err)
    }
  }

  function _handleAuthFailure () {
    authFailureCount += 1
    if (authFailureCount < MAX_AUTH_FAILURES) return
    if (hasShownErrorToast) return

    // Suppress when logged out — expected during session teardown.
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) return

    hasShownErrorToast = true
    _showErrorToast()
  }

  function _showErrorToast () {
    console.error('[RealtimeStore] live updates unavailable — token mint failed repeatedly')
    useToast().add({
      title: 'Live updates unavailable',
      description: 'We couldn\'t establish a realtime connection.',
      color: 'warning',
      icon: 'i-lucide-wifi-off',
      duration: 0,
    })
  }

  return {
    isConnected,
    connect,
    disconnect,
  }
})
