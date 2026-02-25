<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Usuario')

async function logout() {
  auth.clearSession()
  if (process.client) {
    localStorage.removeItem('pos_auth_token')
    localStorage.removeItem('pos_auth_user')
  }
  await router.push('/login')
}
</script>

<template>
  <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
    <div>
      <p class="text-xs uppercase tracking-wide text-slate-500">Sesión</p>
      <p class="text-sm font-medium">
        {{ displayName }}
        <span class="text-slate-500">({{ auth.role }})</span>
      </p>
    </div>
    <button class="btn-secondary" @click="logout">Salir</button>
  </header>
</template>
