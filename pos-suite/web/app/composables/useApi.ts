import axios from 'axios'

let apiClient: ReturnType<typeof axios.create> | null = null
let interceptorsRegistered = false

export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  if (!apiClient) {
    apiClient = axios.create({
      baseURL: config.public.apiBaseUrl,
    })
  }

  if (!interceptorsRegistered && apiClient) {
    apiClient.interceptors.request.use((request) => {
      let token = auth.token

      if (!token && process.client) {
        token = localStorage.getItem('pos_auth_token')
      }

      if (token) {
        request.headers = request.headers || {}
        request.headers.Authorization = `Bearer ${token}`
      }

      return request
    })

    apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          auth.clearSession()
          if (process.client && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      },
    )

    interceptorsRegistered = true
  }

  return apiClient
}
