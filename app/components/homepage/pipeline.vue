<script setup>
const { data: content } = await useAsyncData(
  'landing-pipeline',
  () => queryCollection('pipeline').first(),
)

// Refs to each step element so IntersectionObserver can watch them.
const stepEls = ref([])

// Track which steps have entered the viewport. We only flip true (never back
// to false) so the trail "fills in" as the user scrolls down and doesn't
// un-fill on scroll-up.
const activeIndex = ref(-1)

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const i = Number(entry.target.dataset.stepIndex)
          if (i > activeIndex.value) {
            activeIndex.value = i
          }
        }
      }
    },
    { rootMargin: '0px 0px -40% 0px', threshold: 0.1 },
  )

  stepEls.value.forEach(el => el && observer.observe(el))

  onBeforeUnmount(() => observer.disconnect())
})

// Map workflow icon (defined in the markdown frontmatter) — fall back to a
// generic dot if not provided.
const fallbackIcon = 'i-lucide-circle'
</script>

<template>
  <div id="llm-pipeline">
    <ContentRenderer :value="content" />

    <section v-if="content.workflow" class="mt-6">
      <div
        v-for="(step, i) in content.workflow"
        :key="`home-step-${i}`"
        :ref="el => stepEls[i] = el"
        :data-step-index="i"
        :data-active="i <= activeIndex"
        class="group relative flex gap-4 pb-12 last:pb-0"
      >
        <!-- Icon column: circle + vertical connector line -->
        <div class="relative flex flex-col items-center">
          <div
            class="
              z-10 size-10 rounded-full flex items-center justify-center
              bg-elevated text-muted ring-1 ring-default
              transition-colors duration-500
              group-data-[active=true]:bg-primary
              group-data-[active=true]:text-white
              group-data-[active=true]:ring-primary
              dark:group-data-[active=true]:bg-primary-600
              dark:group-data-[active=true]:text-white
              dark:group-data-[active=true]:ring-primary-600
            "
          >
            <UIcon :name="step.icon || fallbackIcon" class="size-5" />
          </div>

          <!-- Line: Inactive color -->
          <div
            v-if="i < content.workflow.length - 1"
            class="relative flex-1 w-1 mt-2  overflow-hidden rounded-full"
          >
            <!-- Line: Active color -->
            <div
              class="
                absolute inset-x-0 top-0 bg-primary-200 dark:bg-primary-950 origin-top
                transition-transform duration-700 ease-out
                group-data-[active=true]:scale-y-100
                scale-y-0 h-full
              "
            />
          </div>
        </div>

        <!-- Content column -->
        <div class="flex-1 pb-2 pl-4 pr-10">
          <p class="text-dimmed text-sm -mt-3">
            Step {{ i + 1 }}
          </p>
          <h3 class="font-bold text-lg flex items-center gap-1">
            {{ step.title }}
            <UBadge
              v-if="step.stack"
              color="neutral"
              variant="soft"
              class="text-muted ml-2"
            >
              {{ step.stack }}
            </UBadge>
          </h3>
          <!-- <p v-if="step.stack" class="text-sm text-muted mt-0.5">
            {{ step.stack }}
          </p> -->

          <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div class="text-default">
              <MDC :value="step.description" />
            </div>
            <div>
              <NuxtImg
                v-if="step.image"
                class="md:max-w-[400px] border border-neutral-200"
                :src="step.image.src"
                :alt="step.image.alt"
              />

              <MDC v-if="step.preview" :value="step.preview" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
