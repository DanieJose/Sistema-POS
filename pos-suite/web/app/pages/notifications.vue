<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const api = useApi()
const list = ref<any[]>([])
const summary = ref<any>(null)
const filters = reactive({ read: 'false', severity: '', type: '', limit: 20 })
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const params: any = { ...filters }
    if (!params.severity) delete params.severity
    if (!params.type) delete params.type
    const [listRes, summaryRes] = await Promise.all([
      api.get('/notifications', { params }),
      api.get('/notifications/summary'),
    ])
    list.value = listRes.data.data || []
    summary.value = summaryRes.data.data || null
  } finally {
    loading.value = false
  }
}

async function markRead(id: string) {
  await api.patch(`/notifications/${id}/read`)
  await loadData()
}

async function readAll() {
  await api.patch('/notifications/read-all')
  await loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Notificaciones</h1>
      <div class="flex gap-2">
        <button class="btn-secondary" @click="loadData">Recargar</button>
        <button class="btn-primary" @click="readAll">Marcar todas</button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <div class="card"><p class="text-xs text-slate-500">No leídas</p><p class="text-xl font-semibold">{{ summary?.unread_total ?? 0 }}</p></div>
      <div class="card"><p class="text-xs text-slate-500">Info</p><p class="text-xl font-semibold">{{ summary?.unread_by_severity?.info ?? 0 }}</p></div>
      <div class="card"><p class="text-xs text-slate-500">Warning</p><p class="text-xl font-semibold">{{ summary?.unread_by_severity?.warning ?? 0 }}</p></div>
      <div class="card"><p class="text-xs text-slate-500">Critical</p><p class="text-xl font-semibold">{{ summary?.unread_by_severity?.critical ?? 0 }}</p></div>
    </div>

    <div class="card">
      <div class="grid gap-3 md:grid-cols-4">
        <div>
          <label class="label">Read</label>
          <select v-model="filters.read" class="input">
            <option value="false">No leídas</option>
            <option value="true">Leídas</option>
          </select>
        </div>
        <div>
          <label class="label">Severity</label>
          <select v-model="filters.severity" class="input">
            <option value="">Todas</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
          </select>
        </div>
        <div>
          <label class="label">Type</label>
          <input v-model="filters.type" class="input" placeholder="LOW_STOCK..." />
        </div>
        <div class="flex items-end">
          <button class="btn-primary w-full" @click="loadData">Aplicar</button>
        </div>
      </div>
    </div>

    <div class="card" v-if="loading">Cargando...</div>
    <div v-else class="space-y-3">
      <div v-for="n in list" :key="n._id" class="card">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase text-slate-500">{{ n.type }} · {{ n.severity }}</p>
            <h3 class="font-semibold">{{ n.title }}</h3>
            <p class="text-sm text-slate-600">{{ n.message }}</p>
            <p class="mt-2 text-xs text-slate-500">Entity: {{ n.entity?.kind }} / {{ n.entity?.id }}</p>
          </div>
          <button v-if="!n.read" class="btn-secondary" @click="markRead(n._id)">Marcar leída</button>
        </div>
      </div>
    </div>
  </div>
</template>
