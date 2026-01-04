<script setup lang="ts">
// import type { NavigationMenuItem } from '@nuxt/ui'

import { useUserStore } from '~/stores/user.store'
const store = useUserStore()
const userFullName = store.fullName
const userId = store.userId

const route = useRoute()
// const toast = useToast()

const open = ref(false)
const links = [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
    onSelect: () => {
      open.value = false
    }
  },
  {
    label: 'Blobs',
    icon: 'i-lucide-blocks',
    to: '/blobs',
    onSelect: () => {
      open.value = false
    },
  },
  {
    label: 'Uploads',
    icon: 'i-lucide-upload-cloud',
    to: '/uploads',
    onSelect: () => {
      open.value = false
    },
  }
]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-elevated/25"
      :ui="{ header: 'lg:border-b lg:border-default', footer: 'lg:border-t lg:border-default' }">

      <!-- Header -->
      <template #header="{ collapsed }">
        <NuxtLink class="flex items-center px-2.5 text-base" to="/">
          <UIcon name="i-lucide-scan-barcode" class="size-6  bg-blue-600" />
          <div class="px-2 font-semibold text-slate-800">
            Receipts AI
          </div>
        </NuxtLink>
      </template>

      <!-- Navigation Menu -->
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" tooltip popover />
      </template>

      <!-- User Icon -->
      <template #footer="{ collapsed }">
        <div class="flex items-center px-2.5 py-1">
          <div class="inline-flex p-1 items-center justify-center rounded-full bg-slate-200">
            <UIcon name="i-lucide-user-round" class="size-4 text-slate-400 bg-slate-500" />
          </div>
          <div class="pl-2 text-sm text-slate-500">
            {{ userId }}
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />

    <!-- <NotificationsSlideover /> -->
  </UDashboardGroup>
</template>
