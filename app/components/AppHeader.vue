<script setup>
import { useUserStore } from '~/stores/user.store'
const store = useUserStore()
const userFullName = store.fullName
const userId = store.userId

const links = [
  {
    text: 'Blobs',
    href: '/blobs'
  },
  {
    text: 'Uploads',
    href: '/uploads'
  }
]
</script>

<template>
<div style="background:var(--jng-primary-color);">
  <UContainer class="py-3">
    <header class="flex items-center">
      <div class="flex-1">
        <NuxtLink to="/" class="font-bold text-l text-white hover:text-emerald-300">
          <img src="/images/logo-dark.svg" alt="Logo" class="mr-2">
          AI Receipts POC
        </NuxtLink>
        <ul class="inline-block ml-5">
          <li v-for="link, i in links" :key="i" class="inline-block mx-3">
            <NuxtLink :to="link.href" class="text-slate-200 hover:text-emerald-300">
              {{ link.text }}
            </NuxtLink>
          </li>
          <li class="inline-block">
            <UButton
              icon="i-lucide-upload"
              size="sm"
              color="primary"
              variant="solid"
              class="cursor-pointer bg-blue-500"
              to="/uploads/new"
            >
              Upload
            </UButton>
          </li>
        </ul>
      </div>
      <div class="text-white text-right">
        Hello {{ userFullName }} ({{ userId }})
      </div>
    </header>
  </UContainer>
</div>
</template>

<style scoped>
img {
  display: inline-block;
  vertical-align: middle;
  max-width: 30px;
}
</style>
