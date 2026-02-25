<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const currentSession = ref<any>(null)
const openForm = reactive({ opening_cash_amount: 1000 })
const movementForm = reactive({ type: 'IN', amount: 100, reason: '' })
const closeForm = reactive({ closing_cash_counted: 1000, notes: '' })
const message = ref('')
const errorMessage = ref('')

async function loadCurrent() {
  const { data } = await api.get('/cash/current')
  currentSession.value = data.data
}

async function openCash() {
  try {
    await api.post('/cash/open', openForm)
    message.value = 'Caja abierta'
    errorMessage.value = ''
    await loadCurrent()
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Error al abrir caja'
  }
}

async function addMovement() {
  try {
    await api.post('/cash/movements', movementForm)
    movementForm.reason = ''
    message.value = 'Movimiento registrado'
    errorMessage.value = ''
    await loadCurrent()
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Error al registrar movimiento'
  }
}

async function closeCash() {
  try {
    await api.post('/cash/close', closeForm)
    message.value = 'Caja cerrada'
    errorMessage.value = ''
    await loadCurrent()
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Error al cerrar caja'
  }
}

onMounted(loadCurrent)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Caja</h1>
    <p v-if="message" class="rounded bg-green-50 p-3 text-sm text-green-700">{{ message }}</p>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card">
        <h2 class="mb-3 font-semibold">Sesión actual</h2>
        <pre class="overflow-auto rounded bg-slate-50 p-3 text-xs">{{ currentSession }}</pre>
        <button class="btn-secondary mt-3" @click="loadCurrent">Recargar</button>
      </div>

      <form class="card space-y-3" @submit.prevent="openCash">
        <h2 class="font-semibold">Abrir caja</h2>
        <div>
          <label class="label">Monto inicial</label>
          <input v-model="openForm.opening_cash_amount" type="number" step="0.01" class="input" />
        </div>
        <button class="btn-primary">Abrir</button>
      </form>

      <form class="card space-y-3" @submit.prevent="closeCash">
        <h2 class="font-semibold">Cerrar caja</h2>
        <div>
          <label class="label">Contado final</label>
          <input v-model="closeForm.closing_cash_counted" type="number" step="0.01" class="input" />
        </div>
        <div>
          <label class="label">Notas</label>
          <input v-model="closeForm.notes" class="input" />
        </div>
        <button class="btn-primary">Cerrar</button>
      </form>
    </div>

    <form class="card space-y-3" @submit.prevent="addMovement">
      <h2 class="font-semibold">Movimiento de caja</h2>
      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label class="label">Tipo</label>
          <select v-model="movementForm.type" class="input">
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        <div>
          <label class="label">Monto</label>
          <input v-model="movementForm.amount" type="number" step="0.01" class="input" />
        </div>
        <div>
          <label class="label">Motivo</label>
          <input v-model="movementForm.reason" class="input" />
        </div>
      </div>
      <button class="btn-primary">Registrar movimiento</button>
    </form>
  </div>
</template>
