export function useAuth() {
  const store = useAuthStore()

  if (process.client && !store.token) {
    store.hydrateFromStorage()
  }

  return {
    token: computed({
      get: () => store.token,
      set: (value) => {
        if (!value) {
          store.clearSession()
        } else {
          store.setSession(value, store.user)
        }
      },
    }),
    user: computed(() => store.user),
    role: computed(() => store.role),
    isAuthenticated: computed(() => store.isAuthenticated),
    setSession: (token: string, user: any) => store.setSession(token, user),
    logout: () => store.clearSession(),
  }
}
