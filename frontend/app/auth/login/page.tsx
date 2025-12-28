'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user } = await authAPI.login(email, password)
      setUser(user)
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
