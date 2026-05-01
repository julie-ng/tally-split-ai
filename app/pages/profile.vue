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
  <UDashboardPanel id="profile">
    <template #header>
      <UDashboardNavbar title="Profile">
        <template #left>
          <UBreadcrumb :items="[{ label: 'Profile' }]" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="saveSuccess"
        color="success"
        variant="subtle"
        title="Profile updated"
        class="mb-4 max-w-2xl"
        :close="{ onClick: () => saveSuccess = false }"
      />

      <form v-if="userStore.userId" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-4 max-w-2xl">
          <div>
            <p class="block text-sm mb-1 font-semibold">
              GitHub Username
            </p>
            <p class="text-xs text-muted mt-0 mb-1">
              GitHub account used for login. Not editable.
            </p>
            <!-- <p class="text-sm text-muted">
              {{ userStore.username }}
            </p> -->
            <UInput
              id="username"
              :model-value="userStore.username"
              disabled
              class="w-40 mb-2"
              variant="subtle"
            />
          </div>

          <div>
            <label for="displayName" class="block text-sm font-semibold mb-1">Display name</label>
            <p class="text-xs text-muted mb-2">
              Defaults to GitHub full name.
            </p>
            <UInput
              id="displayName"
              v-model="formData.displayName"
              class="w-40 mb-2"
              variant="outline"
            />
            <p v-if="fieldErrors.displayName" class="text-red-600 text-sm mt-1">
              {{ fieldErrors.displayName.join(', ') }}
            </p>
          </div>

          <div>
            <label for="initials" class="block text-sm mb-1 font-semibold">Initials</label>
            <p class="text-xs text-muted mb-2">
              Used for handwriting analysis on receipts to attribute payer.
            </p>
            <UInput
              id="initials"
              v-model="formData.initials"
              maxlength="5"
              class="w-20 mb-2"
              variant="outline"
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
            {{ userStore.saving ? 'Saving...' : 'Update' }}
          </UButton>
        </div>
      </form>
    </template>
  </UDashboardPanel>
</template>
