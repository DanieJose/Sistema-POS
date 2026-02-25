<script setup lang="ts">
const auth = useAuthStore()

onMounted(() => {
  if (process.client && !auth.token) {
    auth.hydrateFromStorage()
  }
})
</script>

<template>
  <div class="min-h-screen md:flex">
    <AppSidebar />
    <div class="flex min-h-screen flex-1 flex-col">
      <AppTopbar />
      <main class="flex-1 p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
