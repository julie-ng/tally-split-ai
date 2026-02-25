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

const isHighlighted = (label) =>
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
    x: event.clientX - rect.left + 12,
    y: event.clientY - rect.top + 12,
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
        :fill="isHighlighted(region.label) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)'"
        :stroke="isHighlighted(region.label) ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.6)'"
        :stroke-width="isHighlighted(region.label) ? 3 : 2"
        class="pointer-events-auto cursor-pointer"
        @mouseenter="onMouseEnter(region.label)"
        @mouseleave="onMouseLeave"
      />
    </svg>

    <!-- Tooltip -->
    <div
      v-if="hoveredRegion"
      class="absolute z-10 px-2 py-1 text-xs bg-slate-800 text-white rounded shadow-lg pointer-events-none max-w-48"
      :style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }"
    >
      <span class="font-semibold">{{ hoveredRegion.label }}</span>
      <span v-if="hoveredRegion.content" class="block text-slate-300 truncate">
        {{ hoveredRegion.content }}
      </span>
    </div>
  </div>
</template>
