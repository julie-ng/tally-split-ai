<script setup>
const props = defineProps({
  merchant: Object,
})

const address = computed(() => props.merchant.address)
// const phone = computed(() => props.merchant.phone)
</script>

<template>
  <div class="text-sm">
    <h1 class="text-slate-800">
      {{ props.merchant.name.value }}
    </h1>
    <p v-if="address.value" class="my-1">
      {{ address.value.road }} {{ address.value.houseNumber }}<br>
      {{ address.value.postalCode }} {{ address.value.city }}
    </p>
  <!-- Hide Phone for now  -->
  <!--
  <p v-if="phone.value" class="my-1">
    {{ phone.value }}
  </p>
  -->
  </div>
</template>
