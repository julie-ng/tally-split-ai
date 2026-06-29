<script setup>
/**
 * Reusable confirmation modal for destructive / irreversible actions.
 *
 * Designed to be opened programmatically via useOverlay():
 *   const modal = overlay.create(ConfirmModal)
 *   const { result } = modal.open({ title, description })
 *   if (await result) { ...confirmed... }
 *
 * Resolves the open() result via emit('close', true|false).
 */
defineProps({
  title: {
    type: String,
    default: 'Are you sure?',
  },
  description: {
    type: String,
    default: '',
  },
  /**
   * Optional list of items the action affects, rendered as a list in the body.
   *
   * GENERIC, DOMAIN-AGNOSTIC SHAPE — callers must map their own data to it
   * (and pre-format any dates/amounts to strings):
   *   { label: string, caption?: string, trailing?: string }
   *     - label    → primary text, left (e.g. an expense title)
   *     - caption  → secondary text after the label (e.g. a date)
   *     - trailing → right-aligned text (e.g. a formatted amount)
   */
  items: {
    type: Array,
    default: () => [],
  },
  confirmLabel: {
    type: String,
    default: 'Confirm',
  },
  cancelLabel: {
    type: String,
    default: 'Cancel',
  },
  confirmColor: {
    type: String,
    default: 'error',
  },
  confirmIcon: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <UModal
    :title="title"
    :description="items.length ? undefined : description"
    :dismissible="false"
  >
    <template v-if="items.length" #body>
      <p v-if="description" class="mb-4">
        {{ description }}
      </p>
      <ul class="text-sm ml-4">
        <li
          v-for="(item, index) in items"
          :key="index"
          class="list-disc mb-1.5"
        >
          <span class="font-medium">{{ item.label }} </span>,
          <span v-if="item.caption" class="text-dimmed">{{ item.caption }},</span>
          <span v-if="item.trailing" class="text-dimmed">({{ item.trailing }})</span>
        </li>
      </ul>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="outline"
          :label="cancelLabel"
          class="cursor-pointer"
          @click="emit('close', false)"
        />
        <UButton
          variant="solid"
          :color="confirmColor"
          :icon="confirmIcon"
          :label="confirmLabel"
          class="cursor-pointer"
          @click="emit('close', true)"
        />
      </div>
    </template>
  </UModal>
</template>
