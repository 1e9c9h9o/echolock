'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { authAPI } from '@/lib/api'

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
      setError('Minimum 8 characters required')
      return
    }

    if (password !== confirmPassword) {
      setError('Password mismatch')
      return
    }

    setLoading(true)

    try {
      await authAPI.signup(email, password)
      router.push('/auth/login?message=Account created')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-16">
          <Logo className="w-20 h-20 mx-auto mb-8" />
          <h1 className="text-5xl font-extrabold">Sign Up</h1>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
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
