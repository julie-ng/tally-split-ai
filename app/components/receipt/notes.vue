<script setup>
defineProps({
  receipt: Object,
})
</script>

<template>
  <section>
    <h1 class="text-base my-2 font-semibold">
      Notes
    </h1>
    <div class="text-sm">
      <div v-if="receipt.notes" class="mt-2 p-3 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap">
        {{ receipt.notes }}
      </div>
      <p v-else class="text-slate-400">
        This receipt has no notes.
      </p>
      <div class="my-3">
        <NuxtLink :to="`/receipts/${receipt.id}/edit`">
          <UButton
            icon="i-lucide-pencil"
            color="info"
            variant="outline"
            class="hover:cursor-pointer"
          >
            Edit Receipt
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
