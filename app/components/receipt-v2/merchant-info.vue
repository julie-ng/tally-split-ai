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
})

// Format address: if it has a single comma followed by space and 5 digits (postal code),
// replace ", " with a line break
const formattedAddress = computed(() => {
  if (!props.address) return ''
  // Match: single comma, space, then 5 digits (German postal code pattern)
  return props.address.replace(/, (\d{5})/, '<br>$1')
})
</script>

<template>
  <div class="text-sm">
    <h1 class="text-slate-800">
      {{ name }}
    </h1>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-if="address" class="text-slate-500" v-html="formattedAddress" />
    <p v-if="phone" class="text-slate-500">
      {{ phone }}
    </p>
  </div>
</template>
