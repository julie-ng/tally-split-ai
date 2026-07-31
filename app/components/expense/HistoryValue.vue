<script setup>
// One value in a change-history row, rendered per its `kind`.
//
// Split out because the before/after cells render identically — inline they'd be
// two copies of the same branching, which is exactly where the two drift apart.
defineProps({
  // { text, isNull, kind } from HistoryFields' displayValue().
  value: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <!-- A user id is the one kind that isn't text at all: it resolves to that
       member's avatar + name, since a raw nanoid tells the reader nothing. -->
  <HouseholdMemberLabel v-if="value.kind === 'user'" :user-id="value.text" />

  <!-- null → mono + faded, so it reads as a type literal rather than content.
       ids → mono, being opaque strings rather than prose.
       numbers → tabular-nums, so decimals line up down the column. -->
  <span
    v-else
    :class="{
      'font-mono text-muted/60': value.isNull,
      'font-mono': value.kind === 'id',
      'tabular-nums': value.kind === 'number',
    }"
  >
    {{ value.text }}
  </span>
</template>
