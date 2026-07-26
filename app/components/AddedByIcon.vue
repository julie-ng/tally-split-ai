<script setup>
const props = defineProps({
  color: {
    type: String,
    default: 'text-dimmed',
  },
  source: {
    type: String,
    default: 'ocr',
  },
})

const iconProps = {
  ocr: {
    icon: 'i-lucide-focus',
    label: 'Info extracted by OCR',
  },
  human: {
    icon: 'i-lucide-smile-plus',
    label: 'Info added by human via original filename',
  },
}

const icon = computed(() => iconProps[props.source])
</script>

<template>
  <UIcon
    :name="icon.icon"
    class="size-4 inline-block align-middle ml-0.5"
    :class="props.color"
    :title="icon.label"
    :aria-label="icon.label"
  />
</template>
