import axios, { AxiosError } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        })

        const { accessToken } = response.data.data
        localStorage.setItem('accessToken', accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  signup: async (email: string, password: string) => {
    const response = await api.post('/auth/signup', { email, password })
    return response.data
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user } = response.data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    return { user, accessToken }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    await api.post('/auth/logout', { refreshToken })
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword })
    return response.data
  },
}

// Switches API
export const switchesAPI = {
  getAll: async () => {
    const response = await api.get('/switches')
    return response.data.data
  },

  getOne: async (id: string) => {
    const response = await api.get(`/switches/${id}`)
    return response.data.data
  },

  create: async (data: {
    title: string
    message: string
    checkInHours: number
    password: string
    recipients: Array<{ email: string; name: string }>
  }) => {
    const response = await api.post('/switches', data)
    return response.data.data
  },

  checkIn: async (id: string) => {
    const response = await api.post(`/switches/${id}/check-in`)
    return response.data
  },

  cancel: async (id: string) => {
    const response = await api.post(`/switches/${id}/cancel`)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/switches/${id}`)
    return response.data
  },
}

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/profile')
    return response.data.data
  },

  updateProfile: async (data: { email?: string; password?: string }) => {
    const response = await api.put('/user/profile', data)
    return response.data.data
  },
}

// Health check
export const healthCheck = async () => {
  const response = await axios.get(`${API_URL}/health`)
  return response.data
}

export default api
