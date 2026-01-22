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
  highlightOnSuccess: {
    type: Boolean,
    required: false,
    default: false,
  },
})

// console.log('highlightOnSuccess?', props.highlightOnSuccess, 'sums up?', props.sumsUp)

const inputBaseClass = computed(function () {
  const showBorder = (!props.sumsUp || (props.sumsUp && props.highlightOnSuccess))
  let borderColor = ''

  if (props.highlightOnSuccess && props.sumsUp) {
    borderColor = 'border-emerald-500'
  }

  if (!props.sumsUp) {
    borderColor = 'border-orange-500'
  }

  const result = showBorder
    ? `text-right border ${borderColor} rounded-md ring-0`
    : 'text-right'

  // console.log('result', result)
  return result
})
</script>

<template>
  <section class="flex justify-between items-center my-2 text-sm">
    <div class="font-medium">
      {{ label }}
    </div>
    <div class="text-right">
      <!-- <ui-saved-inline-alert /> -->
      <div v-if="$slots.success" class="inline-block mr-2 font-normal text-emerald-500">
        <slot name="success" />
      </div>
      <div v-if="$slots.warn" class="inline-block mr-2 font-normal text-orange-500">
        <slot name="warn" />
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
