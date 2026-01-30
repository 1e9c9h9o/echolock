'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Shield, Lock, Users, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { switchesAPI } from '@/lib/api'

interface Recipient {
  email: string
  name: string
}

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
  const [showTechDetails, setShowTechDetails] = useState(false)

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

  // Convert hours to human readable
  const getIntervalText = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`
    return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please give your switch a name')
      return
    }

    if (!message.trim()) {
      setError('Please write your message')
      return
    }

    if (!password.trim()) {
      setError('Please set an encryption password')
      return
    }

    if (validRecipients.length === 0) {
      setError('Please add at least one recipient')
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-black/70 hover:text-orange text-base font-mono font-bold mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-black flex items-center justify-center">
            <Shield className="h-8 w-8 text-orange" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Create Your Switch</h1>
            <p className="text-black/60 font-mono">Set up your dead man's switch</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Your Message */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange text-black flex items-center justify-center font-bold text-sm">1</div>
            <h2 className="text-xl font-bold">Your Protected Message</h2>
          </div>

          <Card className="!bg-slate-900 !text-white border-2 border-black">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/20">
              <Lock className="h-5 w-5 text-orange" strokeWidth={2} />
              <span className="font-mono text-sm text-white/70">End-to-end encrypted</span>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-white/80">
                Switch Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Family Instructions, Business Continuity"
                className="w-full px-4 py-3 bg-white/10 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-white/80">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the message that will be delivered to your recipients if you stop checking in..."
                rows={8}
                className="w-full px-4 py-4 bg-white/10 border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange font-mono text-sm leading-relaxed resize-none"
                required
              />
              <p className="mt-2 text-xs text-white/50 font-mono">
                This message will remain encrypted until the switch triggers.
              </p>
            </div>
          </Card>
        </div>

        {/* Section 2: Recipients */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange text-black flex items-center justify-center font-bold text-sm">2</div>
            <h2 className="text-xl font-bold">Who Receives Your Message</h2>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-black/60" strokeWidth={2} />
                <span className="font-mono text-sm text-black/60">
                  {validRecipients.length} recipient{validRecipients.length !== 1 ? 's' : ''} added
                </span>
              </div>
              <button
                type="button"
                onClick={addRecipient}
                className="flex items-center gap-2 px-3 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold text-sm"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Add Another
              </button>
            </div>

            <div className="space-y-4">
              {recipients.map((recipient, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 border border-gray-200 relative"
                >
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red transition-colors"
                    >
                      <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-600">
                        Name
                      </label>
                      <input
                        type="text"
                        value={recipient.name}
                        onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-black focus:outline-none font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-600">
                        Email
                      </label>
                      <input
                        type="email"
                        value={recipient.email}
                        onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 focus:border-black focus:outline-none font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section 3: Check-in Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange text-black flex items-center justify-center font-bold text-sm">3</div>
            <h2 className="text-xl font-bold">Your Check-in Schedule</h2>
          </div>

          <Card>
            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-black/60 mt-1 flex-shrink-0" strokeWidth={2} />
              <div className="flex-1">
                <p className="font-mono text-sm text-black/70 mb-4">
                  If you don't check in within this time, your message will be delivered.
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <input
                      type="number"
                      value={checkInHours}
                      onChange={(e) => setCheckInHours(e.target.value)}
                      min="1"
                      max="8760"
                      className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-orange font-mono text-lg text-center font-bold"
                      required
                    />
                  </div>
                  <span className="font-mono text-black/60">hours</span>
                  <span className="text-black/40">|</span>
                  <span className="font-mono text-sm text-black/60">
                    {getIntervalText(parseInt(checkInHours) || 0)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 4: Security */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange text-black flex items-center justify-center font-bold text-sm">4</div>
            <h2 className="text-xl font-bold">Encryption Password</h2>
          </div>

          <Card>
            <div className="flex items-start gap-4">
              <Lock className="h-6 w-6 text-black/60 mt-1 flex-shrink-0" strokeWidth={2} />
              <div className="flex-1">
                <p className="font-mono text-sm text-black/70 mb-4">
                  This password encrypts your message. Share it with your recipients separately so they can decrypt it.
                </p>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    className="w-full px-4 py-3 pr-12 border-2 border-black focus:outline-none focus:ring-2 focus:ring-orange font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <Eye className="h-5 w-5" strokeWidth={2} />
                    )}
                  </button>
                </div>

                <div className="mt-3 p-3 bg-yellow/20 border border-yellow">
                  <p className="text-xs font-mono text-black/70">
                    <strong>Important:</strong> Recipients will need this password to read your message. Store it somewhere safe and share it with them separately.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Review Section */}
        {isFormValid && (
          <div className="mb-8">
            <Card className="!bg-green/10 border-2 border-green">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green flex-shrink-0" strokeWidth={2} />
                <div>
                  <h3 className="font-bold text-lg mb-3">Ready to Create</h3>
                  <div className="space-y-2 font-mono text-sm text-black/70">
                    <p>
                      <strong className="text-black">Switch:</strong> {title}
                    </p>
                    <p>
                      <strong className="text-black">Recipients:</strong> {validRecipients.map(r => r.name).join(', ')}
                    </p>
                    <p>
                      <strong className="text-black">Check-in required:</strong> Every {getIntervalText(parseInt(checkInHours) || 0)}
                    </p>
                    <p className="pt-2 border-t border-green/30 mt-2">
                      If you miss a check-in, your encrypted message will be sent to {validRecipients.length} recipient{validRecipients.length !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8">
            <div className="bg-red/10 border-2 border-red p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="font-mono text-sm text-red">{error}</p>
            </div>
          </div>
        )}

        {/* Technical Details (collapsible) */}
        <div className="mb-8 border border-gray-200">
          <button
            type="button"
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">Technical Details</span>
            {showTechDetails ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {showTechDetails && (
            <div className="px-4 pb-4 border-t border-gray-200">
              <div className="pt-3 space-y-1.5 text-xs font-mono text-gray-500">
                <p><strong className="text-gray-600">Encryption:</strong> AES-256-GCM (authenticated)</p>
                <p><strong className="text-gray-600">Key Splitting:</strong> Shamir Secret Sharing (3-of-5 threshold)</p>
                <p><strong className="text-gray-600">Key Derivation:</strong> PBKDF2-SHA256 (600,000 iterations)</p>
                <p><strong className="text-gray-600">Distribution:</strong> Nostr protocol across 10+ relays</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !isFormValid}
            className="flex-1 py-4 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Shield className="h-5 w-5" strokeWidth={2} />
                Create Switch
              </span>
            )}
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="secondary" className="py-4">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
