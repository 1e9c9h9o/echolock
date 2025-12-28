import axios, { AxiosError } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// CSRF token storage (non-sensitive, can be in memory)
let csrfToken: string | null = null

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable sending cookies with requests (for httpOnly token cookies)
  withCredentials: true,
})

// Fetch CSRF token on initialization
const fetchCsrfToken = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/csrf-token`, {
      withCredentials: true,
    })
    csrfToken = response.data.csrfToken
    return csrfToken
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error)
    return null
  }
}

// Request interceptor to add CSRF token
api.interceptors.request.use(
  async (config) => {
    // For state-changing requests, add CSRF token
    const statefulMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
    if (config.method && statefulMethods.includes(config.method.toUpperCase())) {
      // Get CSRF token if we don't have one
      if (!csrfToken) {
        await fetchCsrfToken()
      }
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken
      }
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

    // Handle CSRF token errors
    if (error.response?.status === 403 &&
        (error.response?.data as any)?.error?.includes('CSRF')) {
      // Refresh CSRF token and retry
      await fetchCsrfToken()
      if (csrfToken) {
        originalRequest.headers['X-CSRF-Token'] = csrfToken
        return api(originalRequest)
      }
    }

    // Handle expired access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token (cookie-based)
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true,
        })

        // Token is automatically set in httpOnly cookie by the server
        return api(originalRequest)
      } catch (refreshError) {
        // Clear any frontend state and redirect to login
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Initialize CSRF token on module load
if (typeof window !== 'undefined') {
  fetchCsrfToken()
}

// Auth API
export const authAPI = {
  signup: async (email: string, password: string) => {
    const response = await api.post('/auth/signup', { email, password })
    return response.data
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { user } = response.data.data
    // Tokens are now stored in httpOnly cookies by the server
    // Fetch new CSRF token after login
    await fetchCsrfToken()
    return { user }
  },

  logout: async () => {
    await api.post('/auth/logout', {})
    // Cookies are cleared by the server
    // Clear CSRF token
    csrfToken = null
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword })
    return response.data
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token })
    return response.data
  },
}

// Switches API
export const switchesAPI = {
  getAll: async () => {
    const response = await api.get('/switches')
    return response.data.data.switches || []
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

  getCheckIns: async (id: string) => {
    const response = await api.get(`/switches/${id}/check-ins`)
    return response.data.data
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

  deleteAccount: async (password: string) => {
    const response = await api.delete('/users/me', {
      data: { password }
    })
    return response.data
  },
}

// Health check
export const healthCheck = async () => {
  const response = await axios.get(`${API_URL}/health`)
  return response.data
}

// Security API
export const securityAPI = {
  // Session Management
  getSessions: async () => {
    const response = await api.get('/security/sessions')
    return response.data.data
  },

  revokeSession: async (sessionId: string) => {
    const response = await api.post(`/security/sessions/${sessionId}/revoke`)
    return response.data
  },

  revokeAllSessions: async () => {
    const response = await api.post('/security/sessions/revoke-all')
    return response.data
  },

  // Audit Log
  getAuditLog: async (limit = 50, offset = 0) => {
    const response = await api.get('/security/audit-log', {
      params: { limit, offset }
    })
    return response.data.data
  },

  // 2FA
  getTwoFactorStatus: async () => {
    const response = await api.get('/security/2fa/status')
    return response.data.data
  },

  // Emergency Controls
  pauseAllSwitches: async () => {
    const response = await api.post('/security/emergency/pause-all')
    return response.data
  },

  // Security Stats
  getSecurityStats: async () => {
    const response = await api.get('/security/stats')
    return response.data.data
  },
}

export default api
