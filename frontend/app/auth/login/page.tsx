'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { showToast } from '@/components/ui/ToastContainer'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)

  // Login form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false)
  const [challengeToken, setChallengeToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authAPI.login(email, password)

      if (result.requiresTwoFactor) {
        // 2FA required - show 2FA form
        setRequires2FA(true)
        setChallengeToken(result.challengeToken)
        setLoading(false)
        return
      }

      // No 2FA - login complete
      setUser(result.user)
      showToast('Login successful! Redirecting...', 'success', 2000)
      setTimeout(() => router.push('/dashboard'), 500)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authAPI.verify2FA(challengeToken, totpCode)
      setUser(result.user)

      if (result.usedBackupCode) {
        showToast('Login successful! Consider regenerating your backup codes.', 'success', 4000)
      } else {
        showToast('Login successful! Redirecting...', 'success', 2000)
      }

      setTimeout(() => router.push('/dashboard'), 500)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Invalid code. Please try again.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setRequires2FA(false)
    setChallengeToken('')
    setTotpCode('')
    setError('')
    setUseBackupCode(false)
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-4">
              <div className="w-10 h-10">
                <LogoMark className="w-full h-full text-white" />
              </div>
              <span className="text-sm font-bold tracking-[0.2em] uppercase">Echolock</span>
            </Link>
          </div>
        </div>
      </header>
      <div className="h-2 hazard-stripe" />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-white border-4 border-black">
            <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
              <span>User Authentication</span>
            </div>
            <div className="p-8">
              {!requires2FA ? (
                <>
                  <h1 className="text-2xl font-bold mb-6">Login</h1>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />

                    <div>
                      <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                      />
                      <div className="mt-2 text-right">
                        <Link href="/auth/forgot-password" className="text-xs text-black hover:text-orange font-bold uppercase tracking-wider">
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-orange text-black p-3 border-2 border-black">
                        <p className="text-sm font-bold">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t-2 border-black/20">
                    <p className="text-sm text-center">
                      No account?{' '}
                      <Link href="/auth/signup" className="text-orange hover:underline font-bold">
                        Sign up
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* 2FA Verification Form */}
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-black mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange/10 rounded">
                      <Shield className="w-6 h-6 text-orange" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
                      <p className="text-sm text-gray-600">
                        {email}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handle2FASubmit} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                        {useBackupCode ? 'Backup Code' : 'Authentication Code'}
                      </label>
                      <Input
                        type="text"
                        value={totpCode}
                        onChange={(e) => {
                          if (useBackupCode) {
                            // Backup codes: allow alphanumeric and dashes
                            setTotpCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10))
                          } else {
                            // TOTP codes: only digits
                            setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                        }}
                        placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                        maxLength={useBackupCode ? 10 : 6}
                        className="text-center font-mono text-xl tracking-widest"
                        autoComplete="one-time-code"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {useBackupCode
                          ? 'Enter one of your backup codes'
                          : 'Enter the 6-digit code from your authenticator app'
                        }
                      </p>
                    </div>

                    {error && (
                      <div className="bg-orange text-black p-3 border-2 border-black">
                        <p className="text-sm font-bold">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={loading || (useBackupCode ? totpCode.length < 8 : totpCode.length !== 6)}
                    >
                      {loading ? 'Verifying...' : 'Verify & Login'}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setUseBackupCode(!useBackupCode)
                          setTotpCode('')
                          setError('')
                        }}
                        className="text-sm text-gray-600 hover:text-black underline"
                      >
                        {useBackupCode ? 'Use authenticator app instead' : 'Lost your device? Use a backup code'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-black hover:text-orange font-bold">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
