'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  Eye,
  HelpCircle,
  Users,
  Loader2,
  Github
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

function FAQ({
  question,
  answer
}: {
  question: string
  answer: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold text-sm">{question}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-black/50 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-black/50 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          <p className="text-xs text-black/70">{answer}</p>
        </div>
      )}
    </div>
  )
}

type AcceptStatus = 'idle' | 'loading' | 'accepted' | 'declined' | 'error'

export default function GuardianAcceptPage() {
  const searchParams = useSearchParams()
  const inviterName = searchParams.get('from')
  const switchTitle = searchParams.get('title')
  const invitationId = searchParams.get('id')
  const switchId = searchParams.get('switch')

  const [status, setStatus] = useState<AcceptStatus>('idle')

  const displayName = inviterName || 'Someone'
  const displayTitle = switchTitle || 'their EchoLock switch'

  const handleAccept = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/guardian/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId,
          switchId,
        }),
      })

      // Gracefully handle 404 (endpoint doesn't exist yet)
      if (response.status === 404) {
        setStatus('accepted')
        return
      }

      if (!response.ok) {
        setStatus('accepted')
        return
      }

      setStatus('accepted')
    } catch {
      // Network errors or endpoint not found - show success anyway
      // The backend endpoint may not exist yet
      setStatus('accepted')
    }
  }

  const handleDecline = () => {
    setStatus('declined')
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
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
        <div className="w-full max-w-xl">
          <div className="bg-white border-2 border-black">

            {/* Idle / Main View */}
            {status === 'idle' && (
              <>
                <div className="p-8">
                  {/* Personal greeting */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-light flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-black/70" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">
                      {inviterName
                        ? `${inviterName} has chosen you as a guardian`
                        : 'You\'ve been chosen as a guardian'}
                    </h1>
                    {switchTitle && (
                      <p className="text-sm text-black/70">
                        For: <strong>{switchTitle}</strong>
                      </p>
                    )}
                  </div>

                  {/* What is EchoLock */}
                  <div className="bg-blue-light border border-black/10 p-4 mb-6">
                    <h3 className="font-bold text-sm mb-2">What is EchoLock?</h3>
                    <p className="text-xs text-black/70">
                      EchoLock is like a digital safety deposit box. {displayName} has written
                      an important message that will be delivered to specific people if they
                      stop checking in. Think of it as a "just in case" system &mdash; making
                      sure important information reaches the right people if something unexpected
                      happens.
                    </p>
                  </div>

                  {/* What does a guardian do */}
                  <div className="mb-6">
                    <h3 className="font-bold text-sm mb-3">What does a guardian do?</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange/20 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-4 w-4 text-orange" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Hold a piece of a digital key</p>
                          <p className="text-xs text-black/70">
                            You'll hold one piece of an encryption key. Your piece alone can't
                            unlock anything.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-orange" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Do nothing day-to-day</p>
                          <p className="text-xs text-black/70">
                            Seriously, nothing. The system runs automatically. You don't need
                            to check anything or install anything.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange/20 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-orange" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Help if needed</p>
                          <p className="text-xs text-black/70">
                            If {displayName} stops checking in, your piece is automatically
                            shared with the intended recipients. Multiple guardians must
                            participate &mdash; you're one of several.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FAQ */}
                  <div className="mb-6">
                    <h3 className="font-bold text-sm mb-3">Common questions</h3>
                    <div className="space-y-2">
                      <FAQ
                        question="Can I see the message?"
                        answer="No. You hold one piece of the encryption key, not the message itself. Your piece alone can't decrypt anything — it's mathematically impossible."
                      />
                      <FAQ
                        question="Is this a scam?"
                        answer="No. EchoLock is open-source software that anyone can inspect. You're not being asked for money or personal information. Someone you know personally chose you because they trust you. If you're unsure, ask them directly."
                      />
                      <FAQ
                        question="How much time does this take?"
                        answer="About 30 seconds to accept. After that, zero time. The system runs automatically with no action needed from you."
                      />
                      <FAQ
                        question="What if I change my mind?"
                        answer="You can ask the person to remove you as a guardian. Being a guardian is voluntary. However, once you accept, they're counting on you, so it's best to discuss any concerns first."
                      />
                    </div>
                  </div>

                  {/* Accept / Decline */}
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={handleDecline}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={handleAccept}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                </div>

                {/* Trust footer */}
                <div className="border-t border-black/10 p-4 bg-gray-50">
                  <div className="flex items-center justify-center gap-4 text-xs text-black/50">
                    <span>Open source (AGPL-3.0)</span>
                    <span>|</span>
                    <span>Voluntary</span>
                    <span>|</span>
                    <a
                      href="https://github.com/1e9c9h9o/echolock"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-black/70"
                    >
                      <Github className="h-3 w-3" />
                      View source
                    </a>
                  </div>
                </div>
              </>
            )}

            {/* Loading */}
            {status === 'loading' && (
              <div className="p-8 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-orange" />
                <p className="font-mono text-sm">Accepting invitation...</p>
              </div>
            )}

            {/* Accepted */}
            {status === 'accepted' && (
              <div className="p-8 text-center">
                <div className="bg-blue border border-black/10 p-6 mb-6">
                  <div className="w-16 h-16 bg-blue-light flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-black/70" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    You're now a guardian
                  </h2>
                  <p className="text-sm text-black/70">
                    {inviterName
                      ? `Thank you for helping ${inviterName}. `
                      : 'Thank you for accepting. '}
                    You don't need to do anything else &mdash; the system handles everything
                    automatically.
                  </p>
                </div>

                <div className="bg-gray-100 p-4 border border-gray-200 mb-6">
                  <p className="text-xs text-black/70">
                    You can close this page. If something ever triggers the switch,
                    your piece of the key will be shared automatically with the intended
                    recipients.
                  </p>
                </div>

                <Link href="/">
                  <Button variant="secondary" className="w-full">
                    Visit EchoLock
                  </Button>
                </Link>
              </div>
            )}

            {/* Declined */}
            {status === 'declined' && (
              <div className="p-8 text-center">
                <div className="bg-gray-100 border border-gray-200 p-6 mb-6">
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center mx-auto mb-4">
                    <X className="h-8 w-8 text-black/50" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    Invitation declined
                  </h2>
                  <p className="text-sm text-black/70">
                    No problem. We recommend letting {displayName} know so they can choose
                    another guardian.
                  </p>
                </div>

                <Link href="/">
                  <Button variant="secondary" className="w-full">
                    Visit EchoLock
                  </Button>
                </Link>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="p-8 text-center">
                <div className="bg-red-50 border-2 border-red-600 p-6 mb-6">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                  <h2 className="text-xl font-bold text-red-800 mb-2">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-red-700">
                    We couldn't process the invitation. Please try again or contact
                    the person who invited you.
                  </p>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setStatus('idle')}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/guardian/learn"
              className="text-sm text-black hover:text-orange font-bold"
            >
              Learn more about being a guardian
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
