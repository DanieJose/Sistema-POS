<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const filters = reactive({
  date_from: new Date().toISOString().slice(0, 10),
  date_to: new Date().toISOString().slice(0, 10),
})
const dataMap = reactive<Record<string, any>>({
  financial: null,
  inventory: null,
  loyalty: null,
  tax: null,
  byCategory: null,
})
const loading = ref(false)

async function loadReports() {
  loading.value = true
  try {
    const [financial, inventory, loyalty, tax, byCategory] = await Promise.all([
      api.get('/reports/financial-summary', { params: filters }),
      api.get('/reports/inventory-investment'),
      api.get('/reports/loyalty-summary'),
      api.get('/reports/tax-summary', { params: filters }),
      api.get('/reports/by-category'),
    ])
    dataMap.financial = financial.data.data
    dataMap.inventory = inventory.data.data
    dataMap.loyalty = loyalty.data.data
    dataMap.tax = tax.data.data
    dataMap.byCategory = byCategory.data.data
  } finally {
    loading.value = false
  }
}

onMounted(loadReports)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <h1 class="text-2xl font-bold">Reportes</h1>
        <p class="text-sm text-slate-500">Finanzas, inventario, lealtad e impuestos</p>
      </div>
      <div class="ml-auto grid grid-cols-2 gap-2">
        <input v-model="filters.date_from" type="date" class="input" />
        <input v-model="filters.date_to" type="date" class="input" />
      </div>
      <button class="btn-primary" @click="loadReports">Consultar</button>
    </div>

    <div v-if="loading" class="card">Cargando...</div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <div class="card"><h2 class="font-semibold">Financial Summary</h2><pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ dataMap.financial }}</pre></div>
      <div class="card"><h2 class="font-semibold">Inventory Investment</h2><pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ dataMap.inventory }}</pre></div>
      <div class="card"><h2 class="font-semibold">Loyalty Summary</h2><pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ dataMap.loyalty }}</pre></div>
      <div class="card"><h2 class="font-semibold">Tax Summary</h2><pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ dataMap.tax }}</pre></div>
      <div class="card xl:col-span-2"><h2 class="font-semibold">By Category</h2><pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ dataMap.byCategory }}</pre></div>
    </div>
  </div>
</template>
