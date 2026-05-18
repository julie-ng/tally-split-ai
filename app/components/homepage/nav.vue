<script setup>
const items = [
  {
    label: 'Architecture',
    children: [
      {
        label: 'Architecture',
        description: 'Serverless Distributed architecture hosted across Vercel, Supabase, Azure, and Trigger.dev',
        icon: 'i-lucide-layers',
        to: '#architecture',
      },
      {
        label: 'LLM Pipeline',
        description: 'Orchestrator and tasks workflow to go from upload to analyzed and actioned receipt.',
        icon: 'i-lucide-workflow',
        to: '#llm-pipeline',
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
        to: '#security-authentication',
      },
      {
        label: 'Authorization',
        description: 'Resource-scoped guards on every endpoint.',
        icon: 'i-lucide-shield-check',
        to: '#security-authorization',
      },
      {
        label: 'Token Design',
        description: 'Action-scoped, signed, short-lived tokens for tasks.',
        icon: 'i-lucide-target',
        to: '#security-token-design',
      },
    ],
  },
  {
    label: 'Built with AI',
    to: '#built-with-ai',
  },
  {
    label: 'Lessons Learned',
    to: '#learnings',
  },
]
</script>

<template>
  <nav class="border-b border-default">
    <UContainer class="max-w-7xl grid grid-cols-3 items-center py-3">
      <!-- Left: logo + title -->
      <NuxtLink to="/" class="flex items-center gap-2">
        <img src="/images/lucide-scan-barcode-primary.svg" alt="" class="size-6">
        <span class="font-semibold">Tally Split AI</span>
      </NuxtLink>

      <!-- Center: nav with submenus -->
      <div class="flex justify-center">
        <UNavigationMenu :items="items" orientation="horizontal" content-orientation="vertical" />
      </div>

      <!-- Right: icon links -->
      <div class="flex items-center justify-end gap-1">
        <UButton
          to="mailto:me+tallysplit@julie.io"
          target="_blank"
          external
          icon="i-lucide-mail"
          color="neutral"
          variant="ghost"
          size="md"
          aria-label="View source on GitHub"
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
        <UButton variant="soft" to="/login" class="ml-2">
          Login
        </UButton>
      </div>
    </UContainer>
  </nav>
</template>
