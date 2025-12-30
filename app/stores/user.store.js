import { defineStore } from 'pinia'
// import { randomUUID } from 'crypto'

export const useUserStore = defineStore('user', () => {
  const config = useRuntimeConfig()
  const isDev = config.public.environment === 'development'

  // console.log('firstName?', config.public.demoUserFirstName)

  const firstName = ref(isDev ? config.public.demoUserFirstName : 'Unset')
  const lastName = ref(isDev ? config.public.demoUserLastName : 'Unset')
  const username = ref(isDev ? config.public.demoUserUsername : 'Unset')
  const email = ref(isDev ? config.public.demoUserEmail : 'Unset')
  const userId = ref(isDev ? crypto.randomUUID() : 'Unset')

  const fullName = computed(() => `${firstName.value} ${lastName.value}`)

  return {
    firstName,
    fullName,
    email,
    lastName,
    userId,
    username,
  }
})
