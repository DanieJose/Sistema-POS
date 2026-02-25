<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const layaways = ref<any[]>([])
const selected = ref<any>(null)
const filterStatus = ref('')
const createForm = ref(`{
  "customer_id": 1,
  "down_payment_amount": 100,
  "payment_method": "cash",
  "items": [
    { "product_variant_id": 1, "quantity": 1 }
  ]
}`)
const paymentForm = reactive({ amount: 50, method: 'cash', reference: '' })
const errorMessage = ref('')

async function loadLayaways() {
  const params: any = {}
  if (filterStatus.value) params.status = filterStatus.value
  const { data } = await api.get('/layaways', { params })
  layaways.value = data.data || []
}

async function loadLayaway(id: number) {
  const { data } = await api.get(`/layaways/${id}`)
  selected.value = data.data
}

async function createLayaway() {
  errorMessage.value = ''
  try {
    const payload = JSON.parse(createForm.value)
    const { data } = await api.post('/layaways', payload)
    selected.value = data.data
    await loadLayaways()
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo crear apartado'
  }
}

async function addPayment() {
  if (!selected.value?.id) return
  await api.post(`/layaways/${selected.value.id}/payments`, paymentForm)
  await loadLayaway(selected.value.id)
  await loadLayaways()
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Apartados</h1>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4">
        <div class="card">
          <h2 class="mb-3 font-semibold">Filtro</h2>
          <div class="flex gap-2">
            <select v-model="filterStatus" class="input">
              <option value="">Todos</option>
              <option>ACTIVE</option>
              <option>COMPLETED</option>
              <option>EXPIRED</option>
              <option>CANCELLED</option>
            </select>
            <button class="btn-secondary" @click="loadLayaways">Consultar</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>ID</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              <tr v-for="l in layaways" :key="l.id" class="cursor-pointer hover:bg-slate-50" @click="loadLayaway(l.id)">
                <td>{{ l.id }}</td><td>{{ l.status }}</td><td>{{ l.total_amount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="xl:col-span-2 space-y-4">
        <div class="card">
          <h2 class="mb-3 font-semibold">Crear apartado (JSON rápido)</h2>
          <textarea v-model="createForm" class="input font-mono text-xs" rows="10" />
          <button class="btn-primary mt-3" @click="createLayaway">Crear apartado</button>
        </div>

        <div class="card">
          <h2 class="font-semibold">Detalle</h2>
          <pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ selected }}</pre>
        </div>

        <div class="card">
          <h3 class="mb-3 font-semibold">Abono</h3>
          <div class="grid gap-3 md:grid-cols-4">
            <input v-model="paymentForm.amount" type="number" step="0.01" class="input" placeholder="Monto" />
            <select v-model="paymentForm.method" class="input">
              <option value="cash">cash</option>
              <option value="card">card</option>
              <option value="transfer">transfer</option>
            </select>
            <input v-model="paymentForm.reference" class="input" placeholder="Referencia" />
            <button class="btn-primary" :disabled="!selected" @click="addPayment">Registrar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
