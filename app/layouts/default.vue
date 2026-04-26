<script setup lang="ts">
import { useUserStore } from '~/stores/user.store'

const store = useUserStore()
// const userFullName = store.fullName
const displayName = store.displayName

const route = useRoute()
const open = ref(true)

function isActive (path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const splitMonths = [
  {
    label: 'April 2026',
    to: '/splits/2026/04/',
  },
  {
    label: 'March 2026',
    to: '/splits/2026/03/',
  },
  {
    label: 'February 2026',
    to: '/splits/2026/02/',
  },
  {
    label: 'January 2026',
    to: '/splits/2026/01/',
  },
  {
    label: 'December 2025',
    to: '/splits/2025/12/',
  },
  {
    label: 'November 2025',
    to: '/splits/2025/11/',
  },
  {
    label: 'October 2025',
    to: '/splits/2025/10/',
  },
  {
    label: 'September 2025',
    to: '/splits/2025/09/',
  },
]

function getLinks (state: 'collapsed' | 'expanded') {
  const expanded = state === 'expanded'
  return [
    [
      {
        label: 'Receipts',
        icon: 'i-lucide-receipt-euro',
        to: '/receipts',
        active: isActive('/receipts'),
        children: expanded
          ? [
              { label: 'Inbox', to: '/receipts/inbox', icon: 'i-lucide-inbox' },
            ]
          : [],
      },
      {
        label: 'Splits',
        icon: 'i-lucide-coins',
        to: '/splits',
        active: isActive('/splits'),
        defaultOpen: true,
        children: expanded ? splitMonths : [],
      },
      {
        label: 'Uploads',
        icon: 'i-lucide-upload-cloud',
        to: '/uploads',
        active: isActive('/uploads'),
      },
    ],
    [
      {
        label: 'JSON APIs',
        icon: 'i-lucide-braces',
        defaultOpen: false,
        active: false,
        children: expanded
          ? [
              { label: 'blobs/', to: '/api/blobs/', external: true, target: '_blank' },
              { label: 'receipts/', to: '/api/receipts/', external: true, target: '_blank' },
              { label: 'receipts/[id]', to: '/api/receipts/1', external: true, target: '_blank' },
              { label: 'tokens/read', to: '/api/tokens/read', external: true, target: '_blank' },
              { label: 'tokens/upload', to: '/api/tokens/upload', external: true, target: '_blank' },
              { label: 'uploads/', to: '/api/uploads/', external: true, target: '_blank' },
              { label: 'uploads/[hashId]', to: '/api/uploads/7aaaa195168e', external: true, target: '_blank' },
            ]
          : [],
      },
    ],
  ]
}
</script>

<template>
  <div class="flex flex-1">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      :ui="{
        inner: 'bg-elevated/25',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full overflow-hidden">
          <UButton
            to="/"
            icon="i-lucide-scan-barcode"
            label="TallySplit AI"
            color="neutral"
            variant="ghost"
            square
            class="overflow-hidden"
            :ui="{ leadingIcon: 'text-blue-600' }"
          />
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Toggle sidebar"
            class="shrink-0"
            @click="open = !open"
          />
        </div>
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :items="getLinks(state)"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden' }"
        />
      </template>

      <template #footer>
        <UButton
          icon="i-lucide-user-round"
          :label="displayName"
          color="neutral"
          variant="ghost"
          square
          class="w-full overflow-hidden"
        />
      </template>
    </USidebar>

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-auto">
        <slot />
      </div>

      <div v-if="$slots['panel-footer']" class="py-1 bg-slate-100 border-0">
        <slot name="panel-footer" />
      </div>
    </div>
  </div>
</template>
