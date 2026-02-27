'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Clock, User, AlertCircle, ExternalLink, Download } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// Use empty string for same-origin in production (proxied), localhost in dev
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface MessageData {
  title: string
  content: string
  sender: {
    name: string | null
    email: string | null
  }
  releasedAt: string
  isFirstView: boolean
}

export default function RecipientMessagePage() {
  const params = useParams()
  const token = params.token as string

  const [message, setMessage] = useState<MessageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.message || 'Failed to load message')
          return
        }

        setMessage(data.data)
      } catch (err) {
        setError('Unable to connect to the server. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchMessage()
    }
  }, [token])

  const handleDownload = () => {
    if (!message) return

    const content = `
EchoLock Message
================

Title: ${message.title}
From: ${message.sender.name || 'Unknown'} (${message.sender.email || 'No email'})
Released: ${format(new Date(message.releasedAt), 'PPpp')}

---

${message.content}

---

This message was delivered via EchoLock Dead Man's Switch.
Learn more at https://echolock.xyz
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echolock-message-${format(new Date(), 'yyyy-MM-dd')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-blue flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-black/20 border-t-black/60 rounded-full animate-spin" />
          <p className="text-black/70 text-sm">Loading message...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-blue flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-black/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-50 flex items-center justify-center rounded-full">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-black mb-2">Message Unavailable</h1>
          <p className="text-black/70 mb-6">{error}</p>
          <div className="text-xs text-black/50 space-y-2">
            <p>If you believe this is an error, please contact the sender.</p>
            <a
              href="https://echolock.xyz/recovery-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-black/70 hover:text-black"
            >
              Use Recovery Tool <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Message display
  return (
    <div className="min-h-screen bg-blue py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-black flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-black mb-2">
            {message?.title || 'EchoLock Message'}
          </h1>
          <p className="text-black/70 text-sm">
            This message was released automatically via EchoLock
          </p>
        </div>

        {/* Message card */}
        <div className="bg-white border border-black/10 mb-6">
          {/* Sender info */}
          <div className="border-b border-black/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-light flex items-center justify-center">
                <User className="h-5 w-5 text-black/50" />
              </div>
              <div>
                <p className="font-medium text-black">
                  {message?.sender.name || 'Anonymous'}
                </p>
                {message?.sender.email && (
                  <p className="text-xs text-black/70">{message.sender.email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-black/70">
                <Clock className="h-3 w-3" />
                <span>
                  {message?.releasedAt
                    ? formatDistanceToNow(new Date(message.releasedAt), { addSuffix: true })
                    : 'Unknown'}
                </span>
              </div>
              {message?.releasedAt && (
                <p className="text-xs text-black/50 mt-1">
                  {format(new Date(message.releasedAt), 'PPp')}
                </p>
              )}
            </div>
          </div>

          {/* Message content */}
          <div className="p-6">
            <div className="prose prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-black/80 text-base leading-relaxed bg-transparent p-0 m-0 overflow-visible">
                {message?.content}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-black/10 p-4 flex items-center justify-between">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 text-sm text-black/70 hover:text-black"
            >
              <Download className="h-4 w-4" />
              Download as text
            </button>
            <a
              href="https://echolock.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-black/50 hover:text-black/70"
            >
              Learn about EchoLock
            </a>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-light border border-black/10 p-4 text-center">
          <p className="text-sm text-black/70">
            This message was encrypted and stored securely until the sender's check-in timer expired.
            The message was then automatically decrypted and released to you.
          </p>
          <p className="text-xs text-black/50 mt-3">
            Having trouble? Use the{' '}
            <a
              href="https://echolock.xyz/recovery-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-black/70"
            >
              standalone recovery tool
            </a>{' '}
            to recover messages directly from the Nostr network.
          </p>
        </div>
      </div>
    </div>
  )
}
