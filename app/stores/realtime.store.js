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
 *
 * TWO TRANSPORTS, deliberately:
 *
 *  1. `postgres_changes` on workflow_runs — the original, still the only user of
 *     handleRowChange(). Streams whole row images.
 *  2. `broadcast` via subscribe() — payloads built by a Postgres trigger, so they
 *     carry only the columns we choose. All NEW subscribed content uses this.
 *
 * They coexist indefinitely; moving workflow_runs across is optional and currently
 * unjustified (see notes/2026-07-26-realtime-data-flow-analysis.md §5 Phase 4).
 *
 * DEPENDENCY DIRECTION — this store must eventually import NO other store. The
 * three imports above serve handleRowChange() (the postgres_changes path) only.
 * subscribe() is deliberately generic: content stores call it and own their own
 * ingest, so the arrow points store → realtime, never the reverse. Do not add
 * store imports for broadcast topics. See §4.4.
 */
export const useRealtimeStore = defineStore('realtime', () => {
  const client = ref(null)
  const channel = ref(null)
  const isConnected = ref(false)
  // Broadcast channels opened via subscribe(), keyed by topic. Separate from the
  // `channel` ref above, which is the single postgres_changes channel.
  //
  // Kept so disconnect() can tear them ALL down: the SDK holds channels on the
  // client, so removing only the workflow-runs one would leave content channels
  // live across a logout and into the next user's session.
  const broadcastChannels = new Map()

  // Monotonic count of times we've (re)joined after a drop. Bumped on SUBSCRIBED
  // when we were previously disconnected — NOT on the first connect.
  //
  // The point: a store can cache this alongside its data, and if the value has
  // moved since, there was a gap during which pushes were missed — so that row is
  // suspect REGARDLESS of age. Elapsed time is the wrong staleness signal when the
  // real risk is a dropped connection, not a long one.
  const reconnectCount = ref(0)
  // Distinguishes the first SUBSCRIBED (normal) from a later one (a re-join).
  let hasConnectedOnce = false

  // Rolling connection-event log, newest last. Debugging aid: correlate "the UI
  // went stale" with an actual drop. Capped so a long session can't grow it without
  // bound.
  const connectionEvents = ref([])
  const MAX_CONNECTION_EVENTS = 50

  function _recordConnectionEvent (event, detail) {
    const entry = { event, detail, at: new Date().toISOString() }
    connectionEvents.value.push(entry)
    if (connectionEvents.value.length > MAX_CONNECTION_EVENTS) {
      connectionEvents.value.shift()
    }
    console.log(`🔌 [Realtime] ${event}${detail ? ` — ${detail}` : ''}`)
  }
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
        //
        // ⚠️ Detection is NOT immediate: a dropped socket surfaces via heartbeat
        // timeout, ~30s in testing. So `isConnected` can read true for half a
        // minute after connectivity is actually gone — don't treat it as a
        // real-time liveness signal.
        if (status === 'SUBSCRIBED') {
          // A SUBSCRIBED while already disconnected is a RE-join: there was a
          // window where pushes were missed. Anything cached before this is
          // suspect. (Broadcast has no replay here — missed messages are gone.)
          if (hasConnectedOnce) {
            reconnectCount.value += 1
            _recordConnectionEvent('rejoined', `reconnect #${reconnectCount.value} — data cached before now may have missed pushes`)
          }
          else {
            hasConnectedOnce = true
            _recordConnectionEvent('subscribed')
          }
          isConnected.value = true
        }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Only record a genuine transition — the SDK can re-fire these while
          // already down, which would otherwise flood the log.
          if (isConnected.value) {
            _recordConnectionEvent('dropped', status)
          }
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

    if (client.value) {
      for (const broadcastChannel of broadcastChannels.values()) {
        client.value.removeChannel(broadcastChannel)
      }
    }
    broadcastChannels.clear()

    isConnected.value = false
    // Logout teardown — the next login is a first connect, not a re-join.
    hasConnectedOnce = false
    _recordConnectionEvent('disconnected', 'logout')
  }

  /**
   * Subscribe to a Broadcast topic. The generic primitive Phase 1+ is built on.
   *
   * Content stores call this with their own topic and their own ingest function;
   * this store never learns what a receipt or an expense is. Because each store
   * subscribes to its own topic, the subscription IS the routing — there is no
   * dispatcher and no event-name switch.
   *
   *   // in receipts.store.js
   *   const unsubscribe = useRealtimeStore().subscribe(
   *     `household:${householdId}:receipts`,
   *     ingestReceipt,
   *   )
   *
   * Requires connect() to have run first — it establishes the client and calls
   * setAuth(), which Realtime Authorization needs before a private channel can be
   * joined. Returns a no-op unsubscribe if the client isn't configured, so callers
   * never need a null check.
   *
   * Listens for '*' rather than a named event. Most triggers pass TG_OP, so the
   * event is INSERT / UPDATE — ingests upsert by id and don't care which (a row can
   * arrive as an INSERT the client never saw, §4.6.1).
   *
   * A table MAY have several triggers with different payload shapes (§4.3.1 tier 2 —
   * e.g. uploads broadcasts scalars on any write, plus `annotations_json` only on
   * `UPDATE OF`). Those pass a custom event name, so the handler gets it as the 2nd
   * arg and routes on it. Handlers that only ever see one shape can ignore it.
   *
   * @param {string} topic - `household:<householdId>:<resource>`. MUST match the
   *   topic the Postgres trigger passes to realtime.send(), and MUST be prefixed
   *   `household:<householdId>:` or the RLS policy (migration 0022) refuses the join.
   * @param {(payload: object, event: string) => void} handler - Receives the
   *   trigger's payload (NOT a row image; partial by design, so merge never
   *   replace) and the event name — TG_OP, or a custom one for a scoped trigger.
   * @returns {() => void} unsubscribe
   */
  function subscribe (topic, handler) {
    const supabase = getClient()
    if (!supabase) return () => {}

    // Re-subscribing the same topic would open a second channel receiving
    // duplicate messages. Stores register once from the layout, but HMR and
    // double-invoked setup make this cheap insurance.
    if (broadcastChannels.has(topic)) {
      return () => unsubscribe(topic)
    }

    // Whether this topic has EVER joined — see the CHANNEL_ERROR branch below.
    let hasJoined = false

    const broadcastChannel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: '*' }, message => handler(message.payload, message.event))
      .subscribe((status) => {
        // Deliberately does NOT touch isConnected — that tracks the
        // workflow_runs channel, which drives the UI's live indicator. A content
        // topic failing shouldn't report the whole connection as down.
        //
        // TEMPORARY (Phase 1 verification): the SUBSCRIBED line separates "joined
        // but nothing published" (look at the Postgres trigger) from "never
        // joined" (look at 0022's policy). Drop it once Broadcast is trusted.
        if (status === 'SUBSCRIBED') {
          hasJoined = true
          console.log(`📡 [Broadcast] joined "${topic}"`)
        }
        else if (status === 'CHANNEL_ERROR') {
          // CHANNEL_ERROR covers BOTH an auth refusal and a transport failure —
          // the SDK reports them identically. Distinguish by whether we ever
          // joined: a channel that joined once has a working policy, so a later
          // error is the network (heartbeat timeout, socket drop) and the SDK
          // will auto-reconnect. Only a failure on the FIRST join implicates the
          // policy or topic string.
          if (hasJoined) {
            _recordConnectionEvent('topic-dropped', topic)
          }
          else {
            console.error(`[RealtimeStore] could not join "${topic}" — check the realtime.messages policy (0022) and the topic prefix`)
          }
        }
      })

    broadcastChannels.set(topic, broadcastChannel)

    return () => unsubscribe(topic)
  }

  function unsubscribe (topic) {
    const broadcastChannel = broadcastChannels.get(topic)
    if (!broadcastChannel) return

    broadcastChannels.delete(topic)
    if (client.value) {
      client.value.removeChannel(broadcastChannel)
    }
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

  /**
   * setAuth() is client-global, not per-channel: it updates the access token on
   * the shared socket, so the postgres_changes channel and every broadcast
   * channel are all re-authorized by this one call. No per-channel loop needed.
   */
  async function _refreshToken (supabase) {
    const token = await fetchToken()
    await supabase.realtime.setAuth(token)
    _scheduleTokenRefresh(supabase)
    _recordConnectionEvent('token-refreshed')
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
    // Bumped on every re-join. Cache it alongside data to detect a missed-push
    // window — see the declaration above.
    reconnectCount,
    connectionEvents,
    connect,
    disconnect,
    subscribe,
  }
})
