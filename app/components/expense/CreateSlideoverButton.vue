<script setup>
defineProps({
  label: {
    type: String,
    default: 'New expense',
  },
  variant: {
    type: String,
    default: 'solid',
  },
  color: {
    type: String,
    default: 'primary',
  },
})

const emit = defineEmits(['created'])

const showModal = ref(false)

// Shared id binding the footer's submit button to the form (native HTML
// <button type="submit" :form="id">). The ref only reads the form's exposed
// saving/canSubmit state for the footer button's loading/disabled.
const FORM_ID = 'expense-create-form'
const form = useTemplateRef('form')

function onCreated (expense) {
  showModal.value = false
  emit('created', expense)
}
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-plus"
      class="cursor-pointer"
      :variant="variant"
      :color="color"
      @click="showModal = true"
    >
      {{ label }}
    </UButton>

    <USlideover
      v-model:open="showModal"
      title="New expense"
      inset
      :ui="{
        // content is rounded (via `inset`) but has no overflow clip by default,
        // so a child with a background (the footer) paints over the rounded
        // corners. overflow-hidden clips all children to the rounded shape.
        content: 'max-w-lg ring-1 ring-default overflow-hidden',
        // header: 'bg-muted dark:bg-default',
        // body: 'bg-muted dark:bg-default',
        // footer: 'bg-elevated/50 dark:dark:bg-default',
      }"
    >
      <template #body>
        <ExpenseCreateForm
          ref="form"
          :form-id="FORM_ID"
          @created="onCreated"
          @cancel="showModal = false"
        />
      </template>

      <template #footer="{ close }">
        <div class="flex items-center gap-2 w-full">
          <UButton
            type="submit"
            :form="FORM_ID"
            label="Create expense"
            color="primary"
            :loading="form?.saving"
            :disabled="!form?.canSubmit"
          />
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="form?.saving"
            @click="close"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>
