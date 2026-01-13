<script setup>
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  receipt: Object,
})

// const route = useRoute()
</script>

<template>
  <div class="pt-6 px-4">
    <div class="grid grid-cols-1 gap-6">
      <!-- Merchant Information -->
      <UICollapsiblePropertyGroup title="Merchant Information">
        <UIFileProperty label="Merchant Name" :text="receipt.merchantName || '—'" />
        <UIFileProperty label="Address" :text="receipt.merchantAddress || '—'" />
        <UIFileProperty label="Phone" :text="receipt.merchantPhone || '—'" />
      </UICollapsiblePropertyGroup>

      <hr class="text-slate-300">

      <!-- Transaction Details -->
      <UICollapsiblePropertyGroup title="Transaction Details">
        <UIFileProperty label="Receipt Date">
          <time v-if="receipt.receiptDate" :datetime="receipt.receiptDate" :title="receipt.receiptDate">
            {{ timestampUtils.toShortDate(receipt.receiptDate) }}
          </time>
          <span v-else class="text-slate-400">—</span>
        </UIFileProperty>
        <UIFileProperty label="Tags">
          <div v-if="receipt.receiptTags" class="flex flex-wrap gap-2 pt-2">
            <UBadge
              v-for="(tag, i) in receipt.receiptTags.split(',')"
              :key="`tag-${i}`"
              class="text-slate-500"
              color="info"
              variant="soft"
            >
              {{ tag.trim() }}
            </UBadge>
          </div>
          <span v-else class="text-slate-400">—</span>
        </UIFileProperty>
        <UIFileProperty label="Analysis Status">
          <UBadge
            :color="receipt.isAnalyzed ? 'success' : 'neutral'"
            :variant="receipt.isAnalyzed ? 'solid' : 'soft'"
          >
            {{ receipt.isAnalyzed ? 'Analyzed' : 'Not Analyzed' }}
          </UBadge>
        </UIFileProperty>
      </UICollapsiblePropertyGroup>

      <hr class="text-slate-300">

      <!-- Financial Details -->
      <UICollapsiblePropertyGroup title="Financial Details">
        <UIFileProperty label="Subtotal">
          <span v-if="receipt.receiptSubtotal != null" class="font-medium">
            {{ receiptUtils.formatCurrency(receipt.receiptSubtotal, receipt.receiptCurrency || 'EUR') }}
          </span>
          <span v-else class="text-slate-400">—</span>
        </UIFileProperty>
        <UIFileProperty label="Tax">
          <span v-if="receipt.receiptTax != null" class="font-medium">
            {{ receiptUtils.formatCurrency(receipt.receiptTax, receipt.receiptCurrency || 'EUR') }}
          </span>
          <span v-else class="text-slate-400">—</span>
        </UIFileProperty>
        <UIFileProperty label="Total">
          <span v-if="receipt.receiptTotal != null" class="font-medium text-lg">
            {{ receiptUtils.formatCurrency(receipt.receiptTotal, receipt.receiptCurrency || 'EUR') }}
          </span>
          <span v-else class="text-slate-400">—</span>
        </UIFileProperty>
        <UIFileProperty label="Currency" :text="receipt.receiptCurrency || '—'" />
      </UICollapsiblePropertyGroup>

      <hr class="text-slate-300">

      <!-- User Notes -->
      <UICollapsiblePropertyGroup title="Notes">
        <UIFileProperty label="Notes">
          <div v-if="receipt.notes" class="mt-2 p-3 bg-slate-50 rounded-lg text-slate-700">
            {{ receipt.notes }}
          </div>
          <span v-else class="text-slate-400">No notes</span>
        </UIFileProperty>
        <div class="mt-4">
          <NuxtLink :to="`/receipts/${receipt.id}/edit`">
            <UButton
              icon="i-lucide-pencil"
              color="info"
              variant="solid"
            >
              Edit Receipt
            </UButton>
          </NuxtLink>
        </div>
      </UICollapsiblePropertyGroup>

      <hr class="text-slate-300">

      <!-- Metadata -->
      <UICollapsiblePropertyGroup title="Metadata">
        <UIFileProperty label="Receipt ID" :text="receipt.id" />
        <UIFileProperty label="Created At">
          <time :datetime="receipt.createdAt" :title="receipt.createdAt">
            {{ timestampUtils.toShortDatetime(receipt.createdAt) }}
          </time>
        </UIFileProperty>
        <UIFileProperty label="Updated At">
          <time :datetime="receipt.updatedAt" :title="receipt.updatedAt">
            {{ timestampUtils.toShortDatetime(receipt.updatedAt) }}
          </time>
        </UIFileProperty>
      </UICollapsiblePropertyGroup>
    </div>
  </div>
</template>
