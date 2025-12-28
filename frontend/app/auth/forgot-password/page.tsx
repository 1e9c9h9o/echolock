'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authAPI } from '@/lib/api'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

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
              <span>Password Recovery</span>
            </div>
            <div className="p-8">
              {submitted ? (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-orange mx-auto mb-6" strokeWidth={2} />
                  <h2 className="text-xl font-bold mb-4">Reset Link Sent</h2>
                  <p className="text-sm mb-6">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Check your inbox and follow the instructions.
                  </p>
                  <div className="space-y-3">
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
              ) : (
                <>
                  <div className="text-center mb-6">
                    <Mail className="w-12 h-12 text-orange mx-auto mb-4" strokeWidth={2} />
                    <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
                    <p className="text-sm opacity-70">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
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
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t-2 border-black/20">
                    <p className="text-sm text-center">
                      Remember your password?{' '}
                      <Link href="/auth/login" className="text-orange hover:underline font-bold">
                        Login
                      </Link>
                    </p>
                  </div>
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
