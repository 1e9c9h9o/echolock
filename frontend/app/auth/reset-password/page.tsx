'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, CheckCircle } from 'lucide-react'
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

function AuthHeader() {
  return (
    <>
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
    </>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Invalid reset link')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-blue flex flex-col">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white border-4 border-black">
              <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
                <span>Password Reset</span>
              </div>
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-slate-500 mx-auto mb-6" strokeWidth={2} />
                <h2 className="text-xl font-bold mb-4">Password Reset</h2>
                <p className="text-sm text-slate-600 mb-6">
                  Your password has been reset. You can now log in with your new password.
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/auth/login')}
                >
                  Continue to Login
                </Button>
              </div>
            </div>
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

  if (!token) {
    return (
      <div className="min-h-screen bg-blue flex flex-col">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white border-4 border-black">
              <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
                <span>Invalid Link</span>
              </div>
              <div className="p-8 text-center">
                <p className="text-sm mb-6">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <div className="space-y-3">
                  <Link href="/auth/forgot-password" className="block">
                    <Button variant="primary" className="w-full">
                      Request New Link
                    </Button>
                  </Link>
                  <Link href="/auth/login" className="block">
                    <Button variant="secondary" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
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

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      <AuthHeader />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white border-4 border-black">
            <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
              <span>Reset Password</span>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-orange mx-auto mb-4" strokeWidth={2} />
                <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                <p className="text-sm opacity-70">Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />

                <Input
                  label="Confirm New Password"
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
                  {loading ? 'Resetting...' : 'Reset Password'}
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
            </div>
          </div>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-blue flex flex-col">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white border-4 border-black">
              <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
                <span>Reset Password</span>
              </div>
              <div className="p-8 text-center">
                <p className="text-sm">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
