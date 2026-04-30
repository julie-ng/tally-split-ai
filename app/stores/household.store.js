import { defineStore } from 'pinia'

/**
 * Household store — fetches the current user's household + members.
 *
 * Members are returned ordered by users.createdAt ASC, matching the
 * userOne/userTwo slot order on splits. So:
 *   members[0] === userOne (first user to log in)
 *   members[1] === userTwo (second member, may be undefined for demo households)
 *
 * Cached for the session — fetched once via callOnce() in the default layout.
 *
 * TODO: When household editing (rename, add/remove members) ships in a later
 * phase, those mutations must call `refresh()` to invalidate the cache.
 */
export const useHouseholdStore = defineStore('household', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const household = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // -------- COMPUTEDS --------

  const id = computed(() => household.value?.id ?? null)
  const name = computed(() => household.value?.name ?? null)
  const members = computed(() => household.value?.members ?? [])
  const userOne = computed(() => members.value[0] ?? null)
  const userTwo = computed(() => members.value[1] ?? null)
  const hasTwoMembers = computed(() => members.value.length >= 2)

  // -------- GETTERS --------

  const getMemberById = computed(() => id => members.value.find(m => m.id === id) ?? null)

  const getMemberName = computed(() => (id) => {
    if (!id) return '?'
    const member = getMemberById.value(id)
    if (!member) return '?'
    return member.displayName ?? member.username ?? '?'
  })

  /**
   * First name only — splits displayName on whitespace and returns the first
   * token. Falls back to username if no displayName. Used in tight UI slots
   * (column headers, summary cards) where the full name is too long.
   */
  const getMemberFirstName = computed(() => (id) => {
    if (!id) return '?'
    const member = getMemberById.value(id)
    if (!member) return '?'
    const source = member.displayName ?? member.username
    if (!source) return '?'
    return source.split(/\s+/)[0]
  })

  // -------- ACTIONS --------

  async function fetch () {
    loading.value = true
    error.value = null
    try {
      household.value = await requestFetch('/api/household')
      return household.value
    }
    catch (err) {
      error.value = err
      console.error('[HouseholdStore] failed to fetch household:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Force-refresh from the server. Use after household-mutating actions
   * (rename, add/remove member) once those endpoints exist.
   */
  async function refresh () {
    return fetch()
  }

  return {
    household,
    loading,
    error,
    id,
    name,
    members,
    userOne,
    userTwo,
    hasTwoMembers,
    getMemberById,
    getMemberName,
    getMemberFirstName,
    fetch,
    refresh,
  }
})
