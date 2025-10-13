'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { authAPI } from '@/lib/api'

export default function ResetPasswordPage() {
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
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-16">
            <Logo className="w-20 h-20 mx-auto mb-8" />
            <h1 className="text-5xl font-extrabold">Password Reset</h1>
          </div>

          {/* Success card */}
          <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green mx-auto mb-8" strokeWidth={2} />
              <h2 className="text-2xl font-bold mb-4">Password Reset Complete!</h2>
              <p className="text-base font-mono mb-8">
                Your password has been successfully reset. You can now log in with your new password.
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

  if (!token) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-16">
            <Logo className="w-20 h-20 mx-auto mb-8" />
            <h1 className="text-5xl font-extrabold">Invalid Link</h1>
          </div>

          {/* Error card */}
          <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
            <div className="text-center">
              <p className="text-base font-mono mb-8">
                This password reset link is invalid or has expired.
                Please request a new one.
              </p>
              <div className="space-y-4">
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
          <h1 className="text-5xl font-extrabold">Reset Password</h1>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
          <div className="mb-8">
            <Lock className="w-12 h-12 text-blue mx-auto mb-4" strokeWidth={2} />
            <p className="text-base font-mono text-center">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Minimum 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
              {loading ? 'Resetting...' : 'Reset Password'}
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
