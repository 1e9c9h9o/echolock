'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Lock, Users, Clock, Shield, Eye, EyeOff, Circle, Check } from 'lucide-react'
import Link from 'next/link'
import { switchesAPI } from '@/lib/api'

interface Recipient {
  email: string
  name: string
}

/**
 * High Performance HMI Switch Creation
 *
 * Design principles:
 * - Muted structural elements (slate/gray)
 * - Color only for validation states and progress
 * - Clean, focused form sections
 * - Clear visual hierarchy
 */
export default function CreateSwitchPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [checkInHours, setCheckInHours] = useState('72')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recipients, setRecipients] = useState<Recipient[]>([
    { email: '', name: '' },
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addRecipient = () => {
    setRecipients([...recipients, { email: '', name: '' }])
  }

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index))
    }
  }

  const updateRecipient = (index: number, field: 'email' | 'name', value: string) => {
    const updated = [...recipients]
    updated[index][field] = value
    setRecipients(updated)
  }

  const validRecipients = recipients.filter((r) => r.email.trim() && r.name.trim())
  const isFormValid = title.trim() && message.trim() && password.trim() && validRecipients.length > 0

  // Validation states for each section
  const isTitleValid = title.trim().length > 0
  const isMessageValid = message.trim().length > 0
  const isPasswordValid = password.trim().length >= 8
  const isRecipientsValid = validRecipients.length > 0

  // Convert hours to human readable
  const getIntervalText = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`
    return `${days}d ${remainingHours}h`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isFormValid) {
      setError('Please complete all required fields')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await switchesAPI.create({
        title: title.trim(),
        message: message.trim(),
        checkInHours: parseInt(checkInHours),
        password: password.trim(),
        recipients: validRecipients,
      })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create switch')
    } finally {
      setLoading(false)
    }
  }

  // Section completion indicator
  const SectionStatus = ({ complete }: { complete: boolean }) => (
    <div className={`w-5 h-5 flex items-center justify-center ${complete ? 'text-emerald-500' : 'text-slate-300'}`}>
      {complete ? (
        <Circle className="h-5 w-5 fill-emerald-500" strokeWidth={2} />
      ) : (
        <Circle className="h-5 w-5" strokeWidth={2} />
      )}
    </div>
  )

  return (
    <div className="bg-slate-50 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Switch</h1>
            <p className="text-slate-500 text-sm font-mono">Configure your dead man's switch</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Section 1: Message */}
        <div className="bg-white border border-slate-200">
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <SectionStatus complete={isTitleValid && isMessageValid} />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
              <Lock className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Protected Message
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Switch Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Family Instructions"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the message that will be delivered to your recipients..."
                rows={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm resize-none transition-colors"
              />
              <p className="mt-2 text-xs text-slate-400 font-mono">
                Encrypted with AES-256-GCM before storage
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Recipients */}
        <div className="bg-white border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <SectionStatus complete={isRecipientsValid} />
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                <Users className="h-4 w-4 text-slate-400" strokeWidth={2} />
                Recipients
              </div>
            </div>
            <button
              type="button"
              onClick={addRecipient}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              Add
            </button>
          </div>

          <div className="p-4 space-y-3">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
                  />
                  <input
                    type="email"
                    value={recipient.email}
                    onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
                  />
                </div>
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-slate-400 font-mono pt-2">
              {validRecipients.length} recipient{validRecipients.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>

        {/* Section 3: Check-in Schedule */}
        <div className="bg-white border border-slate-200">
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <SectionStatus complete={true} />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Check-in Interval
            </div>
          </div>

          <div className="p-4">
            <p className="text-sm text-slate-500 mb-4">
              Message will be delivered if no check-in is received within this period.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={checkInHours}
                onChange={(e) => setCheckInHours(e.target.value)}
                min="1"
                max="8760"
                className="w-24 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-lg text-center font-bold transition-colors"
              />
              <span className="text-slate-500 font-mono text-sm">hours</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-mono text-sm font-medium">
                {getIntervalText(parseInt(checkInHours) || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Encryption Password */}
        <div className="bg-white border border-slate-200">
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <SectionStatus complete={isPasswordValid} />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
              <Lock className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Encryption Password
            </div>
          </div>

          <div className="p-4">
            <p className="text-sm text-slate-500 mb-4">
              Recipients will need this password to decrypt your message. Share it separately.
            </p>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <Eye className="h-5 w-5" strokeWidth={2} />
                )}
              </button>
            </div>
            {password && password.length < 8 && (
              <p className="mt-2 text-xs text-amber-600 font-mono">
                Password must be at least 8 characters
              </p>
            )}
          </div>
        </div>

        {/* Review Section */}
        {isFormValid && isPasswordValid && (
          <div className="bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <h3 className="font-bold text-emerald-800 mb-2">Ready to Create</h3>
                <div className="space-y-1 text-sm text-emerald-700 font-mono">
                  <p><span className="text-emerald-600">Switch:</span> {title}</p>
                  <p><span className="text-emerald-600">Recipients:</span> {validRecipients.map(r => r.name).join(', ')}</p>
                  <p><span className="text-emerald-600">Interval:</span> {getIntervalText(parseInt(checkInHours) || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700 font-mono">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !isFormValid || !isPasswordValid}
            className={`flex-1 px-6 py-4 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
              loading || !isFormValid || !isPasswordValid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" strokeWidth={2} />
                Create Switch
              </>
            )}
          </button>
          <Link href="/dashboard">
            <button
              type="button"
              className="px-6 py-4 bg-slate-100 border border-slate-200 text-slate-600 font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}
