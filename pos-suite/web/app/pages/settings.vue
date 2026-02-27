<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const form = ref<Record<string, any>>({})
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const sarWarning = ref('')

function isSarComplete() {
  return Boolean(form.value.cai && form.value.range_from && form.value.range_to && form.value.cai_expires_at)
}

function refreshSarWarning() {
  sarWarning.value = isSarComplete()
    ? ''
    : 'CAI incompleto: debes configurar CAI, rango desde/hasta y fecha de vencimiento para poder facturar.'
}

async function loadSettings() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/store-settings')
    form.value = { ...(data.data || {}) }
    refreshSarWarning()
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
      legal_name: form.value.legal_name,
      phone: form.value.phone,
      email: form.value.email,
      rtn: form.value.rtn,
      address: form.value.address,
      logo_url: form.value.logo_url,
      cai: form.value.cai,
      range_from: form.value.range_from,
      range_to: form.value.range_to,
      cai_expires_at: form.value.cai_expires_at,
      establishment_code: form.value.establishment_code,
      point_emission: form.value.point_emission,
      correlativo_actual: Number(form.value.correlativo_actual || 1),
      currency: form.value.currency || 'HNL',
      isv_rate: Number(form.value.isv_rate || 15),
      prices_include_isv: Boolean(form.value.prices_include_isv ?? true),
      layaway_days_max: Number(form.value.layaway_days_max || 8),
      layaway_min_down_payment_amount: Number(form.value.layaway_min_down_payment_amount || 0),
      layaway_min_down_payment_percent: Number(form.value.layaway_min_down_payment_percent || 0),
      card_surcharge_rate: Number(form.value.card_surcharge_rate || 0),
      ticket_legend: form.value.ticket_legend,
    }
    const { data } = await api.put('/store-settings', payload)
    form.value = { ...(data.data || {}) }
    message.value = 'Configuración actualizada'
    refreshSarWarning()
  } catch (error: any) {
    const code = error?.response?.data?.code
    if (code === 'CAI_CONFIG_MISSING') {
      errorMessage.value = 'No se puede guardar/facturar: configuración de CAI incompleta.'
    } else {
      errorMessage.value = error?.response?.data?.message || 'No se pudo guardar'
    }
  } finally {
    saving.value = false
  }
}

watch(
  () => [form.value.cai, form.value.range_from, form.value.range_to, form.value.cai_expires_at],
  () => refreshSarWarning(),
)

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
    <p v-if="sarWarning" class="rounded bg-amber-50 p-3 text-sm text-amber-700">{{ sarWarning }}</p>

    <div v-if="loading" class="card">Cargando...</div>
    <form v-else class="grid gap-4 md:grid-cols-2" @submit.prevent="saveSettings">
      <div class="card md:col-span-2">
        <h2 class="mb-4 font-semibold">Datos generales</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div><label class="label">Nombre comercial</label><input v-model="form.trade_name" class="input" /></div>
          <div><label class="label">Razón social</label><input v-model="form.legal_name" class="input" /></div>
          <div><label class="label">Teléfono</label><input v-model="form.phone" class="input" /></div>
          <div><label class="label">Correo</label><input v-model="form.email" class="input" /></div>
          <div><label class="label">RTN</label><input v-model="form.rtn" class="input" /></div>
          <div><label class="label">Logo URL</label><input v-model="form.logo_url" class="input" /></div>
          <div class="md:col-span-2"><label class="label">Dirección</label><input v-model="form.address" class="input" /></div>
        </div>
      </div>

      <div class="card md:col-span-2">
        <h2 class="mb-4 font-semibold">SAR</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div><label class="label">CAI</label><input v-model="form.cai" class="input" /></div>
          <div><label class="label">Fecha vencimiento CAI</label><input v-model="form.cai_expires_at" class="input" type="datetime-local" /></div>
          <div><label class="label">Rango desde</label><input v-model="form.range_from" class="input" /></div>
          <div><label class="label">Rango hasta</label><input v-model="form.range_to" class="input" /></div>
          <div><label class="label">Establecimiento (opcional)</label><input v-model="form.establishment_code" class="input" /></div>
          <div><label class="label">Punto de emisión (opcional)</label><input v-model="form.point_emission" class="input" /></div>
          <div><label class="label">Correlativo actual</label><input v-model="form.correlativo_actual" class="input" type="number" min="1" /></div>
        </div>
      </div>

      <div class="card md:col-span-2">
        <h2 class="mb-4 font-semibold">Impuestos</h2>
        <div class="grid gap-4 md:grid-cols-3">
          <div><label class="label">Moneda</label><input v-model="form.currency" class="input" /></div>
          <div><label class="label">ISV (%)</label><input v-model="form.isv_rate" class="input" type="number" step="0.01" /></div>
          <div class="flex items-center gap-2 pt-6"><input id="pricesIncludeIsv" v-model="form.prices_include_isv" type="checkbox" /><label for="pricesIncludeIsv" class="label !mb-0">Precios incluyen ISV</label></div>
        </div>
      </div>

      <div class="card">
        <h2 class="mb-4 font-semibold">Reglas puntos</h2>
        <p class="text-sm text-slate-500">Las reglas de puntos se gestionan en este mismo módulo de configuración.</p>
      </div>

      <div class="card">
        <h2 class="mb-4 font-semibold">Reglas apartados</h2>
        <div class="grid gap-4">
          <div><label class="label">Máximo días</label><input v-model="form.layaway_days_max" class="input" type="number" min="1" /></div>
          <div><label class="label">Prima mínima (L)</label><input v-model="form.layaway_min_down_payment_amount" class="input" type="number" step="0.01" min="0" /></div>
          <div><label class="label">Prima mínima (%)</label><input v-model="form.layaway_min_down_payment_percent" class="input" type="number" step="0.01" min="0" /></div>
        </div>
      </div>

      <div class="card md:col-span-2">
        <h2 class="mb-4 font-semibold">Recargo tarjeta</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div><label class="label">Recargo (%)</label><input v-model="form.card_surcharge_rate" class="input" type="number" step="0.01" /></div>
          <div><label class="label">Texto legal ticket</label><textarea v-model="form.ticket_legend" class="input" rows="2" /></div>
        </div>
      </div>

      <div class="md:col-span-2">
        <button class="btn-primary" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
      </div>
    </form>
  </div>
</template>
