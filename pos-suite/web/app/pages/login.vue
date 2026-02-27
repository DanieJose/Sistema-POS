<script setup lang="ts">
definePageMeta({ layout: false })

const api = useApi()
const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  email: 'admin@pos.local',
  password: 'Admin123!',
})
const loading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  if (process.client) {
    auth.hydrateFromStorage()
  }
  if (auth.isAuthenticated) {
    router.push('/dashboard')
  }
})

async function submit() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post('/auth/login', form)
    auth.setSession(data.data.token, data.data.user)
    await router.push('/dashboard')
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 class="text-2xl font-bold">POS Suite</h1>
      <p class="mt-1 text-sm text-slate-500">Ingreso al panel Admin/POS</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" />
        </div>
        <div>
          <label class="label">Password</label>
          <input v-model="form.password" type="password" class="input" />
        </div>
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        <button class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>
