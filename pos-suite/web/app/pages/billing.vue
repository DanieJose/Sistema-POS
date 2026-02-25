<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const issueForm = reactive({ sale_id: 1, customer_name: '', customer_rtn: '', customer_address: '' })
const bySaleId = ref(1)
const invoice = ref<any>(null)
const errorMessage = ref('')

async function issueInvoice() {
  errorMessage.value = ''
  try {
    const payload: any = { sale_id: Number(issueForm.sale_id) }
    if (issueForm.customer_name) payload.customer_name = issueForm.customer_name
    if (issueForm.customer_rtn) payload.customer_rtn = issueForm.customer_rtn
    if (issueForm.customer_address) payload.customer_address = issueForm.customer_address
    const { data } = await api.post('/billing/invoices', payload)
    invoice.value = data
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo emitir factura'
  }
}

async function getBySale() {
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/billing/invoices/by-sale/${bySaleId.value}`)
    invoice.value = { invoice: data.data, pdf_url: `/api/billing/invoices/${data.data.id}/pdf` }
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Factura no encontrada'
  }
}

function openPdf() {
  if (!invoice.value?.pdf_url) return
  const auth = useAuth()
  const url = `${useRuntimeConfig().public.apiBaseUrl.replace(/\/api$/, '')}${invoice.value.pdf_url}`
  fetch(url, { headers: { Authorization: `Bearer ${auth.token.value}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank')
    })
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Facturación HN</h1>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="card space-y-3">
        <h2 class="font-semibold">Emitir factura</h2>
        <input v-model="issueForm.sale_id" type="number" class="input" placeholder="Sale ID" />
        <input v-model="issueForm.customer_name" class="input" placeholder="Nombre cliente (opcional)" />
        <input v-model="issueForm.customer_rtn" class="input" placeholder="RTN cliente (opcional)" />
        <input v-model="issueForm.customer_address" class="input" placeholder="Dirección cliente (opcional)" />
        <button class="btn-primary" @click="issueInvoice">Emitir</button>
      </div>

      <div class="card space-y-3">
        <h2 class="font-semibold">Consultar por venta</h2>
        <input v-model="bySaleId" type="number" class="input" placeholder="Sale ID" />
        <button class="btn-secondary" @click="getBySale">Buscar</button>
        <button class="btn-primary" :disabled="!invoice?.pdf_url" @click="openPdf">Descargar PDF</button>
      </div>
    </div>

    <div class="card">
      <h2 class="font-semibold">Resultado</h2>
      <pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ invoice }}</pre>
    </div>
  </div>
</template>
