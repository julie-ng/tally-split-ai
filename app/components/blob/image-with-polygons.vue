<script setup>
const props = defineProps({
  blobName: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    required: false,
    default: '',
  },
  polygons: {
    type: Array,
    required: true,
  },
  // Original image dimensions in pixels, used to set the SVG viewBox so
  // polygon coordinates (which are in image pixel space) scale correctly
  // to match the rendered display size of the image.
  pageWidth: {
    type: Number,
    required: true,
  },
  pageHeight: {
    type: Number,
    required: true,
  },
  highlightedLabel: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['update:highlightedLabel'])

const hoveredLabel = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })
const containerRef = ref(null)

const hoveredRegion = computed(() =>
  props.polygons.find(r => r.label === hoveredLabel.value),
)

const isHighlighted = label =>
  label === hoveredLabel.value || label === props.highlightedLabel

const onMouseEnter = (label) => {
  hoveredLabel.value = label
  emit('update:highlightedLabel', label)
}

const onMouseLeave = () => {
  hoveredLabel.value = null
  emit('update:highlightedLabel', null)
}

const onMouseMove = (event) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  tooltipPos.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top + 24,
  }
}

const polygonToSvgPoints = (polygon) => {
  const points = []
  for (let i = 0; i < polygon.length; i += 2) {
    points.push(`${polygon[i]},${polygon[i + 1]}`)
  }
  return points.join(' ')
}
</script>

<template>
  <div ref="containerRef" class="relative">
    <blob-image
      :blob-name="props.blobName"
      :alt="props.alt"
    />
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none"
      :viewBox="`0 0 ${props.pageWidth} ${props.pageHeight}`"
      preserveAspectRatio="none"
      @mousemove="onMouseMove"
    >
      <polygon
        v-for="region in props.polygons"
        :key="region.label"
        :points="polygonToSvgPoints(region.polygon)"
        :fill="isHighlighted(region.label) ? 'rgba(234, 179, 8, 0.35)' : 'rgba(59, 130, 246, 0.15)'"
        :stroke="isHighlighted(region.label) ? 'rgba(202, 138, 4, 1)' : 'rgba(59, 130, 246, 0.6)'"
        :stroke-width="isHighlighted(region.label) ? 3 : 2"
        class="pointer-events-auto cursor-pointer"
        @mouseenter="onMouseEnter(region.label)"
        @mouseleave="onMouseLeave"
      />
    </svg>

    <!-- Tooltip -->
    <div
      v-if="hoveredRegion"
      class="absolute z-10 px-2 py-1 text-xs bg-inverted text-inverted rounded shadow-lg pointer-events-none max-w-48 -translate-x-1/2 text-left"
      :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
    >
      <span class="font-semibold font-mono">{{ hoveredRegion.label }}</span>
      <span v-if="hoveredRegion.content" class="block text-muted truncate">
        {{ hoveredRegion.content }}
      </span>
    </div>
  </div>
</template>
