'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

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
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
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
          <h2 className="text-xl font-bold text-secondary mb-grid-4">Log in</h2>

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
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <div className="mt-grid-4 pt-grid-4 border-t border-border">
            <p className="text-sm text-text-secondary text-center">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
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
