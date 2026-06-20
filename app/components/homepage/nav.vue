<script setup>
const items = [
  {
    label: 'Architecture',
    children: [
      {
        label: 'Architecture',
        description: 'Serverless Distributed architecture hosted across Vercel, Supabase, Azure, and Trigger.dev',
        icon: 'i-lucide-layers',
        to: '/#architecture',
        exactHash: true,
      },
      {
        label: 'LLM Pipeline',
        description: 'Orchestrator and tasks workflow to go from upload to analyzed and actioned receipt.',
        icon: 'i-lucide-workflow',
        to: '/#llm-pipeline',
        exactHash: true,
      },
    ],
  },
  {
    label: 'Security Model',
    children: [
      {
        label: 'Authentication',
        description: 'Two principal types — sessions for humans, HMAC for tasks.',
        icon: 'i-lucide-key-round',
        to: '/#security-authentication',
        exactHash: true,
      },
      {
        label: 'Authorization',
        description: 'Resource-scoped guards on every endpoint.',
        icon: 'i-lucide-shield-check',
        to: '/#security-authorization',
        exactHash: true,
      },
      {
        label: 'Token Design',
        description: 'Action-scoped, signed, short-lived tokens for tasks.',
        icon: 'i-lucide-target',
        to: '/#security-token-design',
        exactHash: true,
      },
    ],
  },
  {
    label: 'Built with AI',
    to: '/#built-with-ai',
    exactHash: true,
  },
  {
    label: 'Lessons Learned',
    to: '/#lessons-learned',
    exactHash: true,
  },
]
</script>

<template>
  <UHeader mode="modal" :ui="{ container: 'max-w-7xl' }">
    <template #title>
      <span class="flex items-center gap-2">
        <img src="/images/lucide-scan-barcode-primary.svg" alt="" class="size-6">
        <span class="font-semibold">Tally Split AI</span>
      </span>
    </template>

    <UNavigationMenu
      :items="items"
      color="neutral"
      content-orientation="vertical"
      variant="link"
    />

    <template #right>
      <UButton
        to="mailto:me+tallysplit@julie.io"
        target="_blank"
        external
        icon="i-lucide-mail"
        color="neutral"
        variant="ghost"
        size="md"
        aria-label="Send email"
      />
      <UButton
        to="https://github.com/julie-ng/tally-split-ai"
        target="_blank"
        external
        icon="i-simple-icons-github"
        color="neutral"
        variant="ghost"
        size="md"
        aria-label="View source on GitHub"
      />
      <UColorModeButton />
      <UButton variant="soft" to="/login" class="ml-2">
        Login
      </UButton>
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        color="neutral"
        orientation="vertical"
        variant="link"
        class="-mx-2.5"
      />
      <USeparator class="my-4" />
      <div class="flex flex-col gap-2">
        <UButton
          to="/login"
          variant="soft"
          block
        >
          Login
        </UButton>
        <div class="flex items-center gap-1">
          <UButton
            to="mailto:me+tallysplit@julie.io"
            target="_blank"
            external
            icon="i-lucide-mail"
            color="neutral"
            variant="ghost"
            size="md"
            aria-label="Send email"
          />
          <UButton
            to="https://github.com/julie-ng/tally-split-ai"
            target="_blank"
            external
            icon="i-simple-icons-github"
            color="neutral"
            variant="ghost"
            size="md"
            aria-label="View source on GitHub"
          />
          <UColorModeButton />
        </div>
      </div>
    </template>
  </UHeader>
</template>
