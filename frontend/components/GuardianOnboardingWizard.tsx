'use client'

import { useState } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Mail,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  HelpCircle,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { showToast } from '@/components/ui/ToastContainer'

interface Guardian {
  npub: string
  name: string
  type: 'personal' | 'professional' | 'institutional' | 'self-hosted'
  email?: string
}

interface GuardianOnboardingWizardProps {
  switchId: string
  switchTitle: string
  existingGuardians: Guardian[]
  onClose: () => void
  onGuardianAdded: (guardian: Guardian) => void
}

type WizardStep = 'intro' | 'type' | 'details' | 'invite' | 'complete'

const GUARDIAN_TYPES = [
  {
    id: 'personal' as const,
    name: 'Friend or Family',
    description: 'Someone you trust personally',
    icon: <Users className="h-8 w-8" />,
    examples: 'Spouse, sibling, close friend, trusted colleague',
    recommended: true
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    description: 'Someone with a legal or professional obligation',
    icon: <Shield className="h-8 w-8" />,
    examples: 'Lawyer, executor, notary, accountant'
  },
  {
    id: 'institutional' as const,
    name: 'Service Provider',
    description: 'A company that offers guardian services',
    icon: <Key className="h-8 w-8" />,
    examples: 'EchoLock service, custody services'
  },
  {
    id: 'self-hosted' as const,
    name: 'Self-Hosted',
    description: 'Your own server running guardian software',
    icon: <ExternalLink className="h-8 w-8" />,
    examples: 'VPS, home server, Raspberry Pi'
  }
]

export default function GuardianOnboardingWizard({
  switchId,
  switchTitle,
  existingGuardians,
  onClose,
  onGuardianAdded
}: GuardianOnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>('intro')
  const [guardianType, setGuardianType] = useState<Guardian['type'] | null>(null)
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianNpub, setGuardianNpub] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const currentGuardianCount = existingGuardians.length
  const recommendedCount = 5
  const minimumCount = 3

  const goNext = () => {
    const steps: WizardStep[] = ['intro', 'type', 'details', 'invite', 'complete']
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const goBack = () => {
    const steps: WizardStep[] = ['intro', 'type', 'details', 'invite', 'complete']
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  const generateInvite = async () => {
    setLoading(true)
    try {
      // For now, generate a placeholder invite link
      // In production, this would call an API to create the invite
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      setInviteLink(`${baseUrl}/guardian-invite/${inviteCode}`)
      goNext()
    } catch (error) {
      showToast('Failed to generate invite', 'error')
    } finally {
      setLoading(false)
    }
  }

  const addGuardian = async () => {
    if (!guardianNpub && guardianType !== 'personal') {
      showToast('Please enter the guardian\'s Nostr public key', 'warning')
      return
    }

    setLoading(true)
    try {
      const guardian: Guardian = {
        npub: guardianNpub || `npub_pending_${Date.now()}`,
        name: guardianName,
        type: guardianType!,
        email: guardianEmail || undefined
      }

      // In production, this would call an API to add the guardian
      onGuardianAdded(guardian)
      goNext()
    } catch (error) {
      showToast('Failed to add guardian', 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    showToast('Invite link copied', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const sendEmailInvite = () => {
    const subject = encodeURIComponent('Can you help me with something important?')
    const body = encodeURIComponent(`Hi ${guardianName},

I'm using a service called EchoLock to make sure an important message reaches the right people if something ever happens to me. Think of it like a digital safety deposit box that opens automatically if I stop checking in.

I chose you because I trust you. I'd like you to be one of my "guardians" — someone who holds a piece of a digital key. Your piece alone can't unlock anything, and you don't need to do anything day-to-day. The system handles everything automatically.

Here's the link to accept: ${inviteLink}

It takes about 30 seconds. No account, no cost, nothing to install.

If you want to learn more before deciding, here's an explainer page: ${typeof window !== 'undefined' ? window.location.origin : 'https://echolock.xyz'}/guardian/learn

Thanks for considering this. It means a lot.`)

    window.open(`mailto:${guardianEmail}?subject=${subject}&body=${body}`)
    showToast('Email client opened', 'success')
  }

  const sendExplainerEmail = () => {
    const subject = encodeURIComponent('Quick question — can you help me with something?')
    const body = encodeURIComponent(`Hi ${guardianName},

I'm setting up something called EchoLock — it's a way to make sure important information reaches the right people if something ever happens to me.

I'd love to have you involved, but I wanted to explain what it is first. Here's a short page that covers everything:

${typeof window !== 'undefined' ? window.location.origin : 'https://echolock.xyz'}/guardian/learn

No commitment yet — just wanted you to see what it's about before I send a formal invitation. Let me know what you think!`)

    window.open(`mailto:${guardianEmail}?subject=${subject}&body=${body}`)
    showToast('Email client opened', 'success')
  }

  const copyExplainerLink = () => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://echolock.xyz'}/guardian/learn`
    navigator.clipboard.writeText(link)
    showToast('Explainer link copied', 'success')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black text-white py-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <span className="text-[11px] uppercase tracking-widest font-bold">
              Add Guardian
            </span>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-orange transition-all duration-300"
            style={{
              width: step === 'intro' ? '20%' :
                     step === 'type' ? '40%' :
                     step === 'details' ? '60%' :
                     step === 'invite' ? '80%' : '100%'
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Introduction */}
          {step === 'intro' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">What is a Guardian?</h2>

              <div className="bg-blue/10 border-2 border-blue p-4 mb-6">
                <p className="text-sm">
                  <strong>Guardians are trusted people or services</strong> who each hold one piece
                  of your encryption key. When your switch triggers, they work together to release
                  your message.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-3 border border-gray-200">
                  <div className="w-8 h-8 bg-orange/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-orange">1</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">No single person can access your message</p>
                    <p className="text-xs text-gray-600">
                      At least 3 guardians must participate to release anything
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-gray-200">
                  <div className="w-8 h-8 bg-orange/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-orange">2</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Guardians only act when you stop checking in</p>
                    <p className="text-xs text-gray-600">
                      They monitor your heartbeats on Nostr, not your private data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-gray-200">
                  <div className="w-8 h-8 bg-orange/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-orange">3</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Works without EchoLock</p>
                    <p className="text-xs text-gray-600">
                      Even if our servers go down, your guardians can still release your message
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 border-2 border-amber-200 mb-6">
                <p className="text-sm">
                  <strong>Guardians</strong> hold encryption key pieces and monitor your heartbeat.{' '}
                  <strong>Recipients</strong> receive and read the decrypted message.{' '}
                  The same person can be both, but the roles are separate.
                </p>
              </div>

              <div className="bg-gray-100 p-4 border-2 border-gray-300 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Current Guardians</p>
                    <p className="text-sm text-gray-600">
                      {currentGuardianCount} of {recommendedCount} recommended
                    </p>
                  </div>
                  <div className="text-right">
                    {currentGuardianCount < minimumCount ? (
                      <span className="text-red-600 text-sm font-bold">
                        Need at least {minimumCount}
                      </span>
                    ) : currentGuardianCount < recommendedCount ? (
                      <span className="text-orange text-sm font-bold">
                        Add {recommendedCount - currentGuardianCount} more
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm font-bold">
                        Fully protected
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      currentGuardianCount >= recommendedCount ? 'bg-green-500' :
                      currentGuardianCount >= minimumCount ? 'bg-orange' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentGuardianCount / recommendedCount) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-orange/10 border-2 border-orange p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">Talk to your guardian first</p>
                    <p className="text-black/70 mb-3">
                      Before sending a formal invitation, it helps to give your guardian context.
                      Share the explainer page so they know what EchoLock is and what being a
                      guardian means.
                    </p>
                    <button
                      onClick={copyExplainerLink}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-orange bg-white hover:bg-orange/10 text-sm font-bold transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Explainer Link
                    </button>
                  </div>
                </div>
              </div>

              <Button variant="primary" className="w-full" onClick={goNext}>
                Add a Guardian
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Choose Type */}
          {step === 'type' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Guardian Type</h2>
              <p className="text-sm text-gray-600 mb-6">
                Different types of guardians offer different levels of reliability and trust.
              </p>

              <div className="space-y-3 mb-6">
                {GUARDIAN_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setGuardianType(type.id)
                      goNext()
                    }}
                    className={`w-full p-4 border-2 text-left transition-all hover:border-orange ${
                      guardianType === type.id ? 'border-orange bg-orange/10' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-gray-400">{type.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{type.name}</p>
                          {type.recommended && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{type.description}</p>
                        <p className="text-xs text-gray-400 mt-1">e.g., {type.examples}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={goBack}
                className="w-full py-2 text-sm text-gray-500 hover:text-black"
              >
                <ChevronLeft className="h-4 w-4 inline mr-1" />
                Back
              </button>
            </div>
          )}

          {/* Step 3: Guardian Details */}
          {step === 'details' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Guardian Details</h2>
              <p className="text-sm text-gray-600 mb-6">
                Enter information about your new {GUARDIAN_TYPES.find(t => t.id === guardianType)?.name.toLowerCase()} guardian.
              </p>

              <div className="space-y-4 mb-6">
                <Input
                  label="Guardian Name"
                  placeholder="e.g., John Smith"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                />

                <Input
                  label="Email Address (optional)"
                  type="email"
                  placeholder="john@example.com"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  helperText="We'll send them an invitation email"
                />

                {guardianType !== 'personal' && (
                  <div>
                    <Input
                      label="Nostr Public Key (npub)"
                      placeholder="npub1..."
                      value={guardianNpub}
                      onChange={(e) => setGuardianNpub(e.target.value)}
                      helperText="The guardian's Nostr public key for receiving their share"
                    />
                    <div className="mt-2 p-3 bg-gray-100 border border-gray-200">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">
                          Don't have their npub? Generate an invite link instead and they can
                          provide their key when they accept.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {guardianType === 'personal' && !guardianNpub && (
                <div className="bg-orange/10 border-2 border-orange p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold mb-1">Don't know their Nostr key?</p>
                      <p>
                        No problem! We'll generate an invitation link. When they accept,
                        they'll create or connect their Nostr identity.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={guardianNpub ? addGuardian : generateInvite}
                  disabled={!guardianName || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {guardianNpub ? 'Add Guardian' : 'Generate Invite'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Send Invite */}
          {step === 'invite' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Invite {guardianName}</h2>
              <p className="text-sm text-gray-600 mb-6">
                Share this invitation link with your guardian. When they accept, they'll be
                added to your switch.
              </p>

              <div className="bg-gray-100 p-4 border-2 border-black mb-4">
                <p className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">
                  Invitation Link
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border-2 border-gray-300 font-mono text-sm bg-white"
                  />
                  <button
                    onClick={copyInvite}
                    className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {guardianEmail && (
                <div className="space-y-3 mb-4">
                  <button
                    onClick={sendExplainerEmail}
                    className="w-full p-4 border-2 border-orange bg-orange/5 hover:bg-orange/10 transition-colors flex items-center gap-3"
                  >
                    <HelpCircle className="h-5 w-5 text-orange" />
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">Send Explainer First</p>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-xs text-black/70">Send a casual intro email with a link to learn about EchoLock</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange" />
                  </button>

                  <button
                    onClick={sendEmailInvite}
                    className="w-full p-4 border-2 border-gray-200 hover:border-orange transition-colors flex items-center gap-3"
                  >
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm">Send Formal Invitation</p>
                      <p className="text-xs text-gray-500">Opens your email client with the invitation link</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              )}

              <div className="bg-blue/10 border-2 border-blue p-4 mb-6">
                <p className="text-sm">
                  <strong>What happens next?</strong> When {guardianName} accepts the invitation,
                  they'll receive their encrypted share and begin monitoring your heartbeats.
                  You'll be notified when they accept.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button variant="primary" onClick={goNext} className="flex-1">
                  Done
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-black/70" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Guardian Added</h2>
              <p className="text-sm text-gray-600 mb-6">
                {guardianName} has been added as a guardian for "{switchTitle}".
              </p>

              <div className="bg-gray-100 p-4 border-2 border-gray-300 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Guardian Status</p>
                    <p className="text-sm text-gray-600">
                      {currentGuardianCount + 1} of {recommendedCount} recommended
                    </p>
                  </div>
                  {currentGuardianCount + 1 < recommendedCount && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setStep('type')
                        setGuardianName('')
                        setGuardianEmail('')
                        setGuardianNpub('')
                        setInviteLink('')
                      }}
                    >
                      Add Another
                    </Button>
                  )}
                </div>
              </div>

              <Button variant="primary" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
