import axios, { AxiosError } from 'axios'

// In production, NEXT_PUBLIC_API_URL is empty (API proxied through Vercel rewrites)
// In development, set NEXT_PUBLIC_API_URL=http://localhost:3000 in .env.local
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

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
    const data = response.data.data

    // Check if 2FA is required
    if (data.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        challengeToken: data.challengeToken,
        user: data.user,
      }
    }

    // Tokens are now stored in httpOnly cookies by the server
    // Fetch new CSRF token after login
    await fetchCsrfToken()
    return { user: data.user, requiresTwoFactor: false }
  },

  // Complete login with 2FA verification
  verify2FA: async (challengeToken: string, code: string) => {
    const response = await api.post('/auth/2fa/verify', { challengeToken, code })
    const { user } = response.data.data
    // Fetch new CSRF token after successful 2FA
    await fetchCsrfToken()
    return { user, usedBackupCode: response.data.data.usedBackupCode }
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

  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email })
    return response.data
  },

  // Verify current session and get user info
  // Returns user if session is valid, null if not authenticated
  getMe: async () => {
    try {
      const response = await api.get('/users/me')
      return response.data.data.user || response.data.user || null
    } catch (error) {
      // 401 means not authenticated, which is expected
      return null
    }
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

  // Legacy: Server-side encryption (deprecated, will be removed)
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

  // NEW: Client-side encryption - keys never leave the browser
  // See CLAUDE.md - Phase 1: User-Controlled Keys
  createEncrypted: async (data: {
    title: string
    checkInHours: number
    recipients: Array<{ email: string; name: string }>
    encryptedMessage: {
      ciphertext: string
      iv: string
      authTag: string
    }
    shares: Array<{
      index: number
      data: string
      hmac: string
    }>
    nostrPublicKey: string
    clientSideEncryption: true
  }) => {
    const response = await api.post('/switches/encrypted', data)
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

  // Test Drill Mode
  testDrill: async (id: string, options: { sendTestEmails?: boolean } = {}) => {
    const response = await api.post(`/switches/${id}/test-drill`, options)
    return response.data.data
  },

  // Vacation Mode
  setVacationMode: async (id: string, options: {
    enabled: boolean
    extendHours?: number
    until?: string
  }) => {
    const response = await api.post(`/switches/${id}/vacation-mode`, options)
    return response.data.data
  },

  // Quick Check-In Link
  generateCheckInLink: async (id: string, expiresInHours = 24) => {
    const response = await api.post(`/switches/${id}/generate-checkin-link`, { expiresInHours })
    return response.data.data
  },
}

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/me')
    return response.data.data
  },

  updateProfile: async (data: { displayName?: string; bio?: string }) => {
    const response = await api.patch('/users/me', data)
    return response.data
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.patch('/users/me', { currentPassword, newPassword })
    return response.data
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  removeAvatar: async () => {
    const response = await api.delete('/users/me/avatar')
    return response.data
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

  setup2FA: async () => {
    const response = await api.post('/security/2fa/setup')
    return response.data.data
  },

  verifySetup2FA: async (code: string) => {
    const response = await api.post('/security/2fa/verify-setup', { code })
    return response.data.data
  },

  enable2FA: async (code: string) => {
    const response = await api.post('/security/2fa/enable', { code })
    return response.data.data
  },

  disable2FA: async (code: string) => {
    const response = await api.post('/security/2fa/disable', { code })
    return response.data.data
  },

  regenerateBackupCodes: async (code: string) => {
    const response = await api.post('/security/2fa/backup-codes/regenerate', { code })
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
