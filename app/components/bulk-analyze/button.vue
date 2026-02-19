<script setup>
const open = ref(false)

function openModal () {
  open.value = true
}
</script>

<template>
  <div class="inline-block">
    <UButton
      color="neutral"
      variant="subtle"
      class="mr-2 cursor-pointer"
      icon="i-lucide-zap"
      @click="openModal()"
    >
      Bulk Analyze
    </UButton>

    <!--
    <h1>Modal: {{ isAnalyzedModalOpen }}</h1>
    <UButton
      color="info"
      variant="outline"
      class="cursor-pointer"
      @click="toggleAnalyzedModal()"
    >
      Bulk Analyze
    </UButton>

    -->
    <bulk-analyze-slideover v-model:open="open" />
  </div>
</template>
