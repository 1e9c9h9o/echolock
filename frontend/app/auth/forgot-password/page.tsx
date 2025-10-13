'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { authAPI } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authAPI.forgotPassword(email)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-16">
            <Logo className="w-20 h-20 mx-auto mb-8" />
            <h1 className="text-5xl font-extrabold">Check Your Email</h1>
          </div>

          {/* Success card */}
          <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green mx-auto mb-8" strokeWidth={2} />
              <h2 className="text-2xl font-bold mb-4">Reset Link Sent</h2>
              <p className="text-base font-mono mb-8">
                We've sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions.
              </p>
              <p className="text-sm font-mono text-gray-600 mb-8">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setSubmitted(false)}
                >
                  Send Again
                </Button>
                <Link href="/auth/login" className="block">
                  <Button variant="secondary" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-base text-blue hover:underline font-bold font-mono">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-16">
          <Logo className="w-20 h-20 mx-auto mb-8" />
          <h1 className="text-5xl font-extrabold">Forgot Password</h1>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
          <div className="mb-8">
            <Mail className="w-12 h-12 text-blue mx-auto mb-4" strokeWidth={2} />
            <p className="text-base font-mono text-center">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <p className="text-base text-center font-mono">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-blue hover:underline font-bold">
                Login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-base text-blue hover:underline font-bold font-mono">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
