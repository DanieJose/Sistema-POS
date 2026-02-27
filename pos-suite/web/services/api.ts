import axios from 'axios'

let apiClient: ReturnType<typeof axios.create> | null = null

export function useApi() {
  const config = useRuntimeConfig()

  if (!apiClient) {
    apiClient = axios.create({
      baseURL: config.public.apiBaseUrl,
    })

    apiClient.interceptors.request.use((request) => {
      const auth = useAuthStore()
      let token = auth.token

      if (process.client && !token) {
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
        if (error?.response?.status === 401 && process.client) {
          const auth = useAuth()
          auth.logout()
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      },
    )
  }

  return apiClient
}
