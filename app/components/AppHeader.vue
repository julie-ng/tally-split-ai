<script setup>
import { useUserStore } from '~/stores/user.store'
const store = useUserStore()
const userFullName = store.fullName

const links = [
  {
    text: 'Blobs',
    href: '/blobs'
  },
  {
    text: 'Samples (local)',
    href: '/samples'
  },
  {
    text: 'Upload',
    href: '/upload'
  }
]
</script>

<template>
<div class="" style="background:var(--jng-primary-color);">
  <UContainer class="py-3 flex items-center justify-between">
    <div class="flex items-center">
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
      </ul>
    </div>
    <div class="flex text-white">
      Hello {{ userFullName }}
    </div>
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
