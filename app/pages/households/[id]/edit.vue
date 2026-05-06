<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const route = useRoute()
const router = useRouter()
const householdStore = useHouseholdStore()
const toast = useToast()

useHead({
  title: 'Edit Household',
})

// AuthZ: only allow editing the user's own household. Other ids 404 at API.
if (route.params.id !== householdStore.id) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

// Snapshot for form editing — see user.store.js JSDoc.
const formData = ref({
  name: householdStore.name ?? '',
  description: householdStore.description ?? '',
  customInstructions: householdStore.customInstructions ?? '',
})

const fieldErrors = ref({})
const submitting = ref(false)

async function handleSubmit () {
  fieldErrors.value = {}
  submitting.value = true
  try {
    await householdStore.update({
      name: formData.value.name,
      description: formData.value.description,
      customInstructions: formData.value.customInstructions,
    })
    toast.add({
      title: 'Household updated',
      color: 'success',
      icon: 'i-lucide-check',
    })
    router.push(`/households/${householdStore.id}`)
  }
  catch (err) {
    if (err?.data?.errors) {
      fieldErrors.value = err.data.errors
    }
    else {
      toast.add({
        title: 'Update failed',
        description: err?.data?.message ?? err?.message ?? 'Something went wrong',
        color: 'error',
        icon: 'i-lucide-alert-triangle',
      })
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Edit Household">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'Households', to: `/households/${householdStore.id}`, class: 'font-semibold text-default' },
              { label: householdStore.name ?? '...', to: `/households/${householdStore.id}` },
              { label: 'Edit' },
            ]"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <form @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-4 max-w-2xl">
          <div>
            <h1 class="text-2xl mb-4 font-bold">
              Edit Household
            </h1>
            <label for="name" class="block text-sm font-semibold mb-1">Name</label>
            <UInput
              id="name"
              v-model="formData.name"
              class="w-80"
              variant="outline"
            />
            <p v-if="fieldErrors.name" class="text-red-600 text-sm mt-1">
              {{ fieldErrors.name.join(', ') }}
            </p>
          </div>

          <div>
            <label for="description" class="block text-sm font-semibold mb-1">Description</label>
            <UTextarea
              id="description"
              v-model="formData.description"
              class="w-full max-w-xl"
              :rows="3"
              variant="outline"
            />
            <p v-if="fieldErrors.description" class="text-red-600 text-sm mt-1">
              {{ fieldErrors.description.join(', ') }}
            </p>
          </div>

          <div>
            <label for="customInstructions" class="block text-sm font-semibold mb-1">
              Custom AI Instructions
              <span class="text-slate-400 font-normal">(optional)</span>
            </label>
            <p class="text-sm text-slate-500 mb-2">
              Free-text guidance appended to the AI prompt when analyzing receipts. Example: "When initials are unclear, JN's credit card ends in 1234." or "Chocolate items are always JN's."
            </p>
            <UAlert
              icon="i-lucide-shield-alert"
              color="warning"
              variant="subtle"
              title="This text is sent to a third-party LLM"
              description="Anything you write here leaves the app and is included in every AI receipt analysis. Avoid sensitive data."
              class="mb-3 max-w-xl"
            />
            <UTextarea
              id="customInstructions"
              v-model="formData.customInstructions"
              class="w-full max-w-xl"
              :rows="6"
              :maxlength="2000"
              variant="outline"
              placeholder="Optional guidance for the AI..."
            />
            <div class="flex justify-between max-w-xl mt-1">
              <p v-if="fieldErrors.customInstructions" class="text-red-600 text-sm">
                {{ fieldErrors.customInstructions.join(', ') }}
              </p>
              <p v-else class="text-slate-400 text-sm ml-auto">
                {{ formData.customInstructions?.length ?? 0 }} / 2000
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-2">
          <UButton
            type="submit"
            color="info"
            size="lg"
            class="cursor-pointer"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ submitting ? 'Saving...' : 'Save Changes' }}
          </UButton>
          <UButton
            :to="`/households/${householdStore.id}`"
            color="neutral"
            variant="ghost"
            size="lg"
          >
            Cancel
          </UButton>
        </div>
      </form>
    </template>
  </UDashboardPanel>
</template>
