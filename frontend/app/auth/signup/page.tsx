'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { authAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

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

    // Client-side validation
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
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-blue/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-red/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <Logo className="w-20 h-20 mx-auto mb-8 hover:scale-110 transition-transform duration-300 animate-float" />
          <h1 className="text-5xl font-extrabold gradient-text">Sign Up</h1>
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

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />

            <Input
              label="Confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />

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
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <p className="text-base text-center font-mono">
              Have an account?{' '}
              <Link href="/auth/login" className="text-blue hover:underline font-bold">
                Login
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
