'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { showToast } from '@/components/ui/ToastContainer'

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
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-blue/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-red/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <Logo className="w-20 h-20 mx-auto mb-8 hover:scale-110 transition-transform duration-300 animate-float" />
          <h1 className="text-5xl font-extrabold gradient-text">Login</h1>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12 hover:shadow-[12px_12px_0px_0px_rgba(33,33,33,1)] transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSubmit} className="space-y-8">
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
                <Link href="/auth/forgot-password" className="text-sm text-blue hover:underline font-bold">
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red text-white p-3 border-2 border-black">
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

          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <p className="text-base text-center font-mono">
              No account?{' '}
              <Link href="/auth/signup" className="text-blue hover:underline font-bold">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-base text-blue hover:underline font-bold font-mono">
            ← Back
          </Link>
        </div>
      </div>
    </div>
  )
}
