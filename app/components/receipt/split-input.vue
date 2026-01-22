<script setup>
const model = defineModel({
  required: true,
  type: [Number, null],
})
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  inputName: {
    type: String,
    required: true,
  },
  inputWidth: {
    type: String,
    required: false,
    default: 'w-24',
  },
  sumsUp: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const inputBaseClass = computed(function () {
  return (props.sumsUp)
    ? 'text-right'
    : 'text-right border border-orange-400 rounded-md ring-0'
})
</script>

<template>
  <section class="flex justify-between items-center my-2 text-sm">
    <div class="font-medium">
      {{ label }}
    </div>
    <div class="text-right">
      <!-- <ui-saved-inline-alert /> -->
      <div v-if="$slots.warning" class="inline-block mr-2 font-normal text-orange-500">
        <slot name="warning" />
      </div>

      <UInput
        v-model="model"
        :name="inputName"
        :class="inputWidth"
        trailing-icon="i-lucide-euro"
        :ui="{ base: inputBaseClass, trailingIcon: 'size-4 text-slate-400' }"
      />
    </div>
  </section>
</template>
