<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()
const toast = useToast()

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
  <section class="max-w-2xl">
    <h2 class="font-semibold text-lg mb-1">
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
</template>
