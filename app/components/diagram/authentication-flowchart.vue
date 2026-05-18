<script setup>
import authNDiagram from '~~/docs/diagrams/auth-n.flowchart.mmd?raw'
</script>

<template>
  <UModal
    title="Authentication Flowchart"
    description="Humans authenticate via signed, httpOnly session cookies. Agentic tasks authenticate via action-scoped HMAC tokens."
    :ui="{ content: 'max-w-4xl' }"
    scrollable
  >
    <UButton
      label="View Authenication (AuthN) Flowchart"
      color="primary"
      variant="solid"
      icon="i-lucide-zoom-in"
      class="hover:cursor-pointer px-4 py-3"
    />

    <template #body>
      <UiMermaid :code="authNDiagram" />
    </template>
  </UModal>
</template>
