import axios from 'axios'

let apiClient: ReturnType<typeof axios.create> | null = null

export function useApi() {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('pos_token', { default: () => null, sameSite: 'lax' })

  if (!apiClient) {
    apiClient = axios.create({
      baseURL: config.public.apiBaseUrl,
    })

    apiClient.interceptors.request.use((request) => {
      if (token.value) {
        request.headers = request.headers || {}
        request.headers.Authorization = `Bearer ${token.value}`
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
