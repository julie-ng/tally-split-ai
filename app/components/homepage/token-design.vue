<script setup>
const { data: content } = await useAsyncData('landing-token-design', () =>
  queryCollection('tokenDesign')
    .first())
</script>

<template>
  <div id="security-token-design">
    <div v-if="content" class="w-full">
      <HomepageSectionHeading
        subheading="Security"
        :heading="content.title"
        class="mb-12"
      >
        {{ content.intro }}
      </HomepageSectionHeading>

      <div class="text-center">
        <UCard class="shadow-md/5 bg-linear-to-br from-neutral-0 to-neutral-50 ring-1 ring-neutral-200">
          <div class="flex items-center justify-center gap-2 mb-6">
            <UIcon name="i-lucide-text-initial" />Pipe Separated Input String
          </div>
          <div class="flex flex-wrap items-start justify-center">
            <template v-for="(c, i) in content.components" :key="`hmac-input-${i}`">
              <div>
                <UBadge
                  color="neutral"
                  variant="soft"
                  size="3"
                  class="block bg-neutral-100 px-2 py-1 rounded font-mono text-muted"
                >
                  {{ c.example }}
                </UBadge>
                <div class="text-dimmed text-xs mt-2 text-center">
                  {{ c.caption }}
                </div>
              </div>
              <div>
                <UBadge
                  v-if="i < content.components.length - 1"
                  color="primary"
                  variant="ghost"
                  size="6"
                  class="mx-2 px-2 py-2 text-dimmed"
                >
                  |
                </UBadge>
              </div>
            </template>
          </div>
        </UCard>
        <UIcon name="i-lucide-arrow-down" class="mt-10 mb-6 text-primary size-6" />
        <UCard class="shadow-md/5 max-w-sm mx-auto bg-linear-to-br from-neutral-0 to-neutral-50 ring-1 ring-neutral-200">
          <div class="flex items-center justify-center gap-2">
            <UIcon name="i-lucide-key-round" />
            HMAC-SHA256 Algorithm + Salt
          </div>
        </UCard>
        <UIcon name="i-lucide-arrow-down" class="my-6 text-primary size-6" />
        <UCard class="shadow-md/5 max-w-sm mx-auto  bg-linear-to-br from-primary-0 to-primary-50 ring-1 ring-primary-200">
          <div class="flex items-center justify-center gap-1 font-semibold">
            <UIcon name="i-lucide-qr-code" />
            Deterministic and Signed Token
          </div>
        </UCard>
        <p class="my-10 md:max-w-xl mx-auto">
          {{ content.outtro }}
        </p>
        <DiagramTokenSequence />
      </div>
    </div>
    <div v-else>
      No content
    </div>
  </div>
</template>
