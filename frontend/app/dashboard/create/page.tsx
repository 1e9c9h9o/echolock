'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!message.trim()) {
      setError('Message is required')
      return
    }

    if (!password.trim()) {
      setError('Encryption password is required')
      return
    }

    const validRecipients = recipients.filter((r) => r.email.trim() && r.name.trim())
    if (validRecipients.length === 0) {
      setError('At least one recipient is required')
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
    <div>
      {/* Header */}
      <div className="mb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue hover:text-red text-base font-mono font-bold mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>
        <h1 className="text-5xl font-bold mb-3">
          CREATE SWITCH
        </h1>
        <p className="text-lg font-mono">
          Configure switch parameters and recipients
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-10">
          {/* Basic information */}
          <Card>
            <h2 className="text-2xl font-bold mb-8">
              SWITCH CONFIGURATION
            </h2>
            <div className="space-y-8">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter switch title"
                required
              />

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-3 font-sans">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter secret message..."
                  rows={6}
                  className="w-full px-4 py-4 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
                  required
                />
                <p className="mt-3 text-sm font-mono text-gray-700">
                  Encrypted and delivered if timer expires
                </p>
              </div>

              <Input
                label="Check-in Interval (Hours)"
                type="number"
                value={checkInHours}
                onChange={(e) => setCheckInHours(e.target.value)}
                min="1"
                max="8760"
                helperText="How often you need to check in (1-8760 hours)"
                required
              />

              <Input
                label="Encryption Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                helperText="Strong password to encrypt your message"
                required
              />
            </div>
          </Card>

          {/* Recipients */}
          <Card>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">RECIPIENTS</h2>
              <Button
                type="button"
                variant="secondary"
                onClick={addRecipient}
              >
                <Plus className="h-5 w-5 mr-2" strokeWidth={2} />
                Add Recipient
              </Button>
            </div>

            <div className="space-y-6">
              {recipients.map((recipient, index) => (
                <div
                  key={index}
                  className="border-2 border-black p-6 relative bg-white"
                >
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      className="absolute top-4 right-4 text-black hover:text-red transition-colors"
                    >
                      <X className="h-6 w-6" strokeWidth={2} />
                    </button>
                  )}

                  <div className="space-y-6 pr-12">
                    <Input
                      label="Name"
                      value={recipient.name}
                      onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={recipient.email}
                      onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Error */}
          {error && (
            <div className="bg-red text-cream p-6 border-2 border-black">
              <p className="font-mono font-bold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-6">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Switch'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
