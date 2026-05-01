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
  <UContainer class="my-5 content">
    <h1 class="font-bold text-3xl mb-6">
      Edit Household
    </h1>

    <form @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-4 max-w-2xl">
        <div>
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
  </UContainer>
</template>
