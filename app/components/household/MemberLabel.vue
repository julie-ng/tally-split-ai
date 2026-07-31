<script setup>
// A household member as avatar + name, from an id alone.
//
// Exists because raw user ids surface in places the user shouldn't have to
// decode — change history, audit rows. Everywhere else already has the member
// object to hand; this is for when all you have is the id.
import { useHouseholdMember } from '~/composables/useHouseholdMember'

const props = defineProps({
  userId: {
    type: [String, null],
    default: null,
  },
  // 'first' suits tight columns; 'full' for prose.
  nameFormat: {
    type: String,
    default: 'full',
    validator: v => ['full', 'first'].includes(v),
  },
})

const member = useHouseholdMember(() => props.userId)

// Falls back to the raw id rather than rendering nothing — a member who has
// left the household still appears in history, and a blank cell would read as
// "no value" when the change genuinely recorded one.
const label = computed(() => {
  if (!member.value) {
    return props.userId
  }
  return props.nameFormat === 'first' ? member.value.firstName : member.value.displayName
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5 min-w-0">
    <UAvatar
      :src="member?.avatarUrl"
      :alt="label"
      class="size-4 shrink-0"
    />
    <span class="truncate" :class="member ? '' : 'font-mono'">{{ label }}</span>
  </span>
</template>
