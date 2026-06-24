<script setup>
defineProps({
  receipt: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-y-1 text-sm text-toned">
    <div>Receipt ID</div>
    <div>{{ receipt.id }}</div>

    <!-- Created At -->
    <template v-if="receipt.createdAt">
      <div>Created At</div>
      <div>
        <time :datetime="receipt.createdAt" :title="receipt.createdAt">
          {{ timestampUtils.toShortDatetime(receipt.createdAt) }}
        </time>
      </div>
    </template>

    <!-- Updated At -->
    <template v-if="receipt.updatedAt">
      <div>Updated At</div>
      <div>
        <time :datetime="receipt.updatedAt" :title="receipt.updatedAt">
          {{ timestampUtils.toShortDatetime(receipt.updatedAt) }}
        </time>
      </div>
    </template>
  </div>
</template>
