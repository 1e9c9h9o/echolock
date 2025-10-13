'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
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

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await authAPI.signup(email, password)
      router.push('/auth/login?message=Account created. Please log in.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-grid-3">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-grid-6">
          <div className="flex items-center justify-center mb-grid-3">
            <Shield className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-grid">EchoLock</h1>
          <p className="text-text-secondary">Cryptographic dead man's switch</p>
        </div>

        {/* Form */}
        <div className="bg-white border border-border p-grid-6">
          <h2 className="text-xl font-bold text-secondary mb-grid-4">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-grid-4">
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
              placeholder="••••••••"
              helperText="Minimum 8 characters"
              required
            />

            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="bg-accent bg-opacity-10 border border-accent p-grid-2 text-accent text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-grid-4 pt-grid-4 border-t border-border">
            <p className="text-sm text-text-secondary text-center">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-grid-4 text-center">
          <Link href="/" className="text-sm text-text-secondary hover:text-secondary">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
