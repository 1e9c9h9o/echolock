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

    // Validation
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
      <div className="mb-grid-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-text-secondary hover:text-secondary text-sm mb-grid-3"
        >
          <ArrowLeft className="h-4 w-4 mr-grid" strokeWidth={1.5} />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-secondary mb-grid-2">
          Create dead man's switch
        </h1>
        <p className="text-text-secondary">
          Configure your switch and add recipients
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-grid-6">
          {/* Basic information */}
          <Card>
            <h2 className="text-xl font-bold text-secondary mb-grid-4">
              Basic information
            </h2>
            <div className="space-y-grid-4">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My important secrets"
                required
              />

              <div>
                <label className="block text-sm font-medium text-secondary mb-grid">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your secret message..."
                  rows={6}
                  className="w-full px-grid-2 py-grid-2 border border-border bg-white text-secondary focus:outline-none focus:border-primary"
                  required
                />
                <p className="mt-grid text-sm text-text-secondary">
                  This message will be encrypted and delivered if the timer expires
                </p>
              </div>

              <Input
                label="Check-in interval (hours)"
                type="number"
                value={checkInHours}
                onChange={(e) => setCheckInHours(e.target.value)}
                min="1"
                max="8760"
                helperText="How often you need to check in (1-8760 hours)"
                required
              />

              <Input
                label="Encryption password"
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
            <div className="flex items-center justify-between mb-grid-4">
              <h2 className="text-xl font-bold text-secondary">Recipients</h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addRecipient}
              >
                <Plus className="h-4 w-4 mr-grid" strokeWidth={1.5} />
                Add recipient
              </Button>
            </div>

            <div className="space-y-grid-4">
              {recipients.map((recipient, index) => (
                <div
                  key={index}
                  className="border border-border p-grid-3 relative"
                >
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      className="absolute top-grid-2 right-grid-2 text-text-secondary hover:text-accent"
                    >
                      <X className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                  )}

                  <div className="space-y-grid-3 pr-grid-6">
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
            <div className="bg-accent bg-opacity-10 border border-accent p-grid-3 text-accent text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-grid-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create switch'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="secondary" size="lg">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
