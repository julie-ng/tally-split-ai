<script setup>
defineProps({
  items: {
    type: Object, // See other Components
    required: true,
  },
})
</script>

<template>
  <div>
    items
    <!-- <ReceiptItemsTable></ReceiptItemsTable> -->
  </div>
</template>
