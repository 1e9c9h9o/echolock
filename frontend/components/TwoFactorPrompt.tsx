'use client'

import { useState, useEffect } from 'react'
import { Shield, X } from 'lucide-react'
import Link from 'next/link'
import { securityAPI } from '@/lib/api'

const STORAGE_KEY = '2fa-prompt-dismissed'
const REMIND_LATER_KEY = '2fa-remind-later-until'

export default function TwoFactorPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkShouldShow()
  }, [])

  const checkShouldShow = async () => {
    try {
      // Check if permanently dismissed
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        setLoading(false)
        return
      }

      // Check if "remind later" is still active
      const remindLaterUntil = localStorage.getItem(REMIND_LATER_KEY)
      if (remindLaterUntil && Date.now() < parseInt(remindLaterUntil)) {
        setLoading(false)
        return
      }

      // Check 2FA status
      const status = await securityAPI.getTwoFactorStatus()
      if (!status.enabled) {
        setShow(true)
      }
    } catch (error) {
      // Don't show prompt if we can't check status
      console.error('Failed to check 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
  }

  const handleRemindLater = () => {
    // Remind in 24 hours
    const remindAt = Date.now() + 24 * 60 * 60 * 1000
    localStorage.setItem(REMIND_LATER_KEY, remindAt.toString())
    setShow(false)
  }

  if (loading || !show) {
    return null
  }

  return (
    <div className="bg-orange/10 border-2 border-orange rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-orange/20 rounded-lg">
          <Shield className="w-5 h-5 text-orange" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">Secure Your Account</h3>
          <p className="text-sm text-gray-700 mb-3">
            Add two-factor authentication to protect your sensitive data.
            It only takes a minute to set up.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-orange transition-colors"
            >
              <Shield className="w-3 h-3" />
              Set Up 2FA
            </Link>
            <button
              onClick={handleRemindLater}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-black"
            >
              Remind Me Later
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600"
            >
              Don&apos;t Ask Again
            </button>
          </div>
        </div>
        <button
          onClick={handleRemindLater}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
