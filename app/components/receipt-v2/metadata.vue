<script setup>
defineProps({
  receipt: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-y-1 text-sm text-slate-600">
    <div>Receipt ID</div>
    <div>#{{ receipt.id }}</div>

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

    <template v-if="receipt.receiptTags">
      <div>Tags</div>
      <div>
        <receipt-v2-tags :tags="receipt.receiptTags" color="neutral" />
      </div>
    </template>
  </div>
</template>
