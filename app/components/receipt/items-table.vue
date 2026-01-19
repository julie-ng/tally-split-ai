<script setup>
defineProps({
  items: Array, // validate before this
  hasQuantity: {
    type: Boolean,
    default: false,  // show column or not?
  },
  subtotal: {
    type: Number,
    required: false,
  },
})
</script>

<template>
  <div class="">
    <table class="my-3 text-sm">
      <thead>
        <tr>
          <th v-if="hasQuantity" class="py-2 border-b border-slate-300 font-medium">
            Qty.
          </th>
          <th class="py-2 border-b border-slate-300 font-medium text-left">
            Item
          </th>
          <th class="py-2 border-b border-slate-300 font-medium text-right">
            Price
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item, id in items" :key="id">
          <td v-if="hasQuantity" class="pr-2 py-2 pl-0 border-b border-slate-200 text-center">
            <!-- Quantity: doesn't always exist -->
            <template v-if="item.quantity">
              {{ item.quantity.value }}
            </template>
          </td>
          <td class="py-2 border-b border-slate-200 text-left">
            {{ item.description.value }}
          </td>
          <td class="py-2 pl-10 border-b border-slate-200 text-right">
            <!-- Total Price: doesn't always exist -->
            <template v-if="item.totalPrice">
              {{ receiptUtils.formatCurrency(item.totalPrice.value) }}
            </template>
          </td>
        </tr>
        <tr v-if="subtotal">
          <td v-if="hasQuantity" />
          <td class="py-2 pr-4 text-right">
            Subtotal
          </td>
          <td class="py-2 text-right">
            {{ receiptUtils.formatCurrency(subtotal) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
