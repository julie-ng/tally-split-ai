<script setup>
defineProps({
  receipt: Object,
})
</script>

<template>
  <section>
    <h1 class="text-base my-2 font-semibold text-primary">
      Notes
    </h1>
    <div class="text-sm">
      <div v-if="receipt.notes" class="mt-2 p-3 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap">
        {{ receipt.notes }}
      </div>
      <p v-else class="text-slate-400">
        This receipt has no notes.
      </p>
    </div>
  </section>
</template>
