import { defineStore } from 'pinia'

/**
 * Current user store — singleton, sourced from the auth session.
 *
 * The session ref from `useUserSession()` is reactive. All exposed values
 * are `ComputedRef`s derived from it.
 *
 * IMPORTANT: Reference store values directly in templates and computeds.
 * Aliasing a ref to a local const unwraps it to a primitive snapshot and
 * breaks reactivity — the value will not update when the session changes.
 *
 *   ✅ Template:  {{ userStore.displayName }}
 *   ✅ Computed:  const greeting = computed(() => `Hi, ${userStore.displayName}`)
 *   ❌ Local:     const name = userStore.displayName  // snapshot, won't update
 *
 * Acceptable exception: form snapshots. When seeding a form `ref` from the
 * store, a one-time read is intentional — the user is about to diverge from
 * the store value. After save, do NOT copy values back; the store updates
 * itself via `useUserSession().fetch()` and any binding to `userStore.*`
 * reflects the new value automatically.
 *
 * Mutations: `updateUser()` PATCHes /api/user, which calls
 * `replaceUserSession` server-side. The client then refreshes the session
 * ref via `useUserSession().fetch()` so all consumers re-render.
 */
export const useUserStore = defineStore('user', () => {
  const { user, fetch: fetchSession } = useUserSession()

  // -------- STATE --------

  const saving = ref(false)
  const error = ref(null)

  // -------- COMPUTEDS --------

  const userId = computed(() => user.value?.id ?? null)
  const githubId = computed(() => user.value?.githubId ?? null)
  const username = computed(() => user.value?.username ?? null)
  const displayName = computed(() => user.value?.displayName ?? user.value?.username ?? null)
  const initials = computed(() => user.value?.initials ?? null)
  const avatarUrl = computed(() => user.value?.avatarUrl ?? null)
  const lastLoginAt = computed(() => user.value?.lastLoginAt ?? null)

  // -------- ACTIONS --------

  async function updateUser (data) {
    saving.value = true
    error.value = null
    try {
      const updated = await $fetch('/api/user', {
        method: 'PATCH',
        body: data,
      })
      // Refresh the client session ref so reactive consumers (sidebar, etc.)
      // re-render with the new values. The server already wrote the new
      // session cookie via replaceUserSession in PATCH /api/user.
      await fetchSession()
      return updated
    }
    catch (err) {
      error.value = err
      throw err
    }
    finally {
      saving.value = false
    }
  }

  return {
    saving,
    error,
    userId,
    githubId,
    username,
    displayName,
    initials,
    avatarUrl,
    lastLoginAt,
    updateUser,
  }
})
