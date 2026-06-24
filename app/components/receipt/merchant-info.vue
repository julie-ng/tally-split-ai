<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: false,
    default: '',
  },
  phone: {
    type: String,
    required: false,
    default: '',
  },
  relaxedLineHeight: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const textSize = computed(() => props.relaxedLineHeight ? 'text-sm/relaxed' : 'text-sm')

// Split the address into lines for display: break before a German postal code
// (single comma, space, then 5 digits). Returned as an array so the template
// renders each line as escaped text — never raw HTML.
const addressLines = computed(() => {
  if (!props.address) return []
  // Insert a delimiter before the postal code, then split on it.
  return props.address.replace(/, (\d{5})/, '\n$1').split('\n')
})
</script>

<template>
  <div :class="textSize">
    <h1 class="text-muted font-medium">
      {{ name }}
    </h1>
    <p v-if="address" class="text-muted">
      <template v-for="(line, i) in addressLines" :key="i">
        <br v-if="i > 0">{{ line }}
      </template>
    </p>
    <p v-if="phone" class="text-muted">
      {{ phone }}
    </p>
  </div>
</template>
