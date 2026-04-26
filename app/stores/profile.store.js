import { defineStore } from 'pinia'

/**
 * Store for the current user's profile (single resource).
 * GET uses useRequestFetch() to forward session cookies during SSR.
 * PATCH uses $fetch() — mutations are always client-side.
 */
export const useProfileStore = defineStore('profile', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const profile = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)

  // -------- ACTIONS --------

  async function fetchProfile () {
    loading.value = true
    error.value = null
    try {
      profile.value = await requestFetch('/api/profile')
    }
    catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function updateProfile (data) {
    saving.value = true
    error.value = null
    try {
      profile.value = await $fetch('/api/profile', {
        method: 'PATCH',
        body: data,
      })
      return profile.value
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
    profile,
    loading,
    saving,
    error,
    fetchProfile,
    updateProfile,
  }
})
