<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()
</script>

<template>
  <section class="mb-6 mt-4 max-w-2xl">
    <h2 class="font-semibold text-lg mb-1">
      AI Expense Analysis
    </h2>
    <div class="flex items-center gap-2 text-sm">
      <UIcon
        :name="householdStore.llmConsent ? 'i-lucide-circle-check' : 'i-lucide-circle-minus'"
        :class="householdStore.llmConsent ? 'text-success' : 'text-dimmed'"
        class="size-4 shrink-0"
      />
      <span v-if="householdStore.llmConsent" class="text-toned">
        Enabled — member names &amp; initials may be sent to the LLM to analyze and adjust expense splits.
      </span>
      <span v-else class="text-dimmed">
        Disabled — receipts are processed with OCR only; no household identity is sent to the LLM.
      </span>
    </div>
  </section>
</template>
