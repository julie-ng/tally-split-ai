<script setup>
const props = defineProps({
  receipt: Object,
  saving: Boolean,
})

const emit = defineEmits(['save', 'cancel'])

// Store original values for comparison
const original = { ...props.receipt }

// Create reactive form state from receipt data
const formData = ref({ ...props.receipt })

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
  <div class="max-w-4xl">
    <UForm @submit="handleSubmit">
      <div class="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <!-- Merchant Information Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Merchant Information
          </h2>
          <div class="space-y-4">
            <label label="Merchant Name" name="merchantName">
              <UInput
                v-model="formData.merchantName"
                placeholder="e.g., Café Central"
              />
            </label>

            <label label="Merchant Address" name="merchantAddress">
              <UTextarea
                v-model="formData.merchantAddress"
                placeholder="e.g., Hauptstraße 1, 10115 Berlin"
                :rows="3"
              />
            </label>

            <label label="Merchant Phone" name="merchantPhone">
              <UInput
                v-model="formData.merchantPhone"
                placeholder="e.g., +49 30 12345678"
              />
            </label>
          </div>
        </div>

        <hr class="border-slate-200">

        <!-- Transaction Details Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Transaction Details
          </h2>
          <div class="space-y-4">
            <label label="Receipt Date" name="receiptDate">
              <UInput
                v-model="formData.receiptDate"
                type="date"
              />
            </label>

            <label
              label="Tags"
              name="receiptTags"
              help="Comma-separated tags (e.g., tip, business, dinner)"
            >
              <UInput
                v-model="formData.receiptTags"
                placeholder="e.g., tip, business"
              />
            </label>

            <label label="Analysis Status" name="isAnalyzed">
              <div class="flex items-center gap-2">
                <UCheckbox
                  v-model="formData.isAnalyzed"
                  label="Analyzed"
                />
              </div>
            </label>
          </div>
        </div>

        <hr class="border-slate-200">

        <!-- Financial Details Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Financial Details
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <label label="Subtotal" name="receiptSubtotal">
              <UInput
                v-model.number="formData.receiptSubtotal"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </label>

            <label label="Tax" name="receiptTax">
              <UInput
                v-model.number="formData.receiptTax"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </label>

            <label label="Total" name="receiptTotal">
              <UInput
                v-model.number="formData.receiptTotal"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </label>

            <label label="Currency" name="receiptCurrency">
              <UInput
                v-model="formData.receiptCurrency"
                placeholder="EUR"
              />
            </label>
          </div>
        </div>

        <hr class="border-slate-200">

        <!-- Notes Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Notes
          </h2>
          <label label="Notes" name="notes">
            <UTextarea
              v-model="formData.notes"
              placeholder="Add any additional notes about this receipt..."
              :rows="4"
            />
          </label>
        </div>

        <!-- Form Actions -->
        <div class="flex gap-3 pt-4">
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            :disabled="saving"
            @click="handleCancel"
          >
            Cancel
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>
