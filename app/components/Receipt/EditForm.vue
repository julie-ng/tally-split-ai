<script setup>
const props = defineProps({
  receipt: Object,
  saving: Boolean,
})

const emit = defineEmits(['save', 'cancel'])

// Create reactive form state from receipt data
const formData = ref({
  merchantName: props.receipt.merchantName || '',
  merchantAddress: props.receipt.merchantAddress || '',
  merchantPhone: props.receipt.merchantPhone || '',
  receiptDate: props.receipt.receiptDate || '',
  receiptTags: props.receipt.receiptTags || '',
  receiptSubtotal: props.receipt.receiptSubtotal,
  receiptTax: props.receipt.receiptTax,
  receiptTotal: props.receipt.receiptTotal,
  receiptCurrency: props.receipt.receiptCurrency || 'EUR',
  notes: props.receipt.notes || '',
  isAnalyzed: props.receipt.isAnalyzed || false,
})

const handleSubmit = () => {
  // Convert empty strings to null for optional fields
  const cleanedData = {
    merchantName: formData.value.merchantName || null,
    merchantAddress: formData.value.merchantAddress || null,
    merchantPhone: formData.value.merchantPhone || null,
    receiptDate: formData.value.receiptDate || null,
    receiptTags: formData.value.receiptTags || null,
    receiptSubtotal: formData.value.receiptSubtotal,
    receiptTax: formData.value.receiptTax,
    receiptTotal: formData.value.receiptTotal,
    receiptCurrency: formData.value.receiptCurrency || null,
    notes: formData.value.notes || null,
    isAnalyzed: formData.value.isAnalyzed,
  }

  emit('save', cleanedData)
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
            <UFormGroup label="Merchant Name" name="merchantName">
              <UInput
                v-model="formData.merchantName"
                placeholder="e.g., Café Central"
              />
            </UFormGroup>

            <UFormGroup label="Merchant Address" name="merchantAddress">
              <UTextarea
                v-model="formData.merchantAddress"
                placeholder="e.g., Hauptstraße 1, 10115 Berlin"
                :rows="3"
              />
            </UFormGroup>

            <UFormGroup label="Merchant Phone" name="merchantPhone">
              <UInput
                v-model="formData.merchantPhone"
                placeholder="e.g., +49 30 12345678"
              />
            </UFormGroup>
          </div>
        </div>

        <hr class="border-slate-200">

        <!-- Transaction Details Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Transaction Details
          </h2>
          <div class="space-y-4">
            <UFormGroup label="Receipt Date" name="receiptDate">
              <UInput
                v-model="formData.receiptDate"
                type="date"
              />
            </UFormGroup>

            <UFormGroup
              label="Tags"
              name="receiptTags"
              help="Comma-separated tags (e.g., tip, business, dinner)"
            >
              <UInput
                v-model="formData.receiptTags"
                placeholder="e.g., tip, business"
              />
            </UFormGroup>

            <UFormGroup label="Analysis Status" name="isAnalyzed">
              <div class="flex items-center gap-2">
                <UCheckbox
                  v-model="formData.isAnalyzed"
                  label="Analyzed"
                />
              </div>
            </UFormGroup>
          </div>
        </div>

        <hr class="border-slate-200">

        <!-- Financial Details Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Financial Details
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Subtotal" name="receiptSubtotal">
              <UInput
                v-model.number="formData.receiptSubtotal"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </UFormGroup>

            <UFormGroup label="Tax" name="receiptTax">
              <UInput
                v-model.number="formData.receiptTax"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </UFormGroup>

            <UFormGroup label="Total" name="receiptTotal">
              <UInput
                v-model.number="formData.receiptTotal"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </UFormGroup>

            <UFormGroup label="Currency" name="receiptCurrency">
              <UInput
                v-model="formData.receiptCurrency"
                placeholder="EUR"
              />
            </UFormGroup>
          </div>
        </div>

        <hr class="border-slate-200">

        <!-- Notes Section -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-slate-800">
            Notes
          </h2>
          <UFormGroup label="Notes" name="notes">
            <UTextarea
              v-model="formData.notes"
              placeholder="Add any additional notes about this receipt..."
              :rows="4"
            />
          </UFormGroup>
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
