'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, ShieldCheck, ShieldOff, Key, Copy, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { securityAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

type SetupState = 'idle' | 'loading' | 'setup' | 'verify' | 'backup-codes' | 'enabled' | 'disabling'

interface TwoFactorStatus {
  enabled: boolean
  method: string | null
  verified: boolean
  backupCodesRemaining: number
  enabledAt: string | null
  lastUsed: string | null
}

interface SetupData {
  secret: string
  qrCodeUri: string
  manualEntryKey: string
}

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [setupState, setSetupState] = useState<SetupState>('loading')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const data = await securityAPI.getTwoFactorStatus()
      setStatus(data)
      setSetupState(data.enabled ? 'enabled' : 'idle')
    } catch (err) {
      console.error('Failed to load 2FA status:', err)
      setSetupState('idle')
    }
  }

  const handleStartSetup = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await securityAPI.setup2FA()
      setSetupData(data)
      setSetupState('setup')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySetup = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')
    try {
      await securityAPI.verifySetup2FA(code)
      setSetupState('verify')
      setCode('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnable = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await securityAPI.enable2FA(code)
      setBackupCodes(result.backupCodes)
      setSetupState('backup-codes')
      setCode('')
      showToast('Two-factor authentication enabled!', 'success')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!code) {
      setError('Please enter your authentication code or backup code')
      return
    }

    setLoading(true)
    setError('')
    try {
      await securityAPI.disable2FA(code)
      setStatus({ ...status!, enabled: false })
      setSetupState('idle')
      setCode('')
      showToast('Two-factor authentication disabled', 'success')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code from your authenticator app')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await securityAPI.regenerateBackupCodes(code)
      setBackupCodes(result.backupCodes)
      setSetupState('backup-codes')
      setCode('')
      showToast('Backup codes regenerated!', 'success')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate backup codes')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupCodesDone = () => {
    setBackupCodes([])
    loadStatus()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard', 'success', 2000)
  }

  const downloadBackupCodes = () => {
    const content = `EchoLock Backup Codes
Generated: ${new Date().toISOString()}

Keep these codes safe! Each code can only be used once.

${backupCodes.join('\n')}

If you lose access to your authenticator app, you can use one of these codes to log in.
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'echolock-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Loading state
  if (setupState === 'loading') {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading 2FA status...
      </div>
    )
  }

  // Show backup codes after enabling
  if (setupState === 'backup-codes' && backupCodes.length > 0) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-orange-800">Save Your Backup Codes</h4>
              <p className="text-sm text-orange-700 mt-1">
                These codes can be used to access your account if you lose your authenticator device.
                Each code can only be used once. Store them securely.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded p-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, i) => (
              <div
                key={i}
                className="bg-white border border-gray-300 rounded px-3 py-2 text-center"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => copyToClipboard(backupCodes.join('\n'))}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy All
          </Button>
          <Button
            variant="secondary"
            onClick={downloadBackupCodes}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        <Button variant="primary" onClick={handleBackupCodesDone} className="w-full">
          I&apos;ve Saved My Backup Codes
        </Button>
      </div>
    )
  }

  // 2FA is enabled (or in process of being disabled)
  if ((setupState === 'enabled' || setupState === 'disabling') && status?.enabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          <div>
            <h4 className="font-bold text-green-800">Two-Factor Authentication Enabled</h4>
            <p className="text-sm text-green-700">
              Your account is protected with an authenticator app
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Method:</span>
            <span className="font-medium">Authenticator App (TOTP)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Backup codes remaining:</span>
            <span className="font-medium">{status.backupCodesRemaining} of 10</span>
          </div>
          {status.enabledAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Enabled:</span>
              <span className="font-medium">
                {new Date(status.enabledAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-gray-200 pt-4 space-y-4">
          <div>
            <h5 className="font-bold text-sm uppercase tracking-wider mb-3">
              Regenerate Backup Codes
            </h5>
            <p className="text-sm text-gray-600 mb-3">
              Generate new backup codes. This will invalidate all existing codes.
            </p>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-40"
              />
              <Button
                variant="secondary"
                onClick={handleRegenerateBackupCodes}
                disabled={loading || code.length !== 6}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </div>

          <div className="border-t-2 border-gray-200 pt-4">
            <h5 className="font-bold text-sm uppercase tracking-wider mb-3 text-red-600">
              Disable 2FA
            </h5>
            <p className="text-sm text-gray-600 mb-3">
              Remove two-factor authentication from your account.
            </p>
            {setupState !== 'disabling' ? (
              <Button
                variant="secondary"
                onClick={() => setSetupState('disabling')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                Disable 2FA
              </Button>
            ) : (
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10))}
                  maxLength={10}
                  className="w-40"
                />
                <Button
                  variant="secondary"
                  onClick={handleDisable}
                  disabled={loading || !code}
                  className="text-red-600"
                >
                  {loading ? 'Disabling...' : 'Confirm Disable'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSetupState('enabled')
                    setCode('')
                    setError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    )
  }

  // Setup flow - showing QR code
  if (setupState === 'setup' && setupData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="font-bold mb-2">Scan QR Code</h4>
          <p className="text-sm text-gray-600 mb-4">
            Use your authenticator app to scan this QR code
          </p>
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded">
            <QRCodeSVG value={setupData.qrCodeUri} size={200} />
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Or enter this key manually:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm bg-white border border-gray-300 rounded px-3 py-2 break-all">
              {setupData.manualEntryKey}
            </code>
            <Button
              variant="secondary"
              onClick={() => copyToClipboard(setupData.secret)}
              className="flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-3">
            Enter the 6-digit code from your authenticator app to verify setup:
          </p>
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-40 text-center font-mono text-lg tracking-widest"
            />
            <Button
              variant="primary"
              onClick={handleVerifySetup}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            setSetupState('idle')
            setSetupData(null)
            setCode('')
            setError('')
          }}
          className="w-full"
        >
          Cancel Setup
        </Button>
      </div>
    )
  }

  // Verify step - confirm to enable
  if (setupState === 'verify') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            <div>
              <h4 className="font-bold text-green-800">Authenticator Verified!</h4>
              <p className="text-sm text-green-700">
                Enter one more code to enable two-factor authentication
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-3">
            Enter a new 6-digit code from your authenticator app:
          </p>
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-40 text-center font-mono text-lg tracking-widest"
            />
            <Button
              variant="primary"
              onClick={handleEnable}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Enabling...' : 'Enable 2FA'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    )
  }

  // Idle state - 2FA not enabled
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 rounded">
          <Shield className="w-8 h-8 text-gray-600" />
        </div>
        <div>
          <h4 className="font-bold mb-1">Add Extra Security</h4>
          <p className="text-sm text-gray-600">
            Protect your account with an authenticator app like Google Authenticator,
            Authy, or 1Password. You&apos;ll need to enter a code from your phone each
            time you log in.
          </p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded">
        <h5 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
          <Key className="w-4 h-4" />
          Why Enable 2FA?
        </h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- Protects against stolen passwords</li>
          <li>- Required for accessing sensitive data</li>
          <li>- Industry standard security practice</li>
          <li>- Backup codes available if you lose your device</li>
        </ul>
      </div>

      <Button
        variant="primary"
        onClick={handleStartSetup}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2"
      >
        <Shield className="w-5 h-5" />
        {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
