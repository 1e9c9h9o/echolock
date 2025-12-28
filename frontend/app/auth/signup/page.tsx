'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authAPI } from '@/lib/api'
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

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters'
      setError(msg)
      showToast(msg, 'warning')
      return
    }

    if (!/[A-Z]/.test(password)) {
      const msg = 'Password must contain at least one uppercase letter'
      setError(msg)
      showToast(msg, 'warning')
      return
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match'
      setError(msg)
      showToast(msg, 'warning')
      return
    }

    setLoading(true)

    try {
      await authAPI.signup(email, password)
      showToast('Account created successfully! Please login.', 'success', 3000)
      setTimeout(() => router.push('/auth/login'), 1000)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.'
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
              <span>Create Account</span>
            </div>
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-6">Sign Up</h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />

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
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t-2 border-black/20">
                <p className="text-sm text-center">
                  Have an account?{' '}
                  <Link href="/auth/login" className="text-orange hover:underline font-bold">
                    Login
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
