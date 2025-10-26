'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Key } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { securityAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

interface TwoFactorData {
  enabled: boolean
  method: string | null
  verified?: boolean
  backupCodesRemaining: number
  recoveryEmail?: string
  enabledAt?: string
  lastUsed?: string
}

export default function TwoFactorStatus() {
  const [twoFactor, setTwoFactor] = useState<TwoFactorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTwoFactorStatus()
  }, [])

  const loadTwoFactorStatus = async () => {
    try {
      setLoading(true)
      const data = await securityAPI.getTwoFactorStatus()
      setTwoFactor(data)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load 2FA status', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className="text-xl font-bold">TWO-FACTOR AUTHENTICATION</h3>
        </div>
        <p className="font-mono text-sm">Loading 2FA status...</p>
      </Card>
    )
  }

  if (!twoFactor) {
    return null
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className="text-xl font-bold">TWO-FACTOR AUTHENTICATION</h3>
        </div>
        {twoFactor.enabled ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-green border border-black">
            <CheckCircle className="h-4 w-4" strokeWidth={2} />
            <span className="text-xs font-bold">ENABLED</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-red text-cream border border-black">
            <XCircle className="h-4 w-4" strokeWidth={2} />
            <span className="text-xs font-bold">DISABLED</span>
          </div>
        )}
      </div>

      <p className="font-mono text-sm mb-6 text-gray-600">
        Add an extra layer of security to your account
      </p>

      {!twoFactor.enabled ? (
        <div className="bg-yellow bg-opacity-20 p-6 border-2 border-black">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="font-bold mb-2">2FA Not Enabled</p>
              <p className="text-sm font-mono text-gray-700">
                Your account is vulnerable. Enable two-factor authentication to protect your dead
                man's switches from unauthorized access.
              </p>
            </div>
          </div>
          <Button variant="primary" className="!px-4 !py-2 text-xs">
            Enable 2FA
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-blue" strokeWidth={2} />
                <p className="text-xs font-bold uppercase text-gray-600">Method</p>
              </div>
              <p className="font-mono font-bold">{twoFactor.method || 'Unknown'}</p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue" strokeWidth={2} />
                <p className="text-xs font-bold uppercase text-gray-600">Backup Codes</p>
              </div>
              <p className="font-mono font-bold">
                {twoFactor.backupCodesRemaining} remaining
              </p>
              {twoFactor.backupCodesRemaining < 3 && (
                <p className="text-xs text-red mt-1">Generate new codes soon</p>
              )}
            </div>
          </div>

          {twoFactor.enabledAt && (
            <p className="text-sm font-mono text-gray-600">
              Enabled {formatDistanceToNow(new Date(twoFactor.enabledAt), { addSuffix: true })}
            </p>
          )}

          {twoFactor.lastUsed && (
            <p className="text-sm font-mono text-gray-600">
              Last used {formatDistanceToNow(new Date(twoFactor.lastUsed), { addSuffix: true })}
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="!px-4 !py-2 text-xs">
              Manage 2FA
            </Button>
            <Button variant="secondary" className="!px-4 !py-2 text-xs">
              View Backup Codes
            </Button>
          </div>
        </div>
      )}

      {twoFactor.recoveryEmail && (
        <div className="mt-6 p-4 bg-blue bg-opacity-10 border border-black">
          <p className="text-sm font-mono">
            <strong>Recovery Email:</strong> {twoFactor.recoveryEmail}
          </p>
        </div>
      )}
    </Card>
  )
}
