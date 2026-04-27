<script setup>
import { useUserStore } from '~/stores/user.store'

const userStore = useUserStore()

// Form state is intentionally a snapshot — the user is about to edit it.
// See user.store.js JSDoc for the form-snapshot exception.
const formData = ref({
  displayName: userStore.displayName ?? '',
  initials: userStore.initials ?? '',
})

const fieldErrors = ref({})
const saveSuccess = ref(false)

useHead({
  title: 'Profile',
})

async function handleSubmit () {
  fieldErrors.value = {}
  saveSuccess.value = false
  try {
    await userStore.updateUser({
      displayName: formData.value.displayName,
      initials: formData.value.initials,
    })
    saveSuccess.value = true
  }
  catch (err) {
    if (err?.data?.errors) {
      fieldErrors.value = err.data.errors
    }
  }
}
</script>

<template>
  <UContainer class="my-5 content">
    <h1 class="font-bold text-3xl mb-6">
      Profile
    </h1>

    <UAlert
      v-if="saveSuccess"
      color="success"
      variant="subtle"
      title="Profile updated"
      class="mb-4 max-w-2xl"
      :close="{ onClick: () => saveSuccess = false }"
    />

    <form v-if="userStore.userId" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-3 gap-4 max-w-2xl">
        <div>
          <label for="username" class="block text-sm">Username</label>
        </div>
        <div class="col-span-2">
          <UInput
            id="username"
            :model-value="userStore.username"
            disabled
            class="w-80"
            variant="subtle"
          />
        </div>

        <div>
          <label for="displayName" class="block text-sm">Display name</label>
        </div>
        <div class="col-span-2">
          <UInput
            id="displayName"
            v-model="formData.displayName"
            class="w-80"
            variant="subtle"
          />
          <p v-if="fieldErrors.displayName" class="text-red-600 text-sm mt-1">
            {{ fieldErrors.displayName.join(', ') }}
          </p>
        </div>

        <div>
          <label for="initials" class="block text-sm">Initials</label>
        </div>
        <div class="col-span-2">
          <UInput
            id="initials"
            v-model="formData.initials"
            maxlength="5"
            class="w-80"
            variant="subtle"
          />
          <p v-if="fieldErrors.initials" class="text-red-600 text-sm mt-1">
            {{ fieldErrors.initials.join(', ') }}
          </p>
        </div>
      </div>

      <div class="mt-6">
        <UButton
          type="submit"
          color="info"
          size="lg"
          class="cursor-pointer"
          :loading="userStore.saving"
          :disabled="userStore.saving"
        >
          {{ userStore.saving ? 'Saving...' : 'Save Changes' }}
        </UButton>
      </div>
    </form>
  </UContainer>
</template>
