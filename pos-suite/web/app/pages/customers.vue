<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const customers = ref<any[]>([])
const selected = ref<any>(null)
const wallet = ref<any>(null)
const txs = ref<any[]>([])
const filters = reactive({ phone: '', name: '' })
const createForm = reactive({ full_name: '', phone: '', email: '' })
const topupForm = reactive({ amount_lempiras: 100, payment_method: 'cash', reference: '' })
const message = ref('')
const errorMessage = ref('')

async function loadCustomers() {
  const params: any = {}
  if (filters.phone) params.phone = filters.phone
  if (filters.name) params.name = filters.name
  const { data } = await api.get('/customers', { params })
  customers.value = data.data || []
}

async function loadCustomerDetail(id: number) {
  const [customerRes, walletRes, txRes] = await Promise.all([
    api.get(`/customers/${id}`),
    api.get(`/customers/${id}/wallet`),
    api.get(`/customers/${id}/loyalty-transactions`, { params: { page: 1, limit: 20 } }),
  ])
  selected.value = customerRes.data.data
  wallet.value = walletRes.data.data
  txs.value = txRes.data.data || []
}

async function createCustomer() {
  try {
    await api.post('/customers', createForm)
    Object.assign(createForm, { full_name: '', phone: '', email: '' })
    message.value = 'Cliente creado'
    errorMessage.value = ''
    await loadCustomers()
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo crear cliente'
  }
}

async function topup() {
  if (!selected.value?.id) return
  try {
    const payload: any = { amount_lempiras: Number(topupForm.amount_lempiras), payment_method: topupForm.payment_method }
    if (topupForm.reference) payload.reference = topupForm.reference
    await api.post(`/customers/${selected.value.id}/topup`, payload)
    message.value = 'Recarga aplicada'
    errorMessage.value = ''
    await loadCustomerDetail(selected.value.id)
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo aplicar recarga'
  }
}

onMounted(loadCustomers)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Clientes + Lealtad</h1>
    <p v-if="message" class="rounded bg-green-50 p-3 text-sm text-green-700">{{ message }}</p>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4">
        <div class="card">
          <h2 class="mb-3 font-semibold">Crear cliente</h2>
          <div class="space-y-2">
            <input v-model="createForm.full_name" class="input" placeholder="Nombre completo" />
            <input v-model="createForm.phone" class="input" placeholder="Teléfono" />
            <input v-model="createForm.email" class="input" placeholder="Email (opcional)" />
            <button class="btn-primary w-full" @click="createCustomer">Crear</button>
          </div>
        </div>

        <div class="card">
          <h2 class="mb-3 font-semibold">Filtros</h2>
          <div class="space-y-2">
            <input v-model="filters.phone" class="input" placeholder="Phone" />
            <input v-model="filters.name" class="input" placeholder="Name" />
            <button class="btn-secondary w-full" @click="loadCustomers">Buscar</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Phone</th></tr></thead>
            <tbody>
              <tr v-for="c in customers" :key="c.id" class="cursor-pointer hover:bg-slate-50" @click="loadCustomerDetail(c.id)">
                <td>{{ c.id }}</td><td>{{ c.full_name }}</td><td>{{ c.phone }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="xl:col-span-2 space-y-4">
        <div class="card">
          <h2 class="font-semibold">Detalle cliente</h2>
          <pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ selected }}</pre>
        </div>
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="card">
            <h3 class="mb-3 font-semibold">Wallet</h3>
            <pre class="overflow-auto rounded bg-slate-50 p-3 text-xs">{{ wallet }}</pre>
          </div>
          <div class="card">
            <h3 class="mb-3 font-semibold">Topup puntos</h3>
            <div class="space-y-2">
              <input v-model="topupForm.amount_lempiras" type="number" step="0.01" class="input" placeholder="Monto L" />
              <select v-model="topupForm.payment_method" class="input">
                <option value="cash">cash</option>
                <option value="card">card</option>
                <option value="transfer">transfer</option>
              </select>
              <input v-model="topupForm.reference" class="input" placeholder="Referencia (transfer)" />
              <button class="btn-primary w-full" :disabled="!selected" @click="topup">Aplicar topup</button>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 class="mb-3 font-semibold">Transacciones de lealtad</h3>
          <pre class="overflow-auto rounded bg-slate-50 p-3 text-xs">{{ txs }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
