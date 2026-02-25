<script setup lang="ts">
const auth = useAuth()

const allLinks = [
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/pos', label: 'POS', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/inventory', label: 'Inventario', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/layaways', label: 'Apartados', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/customers', label: 'Clientes', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/cash', label: 'Caja', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/billing', label: 'Facturación', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
  { to: '/reports', label: 'Reportes', roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/settings', label: 'Configuración', roles: ['ADMIN'] },
  { to: '/notifications', label: 'Alertas', roles: ['ADMIN', 'SUPERVISOR', 'CASHIER'] },
]

const links = computed(() => allLinks.filter((item) => item.roles.includes(auth.role.value)))
</script>

<template>
  <aside class="w-full border-r border-slate-200 bg-white md:w-64">
    <div class="border-b border-slate-200 px-4 py-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">POS Suite</p>
      <p class="text-lg font-bold">Admin / POS</p>
    </div>
    <nav class="space-y-1 p-3">
      <NuxtLink
        v-for="item in links"
        :key="item.to"
        :to="item.to"
        class="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        active-class="bg-slate-900 text-white hover:bg-slate-900"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
