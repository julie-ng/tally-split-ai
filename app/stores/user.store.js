import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const { user } = useUserSession()

  const userId = computed(() => user.value?.id ?? null)
  const displayName = computed(() => user.value?.displayName ?? user.value?.username ?? null)

  return {
    userId,
    displayName,
  }
})
