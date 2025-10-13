'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <Image src="/logo.png" alt="EchoLock" width={240} height={240} className="w-48 h-auto mx-auto mb-8" />
          <h1 className="text-4xl font-bold uppercase">Register Account</h1>
        </div>

        {/* Form */}
        <div className="border-2 border-black p-8">
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
              label="Confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />

            {error && (
              <div className="bg-warning text-white p-3 border-2 border-warning">
                <p className="text-xs font-bold uppercase">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-black">
            <p className="text-xs uppercase text-center">
              Have account?{' '}
              <Link href="/auth/login" className="underline hover:no-underline">
                Access here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs uppercase hover:underline">
            ← Return
          </Link>
        </div>
      </div>
    </div>
  )
}
