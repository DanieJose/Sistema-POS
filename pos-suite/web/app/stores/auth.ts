import { defineStore } from 'pinia'

type AuthUser = {
  id: number
  name?: string
  email?: string
  role?: string
  role_id?: number
} | null

const TOKEN_KEY = 'pos_auth_token'
const USER_KEY = 'pos_auth_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null as AuthUser,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    role: (state) => state.user?.role || 'CASHIER',
  },
  actions: {
    setSession(token: string, user: AuthUser) {
      this.token = token
      this.user = user
      this.persist()
    },
    clearSession() {
      this.token = null
      this.user = null
      this.persist()
    },
    hydrateFromStorage() {
      if (!process.client) return
      const rawToken = localStorage.getItem(TOKEN_KEY)
      const rawUser = localStorage.getItem(USER_KEY)
      this.token = rawToken || null
      if (rawUser) {
        try {
          this.user = JSON.parse(rawUser)
        } catch {
          this.user = null
        }
      } else {
        this.user = null
      }
    },
    persist() {
      if (!process.client) return
      if (this.token) localStorage.setItem(TOKEN_KEY, this.token)
      else localStorage.removeItem(TOKEN_KEY)

      if (this.user) localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      else localStorage.removeItem(USER_KEY)
    },
  },
})
