'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, RotateCcw, Clock, Shield, CheckCircle, Key, Lock, Users, Radio, Bitcoin, AlertTriangle, Eye, EyeOff, Server, Zap } from 'lucide-react'

type DemoPhase = 'intro' | 'creating' | 'armed' | 'triggered' | 'released'

interface DemoSwitch {
  id: string
  secret: string
  status: string
  checkInInterval: number
  nextCheckInAt: string
  createdAt: string
  checkInCount: number
  encryptionKey: string
  nostrPubkey: string
  guardians: string[]
  shares: string[]
}

const DEMO_SECRET = 'My Bitcoin wallet seed phrase is: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const DEMO_INTERVAL_SECONDS = 60

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

// Simulated crypto operations for demo
function generateFakeKey() {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
}

function generateFakeNpub() {
  return 'npub1' + Array.from({ length: 59 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')
}

export default function PublicDemoPage() {
  const [phase, setPhase] = useState<DemoPhase>('intro')
  const [demoSwitch, setDemoSwitch] = useState<DemoSwitch | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [creationStep, setCreationStep] = useState(0)
  const [showSecret, setShowSecret] = useState(false)
  const [triggerStep, setTriggerStep] = useState(0)

  useEffect(() => {
    if ((phase === 'armed' || phase === 'triggered') && demoSwitch) {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1)

        const now = new Date().getTime()
        const target = new Date(demoSwitch.nextCheckInAt).getTime()
        const remaining = Math.max(0, Math.floor((target - now) / 1000))
        setTimeRemaining(remaining)

        if (remaining === 0 && phase === 'armed') {
          setPhase('triggered')
          setTriggerStep(0)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [phase, demoSwitch])

  // Creation animation
  useEffect(() => {
    if (phase === 'creating' && creationStep < 5) {
      const timer = setTimeout(() => {
        setCreationStep((prev) => prev + 1)
      }, 1500)
      return () => clearTimeout(timer)
    } else if (phase === 'creating' && creationStep === 5) {
      setTimeout(() => {
        setPhase('armed')
      }, 1000)
    }
  }, [phase, creationStep])

  // Trigger animation
  useEffect(() => {
    if (phase === 'triggered' && triggerStep < 4) {
      const timer = setTimeout(() => {
        setTriggerStep((prev) => prev + 1)
      }, 2500)
      return () => clearTimeout(timer)
    } else if (phase === 'triggered' && triggerStep === 4) {
      setTimeout(() => {
        setPhase('released')
      }, 1000)
    }
  }, [phase, triggerStep])

  const startDemo = () => {
    const now = new Date()
    const nextCheckIn = new Date(now.getTime() + DEMO_INTERVAL_SECONDS * 1000)

    const newSwitch: DemoSwitch = {
      id: 'demo-' + Date.now(),
      secret: DEMO_SECRET,
      status: 'active',
      checkInInterval: DEMO_INTERVAL_SECONDS,
      nextCheckInAt: nextCheckIn.toISOString(),
      createdAt: now.toISOString(),
      checkInCount: 0,
      encryptionKey: generateFakeKey(),
      nostrPubkey: generateFakeNpub(),
      guardians: ['Friend (Alice)', 'Lawyer (Bob)', 'Family (Carol)', 'EchoLock Service', 'Self-hosted Server'],
      shares: Array.from({ length: 5 }, () => generateFakeKey().substring(0, 32)),
    }

    setDemoSwitch(newSwitch)
    setPhase('creating')
    setCreationStep(0)
    setTimeElapsed(0)
    setTimeRemaining(DEMO_INTERVAL_SECONDS)
  }

  const resetDemo = () => {
    setDemoSwitch(null)
    setPhase('intro')
    setTimeElapsed(0)
    setTimeRemaining(0)
    setCreationStep(0)
    setTriggerStep(0)
    setShowSecret(false)
  }

  const handleCheckIn = () => {
    if (!demoSwitch) return

    const now = new Date()
    const nextCheckIn = new Date(now.getTime() + DEMO_INTERVAL_SECONDS * 1000)

    setDemoSwitch({
      ...demoSwitch,
      nextCheckInAt: nextCheckIn.toISOString(),
      checkInCount: demoSwitch.checkInCount + 1,
    })
    setTimeRemaining(DEMO_INTERVAL_SECONDS)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = demoSwitch
    ? Math.max(0, Math.min(100, (timeRemaining / DEMO_INTERVAL_SECONDS) * 100))
    : 100

  return (
    <div className="min-h-screen bg-blue">
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider opacity-50 hidden sm:inline">Interactive Demo</span>
              <Link href="/auth/login" className="text-[11px] uppercase tracking-wider px-4 py-2 bg-orange text-black font-bold hover:bg-white transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div className="h-2 hazard-stripe" />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-black/70 hover:text-orange text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Home
        </Link>

        {/* INTRO PHASE */}
        {phase === 'intro' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-4">
                What is a Dead Man's Switch?
              </h1>
              <p className="text-lg text-black/70 max-w-2xl">
                A mechanism that automatically releases information if you stop checking in.
                Used for inheritance, whistleblowing, emergency access, or any scenario where
                information should be released only if something happens to you.
              </p>
            </div>

            {/* Use cases */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white border-4 border-black p-6">
                <Bitcoin className="h-8 w-8 text-orange mb-4" strokeWidth={2} />
                <h3 className="font-bold text-black mb-2">Crypto Inheritance</h3>
                <p className="text-sm text-black/70">
                  Pass wallet seeds to family if you're gone. They can't access it while you're alive.
                </p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <Shield className="h-8 w-8 text-orange mb-4" strokeWidth={2} />
                <h3 className="font-bold text-black mb-2">Whistleblower Insurance</h3>
                <p className="text-sm text-black/70">
                  Evidence releases automatically if you disappear. Protection through transparency.
                </p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <Key className="h-8 w-8 text-orange mb-4" strokeWidth={2} />
                <h3 className="font-bold text-black mb-2">Emergency Access</h3>
                <p className="text-sm text-black/70">
                  Business partners get critical passwords only if you're incapacitated.
                </p>
              </div>
            </div>

            {/* Why decentralization matters */}
            <div className="bg-white border-4 border-black p-6">
              <h2 className="font-bold text-black mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange" />
                Why Decentralization Matters
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-red-500 mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4" /> Centralized Services
                  </h4>
                  <ul className="text-sm text-black/70 space-y-1">
                    <li>Company holds your keys = they can read your secrets</li>
                    <li>Company shuts down = your data is lost forever</li>
                    <li>Company is hacked = your secrets are exposed</li>
                    <li>Company is subpoenaed = government gets access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> EchoLock (Decentralized)
                  </h4>
                  <ul className="text-sm text-black/70 space-y-1">
                    <li>You control your keys = only you can read secrets</li>
                    <li>EchoLock shuts down = system still works</li>
                    <li>No central database to hack</li>
                    <li>No single entity to subpoena</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Start button */}
            <div className="bg-orange border-4 border-black p-8 text-center">
              <h2 className="text-2xl font-bold text-black mb-4">See It In Action</h2>
              <p className="text-black/70 mb-6 max-w-md mx-auto">
                This interactive demo shows the complete lifecycle with accelerated timers
                (1 minute instead of days). Your data stays in your browser only.
              </p>
              <button
                onClick={startDemo}
                className="bg-black text-orange px-8 py-4 font-bold text-lg hover:bg-white hover:text-black transition-colors border-4 border-black"
              >
                <Play className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Start Interactive Demo
              </button>
            </div>
          </div>
        )}

        {/* CREATING PHASE */}
        {phase === 'creating' && demoSwitch && (
          <div className="space-y-6">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-black mb-2">Creating Your Switch</h1>
              <p className="text-black/70">Watch as everything is generated locally in your browser...</p>
            </div>

            <div className="bg-white border-4 border-black">
              <div className="bg-black text-white px-6 py-3">
                <span className="font-bold uppercase tracking-wider text-sm">Setup Progress</span>
              </div>
              <div className="p-6 space-y-6">
                {/* Step 1: Key Generation */}
                <div className={`p-4 border-2 transition-all ${creationStep >= 0 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 1 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                      {creationStep >= 1 ? <CheckCircle className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Step 1: Generate Encryption Key</h3>
                      <p className="text-sm text-black/70 mb-2">
                        A 256-bit AES-GCM key is generated using your browser's cryptographic API.
                        This key never leaves your device.
                      </p>
                      {creationStep >= 1 && (
                        <code className="text-xs bg-black text-green-400 px-2 py-1 font-mono block overflow-hidden">
                          {demoSwitch.encryptionKey}
                        </code>
                      )}
                      <p className="text-xs text-black/50 mt-2">
                        <strong>Why it matters:</strong> Unlike centralized services, EchoLock never sees this key.
                        We literally cannot read your message.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Nostr Identity */}
                <div className={`p-4 border-2 transition-all ${creationStep >= 1 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 2 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                      {creationStep >= 2 ? <CheckCircle className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Step 2: Create Nostr Identity</h3>
                      <p className="text-sm text-black/70 mb-2">
                        A Nostr keypair is generated for signing heartbeats. Anyone can verify
                        you're alive by checking public relays.
                      </p>
                      {creationStep >= 2 && (
                        <code className="text-xs bg-black text-green-400 px-2 py-1 font-mono block overflow-hidden">
                          {demoSwitch.nostrPubkey}
                        </code>
                      )}
                      <p className="text-xs text-black/50 mt-2">
                        <strong>Why it matters:</strong> Heartbeats are signed with your private key using BIP-340 Schnorr signatures.
                        No one can fake your check-ins.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3: Encrypt Secret */}
                <div className={`p-4 border-2 transition-all ${creationStep >= 2 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 3 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                      {creationStep >= 3 ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Step 3: Encrypt Your Secret</h3>
                      <p className="text-sm text-black/70 mb-2">
                        Your message is encrypted with AES-256-GCM. The encrypted blob can be stored
                        anywhere - even publicly - and no one can read it without the key.
                      </p>
                      {creationStep >= 3 && (
                        <div className="text-xs bg-black text-orange px-2 py-1 font-mono">
                          <span className="text-white/50">Encrypted:</span> 7f3a9b2c...{demoSwitch.encryptionKey.substring(0, 16)}...encrypted
                        </div>
                      )}
                      <p className="text-xs text-black/50 mt-2">
                        <strong>Why it matters:</strong> Even if someone intercepts the encrypted message,
                        it's mathematically impossible to decrypt without the key.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Split Key with Shamir */}
                <div className={`p-4 border-2 transition-all ${creationStep >= 3 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 4 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                      {creationStep >= 4 ? <CheckCircle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Step 4: Split Key (Shamir's Secret Sharing)</h3>
                      <p className="text-sm text-black/70 mb-2">
                        The encryption key is split into 5 shares using Shamir's Secret Sharing.
                        Any 3 shares can reconstruct the key, but 2 shares reveal nothing.
                      </p>
                      {creationStep >= 4 && (
                        <div className="grid grid-cols-5 gap-1 text-xs">
                          {demoSwitch.shares.map((share, i) => (
                            <div key={i} className="bg-black text-green-400 px-1 py-1 font-mono truncate">
                              {share.substring(0, 8)}...
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-black/50 mt-2">
                        <strong>Why it matters:</strong> No single guardian can access your secret.
                        Even 2 colluding guardians learn nothing. You need 3 of 5 to reconstruct.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5: Distribute to Guardians */}
                <div className={`p-4 border-2 transition-all ${creationStep >= 4 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 5 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                      {creationStep >= 5 ? <CheckCircle className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Step 5: Distribute to Guardians</h3>
                      <p className="text-sm text-black/70 mb-2">
                        Each share is encrypted to a guardian's public key and distributed.
                        Guardians watch for your heartbeats on Nostr.
                      </p>
                      {creationStep >= 5 && (
                        <div className="space-y-1">
                          {demoSwitch.guardians.map((guardian, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="bg-green-500 text-white px-2 py-0.5">Share {i + 1}</span>
                              <span className="text-black/70">{guardian}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-black/50 mt-2">
                        <strong>Why it matters:</strong> You choose your guardians - friends, family, lawyers, or services.
                        EchoLock is just one optional guardian, not a privileged one.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {creationStep >= 5 && (
              <div className="text-center text-black/70 animate-pulse">
                Switch armed! Starting timer...
              </div>
            )}
          </div>
        )}

        {/* ARMED PHASE */}
        {phase === 'armed' && demoSwitch && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="text-3xl font-extrabold text-black mb-2">Switch Armed</h1>
              <p className="text-black/70">Your switch is active. Check in to reset the timer, or let it expire to see the release process.</p>
            </div>

            {/* Timer card */}
            <div className="bg-white border-4 border-black">
              <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">Active - Monitoring Heartbeats</span>
                <span className="bg-white text-green-500 px-3 py-1 text-xs font-bold uppercase">
                  Armed
                </span>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-black mb-2 font-mono">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-black/50 text-sm">Time until guardians are alerted</p>
                </div>

                <div className="h-4 bg-black/10 mb-6 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${progress < 30 ? 'bg-red-500' : progress < 60 ? 'bg-orange' : 'bg-green-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* What's happening now */}
                <div className="bg-blue-light border-2 border-black p-4 mb-6">
                  <h4 className="font-bold text-black mb-2 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-orange" />
                    Right Now (In Real System)
                  </h4>
                  <ul className="text-sm text-black/70 space-y-1">
                    <li>Your heartbeat events are being published to 10 Nostr relays globally</li>
                    <li>All 5 guardians are independently monitoring those relays</li>
                    <li>Anyone can verify your last heartbeat on any Nostr client</li>
                    <li>No central server is involved - guardians watch the public network</li>
                  </ul>
                </div>

                {/* Secret preview */}
                <div className="bg-black/5 border-2 border-black p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-black/50">Your Encrypted Secret</p>
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-xs flex items-center gap-1 text-black/50 hover:text-black"
                    >
                      {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showSecret ? 'Hide' : 'Peek'}
                    </button>
                  </div>
                  <p className={`text-black font-mono text-sm ${showSecret ? '' : 'blur-sm select-none'}`}>
                    {demoSwitch.secret}
                  </p>
                  {!showSecret && (
                    <p className="text-xs text-black/50 mt-2">
                      This is encrypted with AES-256-GCM. Even EchoLock cannot read it.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleCheckIn}
                className="flex-1 bg-green-500 text-white px-6 py-4 font-bold hover:bg-green-600 transition-colors border-4 border-black"
              >
                <CheckCircle className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Check In (Reset Timer)
              </button>
              <button
                onClick={resetDemo}
                className="bg-white text-black px-6 py-4 font-bold hover:bg-black hover:text-white transition-colors border-4 border-black"
              >
                <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Reset Demo
              </button>
            </div>

            {/* Check-in explanation */}
            <div className="bg-white border-4 border-black p-6">
              <h3 className="font-bold text-black mb-3">What happens when you check in?</h3>
              <ol className="text-sm text-black/70 space-y-2 list-decimal list-inside">
                <li>You sign a heartbeat event with your Nostr private key (BIP-340 Schnorr signature)</li>
                <li>The signed event is published to 10+ Nostr relays worldwide</li>
                <li>Guardians see the new heartbeat and reset their internal timers</li>
                <li>The signature proves it's really you - no one can fake your heartbeat</li>
              </ol>
              <p className="text-xs text-black/50 mt-4 pt-4 border-t border-black/10">
                <strong>In production:</strong> You'd check in every 24-168 hours via the app, email link, or even SMS.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white border-2 border-black p-4">
                <div className="text-2xl font-bold text-black">{demoSwitch.checkInCount}</div>
                <div className="text-xs text-black/50 uppercase tracking-wider">Check-ins</div>
              </div>
              <div className="bg-white border-2 border-black p-4">
                <div className="text-2xl font-bold text-black">5</div>
                <div className="text-xs text-black/50 uppercase tracking-wider">Guardians</div>
              </div>
              <div className="bg-white border-2 border-black p-4">
                <div className="text-2xl font-bold text-black">{formatTime(timeElapsed)}</div>
                <div className="text-xs text-black/50 uppercase tracking-wider">Elapsed</div>
              </div>
            </div>
          </div>
        )}

        {/* TRIGGERED PHASE */}
        {phase === 'triggered' && demoSwitch && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="text-3xl font-extrabold text-red-500 mb-2">Switch Triggered!</h1>
              <p className="text-black/70">You didn't check in. Watch as the guardians coordinate to release your secret...</p>
            </div>

            <div className="bg-white border-4 border-red-500">
              <div className="bg-red-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">Release In Progress</span>
                <span className="bg-white text-red-500 px-3 py-1 text-xs font-bold uppercase animate-pulse">
                  Releasing
                </span>
              </div>
              <div className="p-6 space-y-4">
                {/* Step 1: Detection */}
                <div className={`p-4 border-2 transition-all ${triggerStep >= 0 ? 'border-red-500 bg-red-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${triggerStep >= 1 ? 'bg-red-500 border-red-500 text-white' : 'border-red-500 text-red-500'}`}>
                      {triggerStep >= 1 ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5 animate-spin" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Guardians Detect Missing Heartbeat</h3>
                      <p className="text-sm text-black/70">
                        All 5 guardians independently notice no heartbeat on Nostr for the configured period.
                        They don't need to communicate with each other or with EchoLock.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Share Release */}
                <div className={`p-4 border-2 transition-all ${triggerStep >= 1 ? 'border-red-500 bg-red-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${triggerStep >= 2 ? 'bg-red-500 border-red-500 text-white' : 'border-red-500 text-red-500'}`}>
                      {triggerStep >= 2 ? <CheckCircle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Guardians Publish Shares to Nostr</h3>
                      <p className="text-sm text-black/70 mb-2">
                        Each guardian publishes their encrypted share to Nostr relays.
                        Shares are encrypted to your recipients' public keys.
                      </p>
                      {triggerStep >= 2 && (
                        <div className="space-y-1">
                          {demoSwitch.guardians.slice(0, 3).map((guardian, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="bg-red-500 text-white px-2 py-0.5">Published</span>
                              <span className="text-black/70">{guardian}</span>
                            </div>
                          ))}
                          <div className="text-xs text-black/50 italic">
                            (Only need 3 of 5 guardians to respond)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 3: Reconstruction */}
                <div className={`p-4 border-2 transition-all ${triggerStep >= 2 ? 'border-red-500 bg-red-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${triggerStep >= 3 ? 'bg-red-500 border-red-500 text-white' : 'border-red-500 text-red-500'}`}>
                      {triggerStep >= 3 ? <CheckCircle className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Recipients Reconstruct Key</h3>
                      <p className="text-sm text-black/70">
                        Recipients collect 3+ shares from Nostr, decrypt them with their private key,
                        and use Shamir's algorithm to reconstruct the original encryption key.
                      </p>
                      {triggerStep >= 3 && (
                        <code className="text-xs bg-black text-green-400 px-2 py-1 font-mono block mt-2">
                          Reconstructed: {demoSwitch.encryptionKey}
                        </code>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 4: Decryption */}
                <div className={`p-4 border-2 transition-all ${triggerStep >= 3 ? 'border-red-500 bg-red-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${triggerStep >= 4 ? 'bg-green-500 border-green-500 text-white' : 'border-red-500 text-red-500'}`}>
                      {triggerStep >= 4 ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">Decrypt Secret Message</h3>
                      <p className="text-sm text-black/70">
                        With the reconstructed key, recipients decrypt the AES-256-GCM encrypted message.
                        The secret is revealed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div className="bg-orange border-4 border-black p-6">
              <h3 className="font-bold text-black mb-2">The Critical Insight</h3>
              <p className="text-sm text-black/80">
                <strong>Notice what didn't happen:</strong> EchoLock's servers were not involved in the release.
                The guardians acted independently by watching public Nostr relays. Recipients reconstructed
                the key themselves. If EchoLock had shut down yesterday, this release would work identically.
              </p>
            </div>

            <button
              onClick={resetDemo}
              className="w-full bg-white text-black px-6 py-4 font-bold hover:bg-black hover:text-white transition-colors border-4 border-black"
            >
              <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
              Reset Demo
            </button>
          </div>
        )}

        {/* RELEASED PHASE */}
        {phase === 'released' && demoSwitch && (
          <div className="space-y-6">
            <div className="mb-4">
              <h1 className="text-3xl font-extrabold text-green-600 mb-2">Secret Released</h1>
              <p className="text-black/70">The complete lifecycle is finished. Your recipients now have access to your secret.</p>
            </div>

            <div className="bg-white border-4 border-green-500">
              <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">Release Complete</span>
                <span className="bg-white text-green-500 px-3 py-1 text-xs font-bold uppercase">
                  Success
                </span>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
                </div>

                <div className="bg-green-50 border-2 border-green-200 p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-green-600 mb-2">Decrypted Secret</p>
                  <p className="text-black font-mono text-sm break-all">
                    {demoSwitch.secret}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-black/70 mb-6">
                  <div>Total check-ins: <strong>{demoSwitch.checkInCount}</strong></div>
                  <div>Total time: <strong>{formatTime(timeElapsed)}</strong></div>
                  <div>Guardians responded: <strong>3 of 5</strong></div>
                  <div>Shares used: <strong>3 (minimum)</strong></div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white border-4 border-black p-6">
              <h3 className="font-bold text-black mb-4">What Just Happened (Summary)</h3>
              <ol className="text-sm text-black/70 space-y-3 list-decimal list-inside">
                <li><strong>Key Generation:</strong> 256-bit AES key created in your browser (never sent anywhere)</li>
                <li><strong>Nostr Identity:</strong> Keypair created for signing heartbeats (publicly verifiable)</li>
                <li><strong>Encryption:</strong> Your secret encrypted with AES-256-GCM</li>
                <li><strong>Shamir Split:</strong> Key split into 5 shares (3 needed to reconstruct)</li>
                <li><strong>Guardian Distribution:</strong> Each share sent to a different guardian</li>
                <li><strong>Heartbeat Monitoring:</strong> Guardians watched Nostr for your check-ins</li>
                <li><strong>Trigger:</strong> No heartbeat detected, guardians published shares</li>
                <li><strong>Reconstruction:</strong> Recipients collected 3 shares, rebuilt the key</li>
                <li><strong>Decryption:</strong> Secret message revealed to recipients</li>
              </ol>
            </div>

            {/* The promise */}
            <div className="bg-black text-white p-6 border-4 border-orange">
              <h3 className="font-bold text-orange mb-2">The EchoLock Promise</h3>
              <p className="text-sm text-white/80">
                If EchoLock disappeared tomorrow, this entire process would still work.
                You have your keys. Your guardians are watching public Nostr relays.
                Your recipients can reconstruct independently.
                <strong className="text-orange"> We built this to be eliminable.</strong>
              </p>
            </div>

            {/* Production differences */}
            <div className="bg-blue-light border-2 border-black p-6">
              <h3 className="font-bold text-black mb-3">In Production (vs This Demo)</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-bold text-black/70 mb-2">Demo</h4>
                  <ul className="text-black/60 space-y-1">
                    <li>1 minute check-in interval</li>
                    <li>10 second release delay</li>
                    <li>Data in browser memory</li>
                    <li>Simulated guardians</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-black/70 mb-2">Production</h4>
                  <ul className="text-black/60 space-y-1">
                    <li>24 hours to 7 days check-in</li>
                    <li>Configurable grace period</li>
                    <li>Real Nostr relays (10+ global)</li>
                    <li>Real guardians you choose</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetDemo}
                className="flex-1 bg-orange text-black px-6 py-4 font-bold hover:bg-black hover:text-orange transition-colors border-4 border-black"
              >
                <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Try Again
              </button>
              <Link
                href="/auth/login"
                className="flex-1 bg-black text-white px-6 py-4 font-bold hover:bg-orange hover:text-black transition-colors border-4 border-black text-center"
              >
                Create Real Switch
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs opacity-50">
            ECHOLOCK v1.0 | Fully Decentralized | Open Source (AGPL-3.0) | No Server Required
          </p>
        </div>
      </footer>
    </div>
  )
}
