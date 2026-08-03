<script setup>
const props = defineProps({
  label: {
    type: String,
  },
  labelClass: {
    type: String,
    default: '',
  },
  valueClass: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <!-- IMPORTANT
       - `shrink-0` on the term and `min-w-0` on the value are load-bearing, not
         cosmetic. A flex item defaults to `min-width: auto` ("never narrower
         than my content"), so without them a long unbroken value squeezes the
         label and then overflows its own box instead of wrapping. -->
  <div class="flex justify-between gap-3">
    <dt class="shrink-0" :class="labelClass">
      {{ props.label }}
    </dt>
    <dd class="min-w-0 text-right" :class="valueClass">
      <slot />
    </dd>
  </div>
</template>
