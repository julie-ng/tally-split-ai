<script setup>
const props = defineProps({
  receipt: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'cancel'])

// Store original values for comparison
const original = { ...props.receipt }

// Create reactive form state from receipt data
const formData = ref({ ...props.receipt })

// This form is only for receipt
delete formData.value.uploads

const handleSubmit = () => {
  // Only include fields that actually changed
  const changes = {}
  for (const key in formData.value) {
    if (formData.value[key] !== original[key]) {
      // Convert empty strings to null
      changes[key] = formData.value[key] || null
    }
  }
  emit('save', changes)
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <div>
    <form @submit.prevent="handleSubmit">
      <!-- Receipt Title -->
      <!-- <h1 class="text-lg mb-4 font-semibold">
        Receipt
      </h1> -->
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label for="title">
            Title
          </label>
        </div>
        <div class="col-span-2">
          <UInput id="title" v-model="formData.title" class="w-80" />
        </div>

        <!-- Receipt Date -->
        <div>
          <label for="date">
            Date
          </label>
        </div>
        <div class="col-span-2">
          <UInput
            id="date"
            v-model="formData.date"
            type="date"
            class="w-80"
          />
        </div>

        <!-- Receipt Tags -->
        <div>
          <label for="tags">
            Tags (comma separated)
          </label>
        </div>
        <div class="col-span-2">
          <UInput id="tags" v-model="formData.tags" class="w-80" />
        </div>
      </div>

      <hr class="my-4 border-slate-200">

      <!-- Totals -->
      <section>
        <!-- <h1 class="text-lg mb-4 font-semibold">
          Totals
        </h1> -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label for="subtotal">
              Subtotal <span class="text-slate-400">(EUR)</span>
            </label>
          </div>
          <div class="col-span-2">
            <UInput
              id="subtotal"
              v-model="formData.subtotal"
              type="number"
              class="w-80"
            />
          </div>
          <div>
            <label for="tax">
              Tax <span class="text-slate-400">(EUR)</span>
            </label>
          </div>
          <div class="col-span-2">
            <UInput
              id="tax"
              v-model="formData.tax"
              type="number"
              class="w-80"
            />
          </div>
          <div>
            <label for="total">
              Total <span class="text-slate-400">(EUR)</span>
            </label>
          </div>
          <div class="col-span-2">
            <UInput
              id="total"
              v-model="formData.total"
              type="number"
              class="w-80"
            />
          </div>
        </div>
      </section>

      <hr class="my-4 border-slate-200">

      <!-- Notes -->
      <section>
        <!-- <h1 class="text-lg mb-4 font-semibold">
          Notes
        </h1> -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label for="notes">
              Notes
            </label>
          </div>
          <div class="col-span-2">
            <UTextarea
              id="notes"
              v-model="formData.notes"
              placeholder="Add any additional notes about this receipt..."
              :rows="6"
              class="w-80"
            />
          </div>
        </div>
      </section>

      <hr class="my-4 border-slate-200">

      <!-- Merchant -->
      <section>
        <!-- <h1 class="text-lg mb-3 font-semibold">
          Merchant
        </h1> -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label for="merchantName">
              Merchant Name
            </label>
          </div>
          <div class="col-span-2">
            <UInput id="merchantName" v-model="formData.merchantName" class="w-80" />
          </div>
          <div>
            <label for="merchantAddress">
              Merchant Address
            </label>
          </div>
          <div class="col-span-2">
            <UTextarea id="merchantAddress" v-model="formData.merchantAddress" class="w-80" />
          </div>
          <div>
            <label for="merchantPhone">
              Merchant Phone
            </label>
          </div>
          <div class="col-span-2">
            <UInput id="merchantPhone" v-model="formData.merchantPhone" class="w-80" />
          </div>
        </div>
      </section>

      <hr class="my-4 border-slate-200">

      <!-- Form Actions -->
      <div class="mt-6">
        <UButton
          type="submit"
          color="info"
          size="lg"
          class="mr-2 cursor-pointer"
          :loading="saving"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </UButton>
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          size="lg"
          class="cursor-pointer"
          :disabled="saving"
          @click="handleCancel"
        >
          Cancel
        </UButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
label {
  display: block;
  font-size: var(--text-sm);
}
</style>
