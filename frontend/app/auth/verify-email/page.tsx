'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import { authAPI } from '@/lib/api'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    verifyEmail()
  }, [token])

  const verifyEmail = async () => {
    try {
      const response = await authAPI.verifyEmail(token!)
      setStatus('success')
      setMessage(response.message || 'Email verified successfully')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Verification failed')
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-16">
          <Logo className="w-20 h-20 mx-auto mb-8" />
          <h1 className="text-5xl font-extrabold">Email Verification</h1>
        </div>

        {/* Status card */}
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 border-4 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                <h2 className="text-2xl font-bold mb-4">Verifying your email...</h2>
                <p className="text-base font-mono">Please wait while we verify your email address.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-20 h-20 text-green mx-auto mb-8" strokeWidth={2} />
                <h2 className="text-2xl font-bold mb-4">Email Verified!</h2>
                <p className="text-base font-mono mb-8">{message}</p>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/auth/login')}
                >
                  Continue to Login
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-20 h-20 text-red mx-auto mb-8" strokeWidth={2} />
                <h2 className="text-2xl font-bold mb-4">Verification Failed</h2>
                <p className="text-base font-mono mb-8">{message}</p>
                <div className="space-y-4">
                  <Link href="/auth/signup" className="block">
                    <Button variant="primary" className="w-full">
                      Sign Up Again
                    </Button>
                  </Link>
                  <Link href="/auth/login" className="block">
                    <Button variant="secondary" className="w-full">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </>
            )}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-16">
            <Logo className="w-20 h-20 mx-auto mb-8" />
            <h1 className="text-5xl font-extrabold">Email Verification</h1>
          </div>
          <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
              <h2 className="text-2xl font-bold mb-4">Loading...</h2>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
