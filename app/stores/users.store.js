import { defineStore } from 'pinia'

/**
 * Users store — fetches a single user by id, scoped to caller's household.
 * Out-of-household lookups 404 at the API.
 */
export const useUsersStore = defineStore('users', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // -------- ACTIONS --------

  async function fetch (id) {
    loading.value = true
    error.value = null
    try {
      user.value = await requestFetch(`/api/users/${id}`)
      return user.value
    }
    catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    fetch,
  }
})
