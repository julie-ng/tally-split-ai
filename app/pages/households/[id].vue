<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()
const toast = useToast()

useHead({
  title: 'Household Members',
})

const newUsername = ref('')
const submitting = ref(false)
const formError = ref('')

const isFull = computed(() => householdStore.members.length >= 2)

async function handleSubmit () {
  formError.value = ''
  const username = newUsername.value.trim()
  if (!username) {
    formError.value = 'Enter a GitHub username'
    return
  }

  submitting.value = true
  try {
    const member = await householdStore.addMember(username)
    newUsername.value = ''
    toast.add({
      title: 'Member added',
      description: `${member.displayName ?? member.username} can now log in via GitHub.`,
      color: 'success',
      icon: 'i-lucide-user-plus',
    })
  }
  catch (err) {
    formError.value = err?.data?.message ?? err?.message ?? 'Failed to add member'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UContainer class="my-5 content">
    <h1 class="font-bold text-3xl mb-2">
      Household Members
    </h1>
    <p v-if="householdStore.name" class="text-dimmed mb-6">
      {{ householdStore.name }}
    </p>

    <!-- Members list -->
    <section class="mb-8">
      <h2 class="font-semibold text-lg mb-3">
        Current members ({{ householdStore.members.length }} / 2)
      </h2>
      <div class="grid gap-3 max-w-2xl">
        <div
          v-for="member in householdStore.members"
          :key="member.id"
          class="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-white"
        >
          <UAvatar :src="member.avatarUrl" :alt="member.username" size="md" />
          <div class="flex-1">
            <div class="font-medium">
              <NuxtLink :to="`/users/${member.id}`">
                {{ member.displayName ?? member.username }}
              </NuxtLink>
            </div>
            <div class="text-sm text-dimmed">
              @{{ member.username }} · {{ member.initials }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Add member form -->
    <section class="max-w-2xl">
      <h2 class="font-semibold text-lg mb-3">
        Add a member
      </h2>

      <div v-if="isFull" class="text-sm text-dimmed">
        Household is full. The 2-member limit applies during the POC.
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <div class="flex gap-2">
          <UInput
            v-model="newUsername"
            placeholder="GitHub username"
            class="flex-1"
            variant="subtle"
            :disabled="submitting"
          />
          <UButton
            type="submit"
            color="info"
            class="cursor-pointer"
            :loading="submitting"
            :disabled="submitting"
          >
            Add member
          </UButton>
        </div>
        <p v-if="formError" class="text-red-600 text-sm mt-2">
          {{ formError }}
        </p>
        <p class="text-xs text-dimmed mt-2">
          We fetch the public GitHub profile to provision the account. The new
          member must log in via GitHub themselves before using the app.
        </p>
      </form>
    </section>
  </UContainer>
</template>
