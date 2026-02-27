<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const currentSession = ref<any>(null)
const openForm = reactive({ opening_amount: 1000 })
const movementForm = reactive({ type: 'OUT', amount: 100, reason: '' })
const closeForm = reactive({ counted_cash: 1000, notes: '' })
const message = ref('')
const errorMessage = ref('')
const loading = ref(false)

const hasOpenSession = computed(() => Boolean(currentSession.value))
const isNegativeOpenAmount = computed(() => Number(openForm.opening_amount) < 0)
const isInvalidMovementAmount = computed(() => Number(movementForm.amount) <= 0)
const isNegativeCountedCash = computed(() => Number(closeForm.counted_cash) < 0)

function clearMessages() {
  message.value = ''
  errorMessage.value = ''
}

async function loadCurrent() {
  loading.value = true
  try {
    const { data } = await api.get('/cash/current')
    currentSession.value = data.data
  } finally {
    loading.value = false
  }
}

async function openCash() {
  if (isNegativeOpenAmount.value) {
    errorMessage.value = 'El monto de apertura no puede ser negativo'
    return
  }

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
  if (isInvalidMovementAmount.value) {
    errorMessage.value = 'El monto del movimiento debe ser mayor a 0'
    return
  }

  if (!movementForm.reason.trim()) {
    errorMessage.value = 'Debe agregar un motivo'
    return
  }

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
  if (isNegativeCountedCash.value) {
    errorMessage.value = 'El efectivo contado no puede ser negativo'
    return
  }

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
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">Caja</h1>
      <button class="btn-secondary" :disabled="loading" @click="loadCurrent">{{ loading ? 'Cargando...' : 'Recargar' }}</button>
    </div>

    <p v-if="message" class="rounded bg-green-50 p-3 text-sm text-green-700">{{ message }}</p>
    <p v-if="errorMessage" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <div class="card">
      <h2 class="mb-2 text-lg font-semibold">Estado actual</h2>
      <p class="text-sm text-slate-700">
        Estado:
        <strong :class="hasOpenSession ? 'text-emerald-700' : 'text-amber-700'">
          {{ hasOpenSession ? 'Abierta' : 'Cerrada' }}
        </strong>
      </p>
      <p v-if="hasOpenSession" class="mt-2 text-sm text-slate-600">
        Sesión #{{ currentSession.id }} · apertura: L {{ currentSession.opening_amount }}
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <form class="card space-y-3" @submit.prevent="openCash">
        <h2 class="font-semibold">Abrir caja</h2>
        <div>
          <label class="label">Monto inicial</label>
          <input v-model.number="openForm.opening_amount" min="0" type="number" step="0.01" class="input" />
        </div>
        <button class="btn-primary" :disabled="hasOpenSession || isNegativeOpenAmount">Abrir</button>
      </form>

      <form class="card space-y-3" @submit.prevent="addMovement">
        <h2 class="font-semibold">Registrar salida/entrada</h2>
        <div>
          <label class="label">Tipo</label>
          <select v-model="movementForm.type" class="input">
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        <div>
          <label class="label">Monto</label>
          <input v-model.number="movementForm.amount" min="0.01" type="number" step="0.01" class="input" />
        </div>
        <div>
          <label class="label">Motivo</label>
          <input v-model="movementForm.reason" class="input" />
        </div>
        <button class="btn-primary" :disabled="!hasOpenSession || isInvalidMovementAmount">Registrar movimiento</button>
      </form>

      <form class="card space-y-3" @submit.prevent="closeCash">
        <h2 class="font-semibold">Cerrar caja + arqueo</h2>
        <div>
          <label class="label">Efectivo contado</label>
          <input v-model.number="closeForm.counted_cash" min="0" type="number" step="0.01" class="input" />
        </div>
        <div>
          <label class="label">Notas</label>
          <input v-model="closeForm.notes" class="input" />
        </div>
        <button class="btn-primary" :disabled="!hasOpenSession || isNegativeCountedCash">Cerrar</button>
      </form>
    </div>

    <div v-if="currentSession?.movements?.length" class="card">
      <h2 class="mb-3 font-semibold">Movimientos</h2>
      <ul class="space-y-2 text-sm">
        <li v-for="movement in currentSession.movements" :key="movement.id" class="rounded border p-2">
          <strong>{{ movement.type }}</strong> · L {{ movement.amount }} · {{ movement.reason }}
        </li>
      </ul>
    </div>
  </div>
</template>
