<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const form = ref<Record<string, any>>({})
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

async function loadSettings() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/store-settings')
    form.value = { ...(data.data || {}) }
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo cargar settings'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const payload = {
      trade_name: form.value.trade_name,
      phone: form.value.phone,
      rtn: form.value.rtn,
      address: form.value.address,
      cai: form.value.cai,
      range_from: form.value.range_from,
      range_to: form.value.range_to,
      cai_expires_at: form.value.cai_expires_at,
      isv_rate: Number(form.value.isv_rate || 0.15),
      card_surcharge_rate: Number(form.value.card_surcharge_rate || 0),
      low_stock_threshold: Number(form.value.low_stock_threshold || 5),
      ticket_legend: form.value.ticket_legend,
    }
    const { data } = await api.put('/store-settings', payload)
    form.value = { ...(data.data || {}) }
    message.value = 'Configuración actualizada'
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Configuración de tienda</h1>
      <button class="btn-secondary" @click="loadSettings">Recargar</button>
    </div>

    <p v-if="message" class="rounded bg-green-50 p-3 text-sm text-green-700">{{ message }}</p>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div v-if="loading" class="card">Cargando...</div>
    <form v-else class="grid gap-4 md:grid-cols-2" @submit.prevent="saveSettings">
      <div class="card md:col-span-2">
        <h2 class="mb-4 font-semibold">General</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div><label class="label">Nombre comercial</label><input v-model="form.trade_name" class="input" /></div>
          <div><label class="label">Teléfono</label><input v-model="form.phone" class="input" /></div>
          <div><label class="label">RTN</label><input v-model="form.rtn" class="input" /></div>
          <div><label class="label">Dirección</label><input v-model="form.address" class="input" /></div>
          <div><label class="label">ISV rate</label><input v-model="form.isv_rate" class="input" type="number" step="0.01" /></div>
          <div><label class="label">Recargo tarjeta</label><input v-model="form.card_surcharge_rate" class="input" type="number" step="0.01" /></div>
          <div><label class="label">Umbral stock bajo</label><input v-model="form.low_stock_threshold" class="input" type="number" min="0" /></div>
          <div class="md:col-span-2"><label class="label">Leyenda ticket</label><textarea v-model="form.ticket_legend" class="input" rows="3" /></div>
        </div>
      </div>

      <div class="card md:col-span-2">
        <h2 class="mb-4 font-semibold">CAI / Facturación HN</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div><label class="label">CAI</label><input v-model="form.cai" class="input" /></div>
          <div><label class="label">CAI vence</label><input v-model="form.cai_expires_at" class="input" type="datetime-local" /></div>
          <div><label class="label">Rango desde</label><input v-model="form.range_from" class="input" /></div>
          <div><label class="label">Rango hasta</label><input v-model="form.range_to" class="input" /></div>
        </div>
      </div>

      <div class="md:col-span-2">
        <button class="btn-primary" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
      </div>
    </form>
  </div>
</template>
