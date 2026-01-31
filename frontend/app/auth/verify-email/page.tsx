'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
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
      setMessage(response.message || 'Email verified')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Verification failed')
    }
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      <AuthHeader />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white border-4 border-black">
            <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
              <span>Email Verification</span>
            </div>
            <div className="p-8 text-center">
              {status === 'verifying' && (
                <>
                  <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <h2 className="text-xl font-bold mb-4">Verifying your email...</h2>
                  <p className="text-sm">Please wait while we verify your email address.</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="w-16 h-16 text-orange mx-auto mb-6" strokeWidth={2} />
                  <h2 className="text-xl font-bold mb-4">Email Verified</h2>
                  <p className="text-sm mb-6">{message}</p>
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
                  <XCircle className="w-16 h-16 text-orange mx-auto mb-6" strokeWidth={2} />
                  <h2 className="text-xl font-bold mb-4">Verification Failed</h2>
                  <p className="text-sm mb-6">{message}</p>
                  <div className="space-y-3">
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-blue flex flex-col">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white border-4 border-black">
              <div className="bg-black text-white py-3 px-5 text-[10px] uppercase tracking-widest">
                <span>Email Verification</span>
              </div>
              <div className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className="text-xl font-bold mb-4">Loading...</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
