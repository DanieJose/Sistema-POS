export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  const auth = useAuthStore()
  if (process.client && !auth.token && localStorage.getItem('pos_auth_token')) {
    auth.hydrateFromStorage()
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }
})
