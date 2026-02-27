'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Shield,
  AlertTriangle,
  Home
} from 'lucide-react'
import Button from '@/components/ui/Button'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

type CheckInStatus = 'loading' | 'confirming' | 'success' | 'error' | 'expired' | 'used'

export default function QuickCheckInPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<CheckInStatus>('loading')
  const [switchTitle, setSwitchTitle] = useState<string>('')
  const [newExpiresAt, setNewExpiresAt] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/quick-checkin/${token}/validate`)
      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Token expired') {
          setStatus('expired')
        } else if (data.error === 'Token already used') {
          setStatus('used')
        } else {
          setStatus('error')
          setErrorMessage(data.message || 'Invalid check-in link')
        }
        return
      }

      setSwitchTitle(data.data.switchTitle)
      setStatus('confirming')
    } catch (error) {
      setStatus('error')
      setErrorMessage('Failed to validate check-in link')
    }
  }

  const performCheckIn = async () => {
    setStatus('loading')
    try {
      const response = await fetch(`/api/quick-checkin/${token}`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setErrorMessage(data.message || 'Check-in failed')
        return
      }

      setNewExpiresAt(data.data.newExpiresAt)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage('Check-in failed. Please try again.')
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
          <div className="bg-white border-2 border-black">
            <div className="bg-black text-white py-3 px-5 text-[11px] uppercase tracking-widest">
              <span>Quick Check-In</span>
            </div>

            <div className="p-8">
              {/* Loading State */}
              {status === 'loading' && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-orange" />
                  <p className="font-mono text-sm">Validating check-in link...</p>
                </div>
              )}

              {/* Confirming State */}
              {status === 'confirming' && (
                <>
                  <div className="text-center mb-6">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-orange" />
                    <h1 className="text-2xl font-bold mb-2">Confirm Check-In</h1>
                    <p className="text-sm text-gray-600">
                      You're about to check in to:
                    </p>
                  </div>

                  <div className="bg-gray-100 border-2 border-black p-4 mb-6 text-center">
                    <p className="font-bold text-lg">{switchTitle}</p>
                  </div>

                  <p className="text-sm text-center mb-6">
                    This will reset your switch timer. Click the button below to confirm.
                  </p>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={performCheckIn}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirm Check-In
                  </Button>

                  <p className="text-xs text-center text-gray-500 mt-4">
                    This link can only be used once.
                  </p>
                </>
              )}

              {/* Success State */}
              {status === 'success' && (
                <div className="text-center">
                  <div className="bg-blue border border-black/10 p-6 mb-6">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-black/70" />
                    <h2 className="text-xl font-bold mb-2">
                      Check-In Complete
                    </h2>
                    <p className="text-sm text-black/70">
                      Your switch timer has been reset.
                    </p>
                  </div>

                  <div className="bg-gray-100 p-4 border border-gray-200 mb-6">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono">
                        Next check-in by:{' '}
                        {new Date(newExpiresAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Link href="/dashboard">
                    <Button variant="secondary" className="w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              )}

              {/* Expired State */}
              {status === 'expired' && (
                <div className="text-center">
                  <div className="bg-orange/10 border-2 border-orange p-6 mb-6">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-orange" />
                    <h2 className="text-xl font-bold mb-2">Link Expired</h2>
                    <p className="text-sm">
                      This check-in link has expired. Please generate a new one
                      from your dashboard.
                    </p>
                  </div>

                  <Link href="/dashboard">
                    <Button variant="primary" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              )}

              {/* Used State */}
              {status === 'used' && (
                <div className="text-center">
                  <div className="bg-blue/10 border-2 border-blue p-6 mb-6">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-blue" />
                    <h2 className="text-xl font-bold mb-2">Already Used</h2>
                    <p className="text-sm">
                      This check-in link has already been used.
                      Your switch was checked in.
                    </p>
                  </div>

                  <Link href="/dashboard">
                    <Button variant="primary" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="text-center">
                  <div className="bg-red-50 border-2 border-red-600 p-6 mb-6">
                    <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                    <h2 className="text-xl font-bold text-red-800 mb-2">
                      Check-In Failed
                    </h2>
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>

                  <Link href="/dashboard">
                    <Button variant="primary" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
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
