<script setup>
defineProps({
  receipt: Object,
})
</script>

<template>
  <div class="grid grid-cols-2 gap-y-1 text-sm">
    <div>
      Analysis Status
    </div>
    <div>
      <UBadge
        :color="badgeStyleHelpers.analysisBadgeColor(receipt.isAnalyzed)"
        :variant="badgeStyleHelpers.analysisBadgeVariant(receipt.isAnalyzed)"
      >
        {{ receipt.isAnalyzed ? 'Analyzed' : 'Not Analyzed' }}
      </UBadge>
    </div>
    <div>
      Analyzed at
    </div>
    <div>
      (WIP)
    </div>
  </div>
</template>
