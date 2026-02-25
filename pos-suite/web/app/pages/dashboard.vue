<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const auth = useAuthStore()
const dashboard = ref<any>(null)
const summary = ref<any>(null)
const loading = ref(false)
const errorMessage = ref('')
const isCashier = computed(() => auth.role === 'CASHIER')

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [dashboardRes, notificationsRes] = await Promise.all([
      api.get('/reports/dashboard'),
      api.get('/notifications/summary'),
    ])
    dashboard.value = dashboardRes.data.data
    summary.value = notificationsRes.data.data
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo cargar dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-sm text-slate-500">Resumen operativo del POS</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadData">
        {{ loading ? 'Cargando...' : 'Recargar' }}
      </button>
    </div>

    <p v-if="errorMessage" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>
    <div v-if="loading && !dashboard" class="card text-sm text-slate-600">Cargando datos del dashboard...</div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <div class="card">
        <p class="text-xs uppercase text-slate-500">Ventas hoy</p>
        <p class="mt-2 text-2xl font-semibold">L {{ dashboard?.ventas_hoy ?? 0 }}</p>
      </div>
      <div class="card">
        <p class="text-xs uppercase text-slate-500">Ganancia hoy</p>
        <p class="mt-2 text-2xl font-semibold">
          {{ isCashier ? 'Oculto' : `L ${dashboard?.ganancia_hoy ?? 0}` }}
        </p>
      </div>
      <div class="card">
        <p class="text-xs uppercase text-slate-500">Apartados por vencer</p>
        <p class="mt-2 text-2xl font-semibold">{{ dashboard?.apartados_por_vencer ?? 0 }}</p>
      </div>
      <div class="card">
        <p class="text-xs uppercase text-slate-500">Stock bajo</p>
        <p class="mt-2 text-2xl font-semibold">{{ dashboard?.stock_bajo?.length ?? 0 }}</p>
      </div>
      <div class="card">
        <p class="text-xs uppercase text-slate-500">No leídas</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary?.unread_total ?? 0 }}</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div v-if="!isCashier" class="card">
        <h2 class="font-semibold">Meta actual</h2>
        <pre class="mt-3 overflow-auto rounded bg-slate-50 p-3 text-xs">{{ dashboard?.meta_actual_progreso }}</pre>
      </div>
      <div class="card">
        <h2 class="font-semibold">Notificaciones recientes</h2>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="n in summary?.top_recent || []" :key="n._id" class="rounded border p-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium">{{ n.title }}</span>
              <span class="text-xs uppercase text-slate-500">{{ n.severity }}</span>
            </div>
            <p class="text-slate-600">{{ n.message }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
