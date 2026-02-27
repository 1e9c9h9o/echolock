'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, RotateCcw, Clock, Shield, CheckCircle, Key, Lock, Users, Radio, Bitcoin, Eye, EyeOff, GraduationCap, Code, ArrowRight, Info } from 'lucide-react'

type DemoPhase = 'intro' | 'creating' | 'armed' | 'triggered' | 'released'
type ExplainMode = 'eli5' | 'technical'

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
  guardians: { name: string; type: string }[]
  shares: string[]
}

// More relatable secret examples
const SECRET_EXAMPLES = [
  { label: 'Gmail Password', value: 'Gmail: john.smith@gmail.com\nPassword: MyS3cur3P@ss!2024' },
  { label: 'Bank Safe Box', value: 'First National Bank\nSafe Deposit Box #4521\nAccess Code: 7-29-14-33' },
  { label: 'Bitcoin Wallet', value: 'Coinbase recovery phrase:\nabandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' },
]

const DEMO_INTERVAL_SECONDS = 30

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

// Toggle component
function ModeToggle({ mode, setMode }: { mode: ExplainMode; setMode: (m: ExplainMode) => void }) {
  return (
    <div className="flex items-center gap-2 bg-white border-2 border-black p-1">
      <button
        onClick={() => setMode('eli5')}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors ${
          mode === 'eli5' ? 'bg-orange text-black' : 'text-black/50 hover:text-black'
        }`}
      >
        <GraduationCap className="h-3 w-3" />
        Simple
      </button>
      <button
        onClick={() => setMode('technical')}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors ${
          mode === 'technical' ? 'bg-black text-white' : 'text-black/50 hover:text-black'
        }`}
      >
        <Code className="h-3 w-3" />
        Technical
      </button>
    </div>
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
  const [mode, setMode] = useState<ExplainMode>('eli5')
  const [demoSwitch, setDemoSwitch] = useState<DemoSwitch | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [creationStep, setCreationStep] = useState(0)
  const [showSecret, setShowSecret] = useState(false)
  const [triggerStep, setTriggerStep] = useState(0)
  const [selectedSecret, setSelectedSecret] = useState(0)

  const isEli5 = mode === 'eli5'

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

  // Trigger phase auto-advances
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
      secret: SECRET_EXAMPLES[selectedSecret].value,
      status: 'active',
      checkInInterval: DEMO_INTERVAL_SECONDS,
      nextCheckInAt: nextCheckIn.toISOString(),
      createdAt: now.toISOString(),
      checkInCount: 0,
      encryptionKey: generateFakeKey(),
      nostrPubkey: generateFakeNpub(),
      guardians: [
        { name: 'Alice (your sister)', type: 'family' },
        { name: 'Bob (your lawyer)', type: 'professional' },
        { name: 'Carol (your best friend)', type: 'friend' },
        { name: 'Dave (your accountant)', type: 'professional' },
        { name: 'EchoLock Service', type: 'service' },
      ],
      shares: Array.from({ length: 5 }, () => generateFakeKey().substring(0, 32)),
    }

    setDemoSwitch(newSwitch)
    setPhase('creating')
    setCreationStep(0)
    setTimeElapsed(0)
    setTimeRemaining(DEMO_INTERVAL_SECONDS)
  }

  const advanceCreationStep = () => {
    if (creationStep < 5) {
      setCreationStep(creationStep + 1)
    } else {
      setPhase('armed')
    }
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
            <Link href="/auth/login" className="text-[11px] uppercase tracking-wider px-4 py-2 bg-orange text-black font-bold hover:bg-white transition-colors hidden sm:block">
              Log In
            </Link>
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
                {isEli5 ? "What's a Dead Man's Switch?" : "What is a Dead Man's Switch?"}
              </h1>

              {/* Toggle moved here, right below heading */}
              <div className="mb-6 inline-block">
                <ModeToggle mode={mode} setMode={setMode} />
              </div>

              <p className="text-lg text-black/70 max-w-2xl">
                {isEli5
                  ? "It's a way to automatically share important information with someone you trust - but ONLY if something happens to you. As long as you keep \"checking in\" (clicking a button every few days), nothing happens. If you stop checking in, your information gets delivered."
                  : "A mechanism that automatically releases information if you stop checking in. The system monitors for your heartbeats - if none are detected for a configured period, it triggers the release of encrypted information to designated recipients."}
              </p>
            </div>

            {/* Use cases */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white border-2 border-black p-6">
                <Bitcoin className="h-8 w-8 text-orange mb-4" strokeWidth={2} />
                <h3 className="font-bold text-black mb-2">
                  {isEli5 ? "Pass On Passwords" : "Digital Inheritance"}
                </h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "Your family gets access to your accounts (email, bank, crypto) but ONLY if you're gone."
                    : "Pass credentials and wallet seeds to family, accessible only if you don't check in."}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-6">
                <Shield className="h-8 w-8 text-orange mb-4" strokeWidth={2} />
                <h3 className="font-bold text-black mb-2">
                  {isEli5 ? "Protection" : "Insurance Policy"}
                </h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "If you have important documents, they get shared automatically if something happens to you."
                    : "Evidence or documents release automatically if you're unable to check in."}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-6">
                <Key className="h-8 w-8 text-orange mb-4" strokeWidth={2} />
                <h3 className="font-bold text-black mb-2">
                  {isEli5 ? "Emergency Access" : "Business Continuity"}
                </h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "Your business partner gets critical passwords if you can't work anymore."
                    : "Partners get critical system access only if you're incapacitated."}
                </p>
              </div>
            </div>

            {/* What you'll need - explaining the trusted contacts requirement */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="font-bold text-black mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-orange" />
                {isEli5 ? "What You'll Need" : "Requirements"}
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-black">
                    {isEli5 ? "Trusted Contacts" : "Guardians"}
                  </h3>
                  <p className="text-sm text-black/70 mt-1">
                    {isEli5
                      ? "These are people (or services) who will watch for your check-ins. They could be family members, friends, your lawyer, your accountant - anyone you trust. Each one holds a \"piece of the puzzle\" and can't read your secret alone."
                      : "Guardians are entities who monitor your heartbeats and hold key shares. They can be individuals (family, friends, attorneys) or services. Each guardian holds one Shamir share — worthless alone, but enough shares at your chosen threshold can reconstruct the key."}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-black">
                    {isEli5 ? "Why multiple contacts?" : "Why configurable thresholds?"}
                  </h3>
                  <p className="text-sm text-black/70 mt-1">
                    {isEli5
                      ? "This is about safety: you pick how many people guard your secret and how many are needed to unlock it. More guardians means more redundancy. A higher threshold means more security. The default (3-of-5) is a good balance for most people."
                      : "You choose the threshold: 2-of-3 for simplicity, 3-of-5 for balance, 4-of-7 or 5-of-9 for higher security. The tradeoff is always redundancy vs. collusion resistance. Guardians can be friends, family, professionals, or services like EchoLock."}
                  </p>
                </div>
              </div>
            </div>

            {/* Choose your demo secret */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="font-bold text-black mb-4">
                {isEli5 ? "Choose a Practice Secret" : "Select Demo Secret"}
              </h2>
              <p className="text-sm text-black/70 mb-4">
                {isEli5
                  ? "Pick something realistic to see how it works (this is just pretend - nothing is saved!):"
                  : "Select a realistic example for the demo (simulated only, nothing is stored):"}
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                {SECRET_EXAMPLES.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSecret(i)}
                    className={`p-4 border-2 text-left transition-all ${
                      selectedSecret === i
                        ? 'border-orange bg-orange/10'
                        : 'border-black/20 hover:border-black'
                    }`}
                  >
                    <div className="font-bold text-black text-sm">{example.label}</div>
                    <div className="text-xs text-black/50 mt-1 font-mono truncate">
                      {example.value.split('\n')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <div className="bg-orange border-2 border-black p-8 text-center">
              <h2 className="text-2xl font-bold text-black mb-4">
                {isEli5 ? "Ready to Try It?" : "See It In Action"}
              </h2>
              <p className="text-black/70 mb-6 max-w-md mx-auto">
                {isEli5
                  ? "This demo uses a 1-minute timer (real ones use days). Nothing is saved - click around and learn how it works!"
                  : "Interactive demo with accelerated timers (1 minute vs days). Data stays in browser memory only."}
              </p>
              <button
                onClick={startDemo}
                className="bg-black text-orange px-8 py-4 font-bold text-lg hover:bg-white hover:text-black transition-colors border-2 border-black"
              >
                <Play className="h-5 w-5 inline mr-2" strokeWidth={2} />
                {isEli5 ? "Start Demo" : "Start Interactive Demo"}
              </button>
            </div>
          </div>
        )}

        {/* CREATING PHASE - Now interactive! */}
        {phase === 'creating' && demoSwitch && (
          <div className="space-y-6">
            {/* Toggle always visible */}
            <div className="flex justify-end">
              <ModeToggle mode={mode} setMode={setMode} />
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-black mb-2">
                {isEli5 ? "Setting Up Your Switch" : "Creating Your Switch"}
              </h1>
              <p className="text-black/70">
                {isEli5
                  ? "Click through each step to see how your secret gets protected. Everything happens on YOUR device."
                  : "Step through the setup process. All cryptographic operations happen locally in your browser."}
              </p>
            </div>

            <div className="bg-white border-2 border-black">
              <div className="bg-black text-white px-6 py-3 flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-sm">
                  {isEli5 ? `Step ${Math.min(creationStep + 1, 5)} of 5` : `Setup Step ${Math.min(creationStep + 1, 5)}/5`}
                </span>
                <span className="text-xs opacity-50">
                  {isEli5 ? "Click 'Next' to continue" : "Click to advance"}
                </span>
              </div>
              <div className="p-6 space-y-6">
                {/* Step 1: Your Secret */}
                <div className={`p-4 border-2 transition-all ${creationStep >= 0 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 1 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                      {creationStep >= 1 ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">
                        {isEli5 ? "Step 1: Your Secret" : "Step 1: Your Secret Message"}
                      </h3>
                      <p className="text-sm text-black/70 mb-2">
                        {isEli5
                          ? "This is the information you want to pass on. It could be a password, account details, or any important message."
                          : "The information to be released. Can be any text: credentials, instructions, or sensitive data."}
                      </p>
                      {creationStep >= 0 && (
                        <div className="bg-black/5 border border-black/20 p-3 font-mono text-sm whitespace-pre-wrap">
                          {demoSwitch.secret}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2: Generate Encryption Key */}
                {creationStep >= 1 && (
                  <div className={`p-4 border-2 transition-all ${creationStep >= 1 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 2 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                        {creationStep >= 2 ? <CheckCircle className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-black">
                          {isEli5 ? "Step 2: Create a Lock" : "Step 2: Generate Encryption Key"}
                        </h3>
                        <p className="text-sm text-black/70 mb-2">
                          {isEli5
                            ? "A super-strong password is created RIGHT HERE on your device. EchoLock never sees it - that's what makes this secure!"
                            : "A 256-bit AES-GCM key is generated using WebCrypto API. This key never leaves your device - EchoLock never has access to it."}
                        </p>
                        {creationStep >= 2 && (
                          <code className="text-xs bg-black text-green-400 px-2 py-1 font-mono block overflow-hidden">
                            {isEli5 ? "🔑 [Your encryption key - only exists on YOUR device]" : demoSwitch.encryptionKey}
                          </code>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Encrypt */}
                {creationStep >= 2 && (
                  <div className={`p-4 border-2 transition-all ${creationStep >= 2 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 3 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                        {creationStep >= 3 ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-black">
                          {isEli5 ? "Step 3: Scramble It" : "Step 3: Encrypt Your Secret"}
                        </h3>
                        <p className="text-sm text-black/70 mb-2">
                          {isEli5
                            ? "Your secret is scrambled into random-looking gibberish. Without the key, it's completely unreadable - even by us!"
                            : "Your message is encrypted using AES-256-GCM. The ciphertext can be stored anywhere (even publicly) and remains secure."}
                        </p>
                        {creationStep >= 3 && (
                          <div className="text-xs bg-black text-orange px-2 py-1 font-mono">
                            {isEli5
                              ? "🔒 [Scrambled: looks like random letters and numbers now]"
                              : <><span className="text-white/50">Ciphertext:</span> 7f3a9b2c4d8e...{generateFakeKey().substring(0, 20)}...</>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Split the Key */}
                {creationStep >= 3 && (
                  <div className={`p-4 border-2 transition-all ${creationStep >= 3 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 4 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                        {creationStep >= 4 ? <CheckCircle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-black">
                          {isEli5 ? "Step 4: Split the Key into Pieces" : "Step 4: Shamir Secret Sharing"}
                        </h3>
                        <p className="text-sm text-black/70 mb-2">
                          {isEli5
                            ? "The encryption key is broken into puzzle pieces and split among your guardians. You need a minimum number of pieces to rebuild it — fewer than that reveals nothing."
                            : "The encryption key is split into shares using Shamir's Secret Sharing at your chosen threshold (default 3-of-5). Below-threshold shares reveal zero information about the key."}
                        </p>
                        {creationStep >= 4 && (
                          <div className="grid grid-cols-5 gap-1 text-xs">
                            {demoSwitch.shares.map((share, i) => (
                              <div key={i} className="bg-black text-green-400 px-1 py-1 font-mono truncate text-center">
                                {isEli5 ? `Piece ${i+1}` : share.substring(0, 6) + '...'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Distribute to Guardians */}
                {creationStep >= 4 && (
                  <div className={`p-4 border-2 transition-all ${creationStep >= 4 ? 'border-black bg-green-50' : 'border-black/20 opacity-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center border-2 ${creationStep >= 5 ? 'bg-green-500 border-green-500 text-white' : 'border-black'}`}>
                        {creationStep >= 5 ? <CheckCircle className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-black">
                          {isEli5 ? "Step 5: Give Pieces to Your Trusted Contacts" : "Step 5: Distribute Shares to Guardians"}
                        </h3>
                        <p className="text-sm text-black/70 mb-2">
                          {isEli5
                            ? "Each piece goes to someone you trust. These could be family, friends, your lawyer - anyone. They'll watch for your check-ins."
                            : "Each share is encrypted to a guardian's public key and distributed. Guardians monitor Nostr relays for your heartbeats."}
                        </p>
                        {creationStep >= 5 && (
                          <div className="space-y-1">
                            {demoSwitch.guardians.map((guardian, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="bg-green-500 text-white px-2 py-0.5">
                                  Piece {i+1}
                                </span>
                                <span className="text-black/70">{guardian.name}</span>
                                <span className="text-black/40">({guardian.type})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Next button */}
              <div className="border-t-2 border-black px-6 py-4 bg-black/5">
                <button
                  onClick={advanceCreationStep}
                  className="w-full bg-orange text-black px-6 py-3 font-bold hover:bg-black hover:text-orange transition-colors border-2 border-black flex items-center justify-center gap-2"
                >
                  {creationStep >= 5 ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      {isEli5 ? "Done! Start the Timer" : "Complete Setup"}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5" />
                      {isEli5 ? "Next Step" : "Continue"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Explanation for current step */}
            {creationStep < 5 && (
              <div className="bg-blue-light border-2 border-black p-4">
                <h4 className="font-bold text-black mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange" />
                  {isEli5 ? "Why this matters" : "Security note"}
                </h4>
                <p className="text-sm text-black/70">
                  {creationStep === 0 && (isEli5
                    ? "Your secret never leaves your device unencrypted. What gets stored online is scrambled gibberish."
                    : "The plaintext is only processed in-browser. Only encrypted ciphertext is transmitted or stored.")}
                  {creationStep === 1 && (isEli5
                    ? "This key is generated randomly on YOUR device. EchoLock never sees it, so we literally cannot read your secret."
                    : "Key generation uses browser's secure random number generator. EchoLock has zero knowledge of this key.")}
                  {creationStep === 2 && (isEli5
                    ? "AES-256 is what banks use. Without the key, even the fastest computers would take billions of years to crack it."
                    : "AES-256-GCM provides authenticated encryption with 128-bit security level. Computationally infeasible to break.")}
                  {creationStep === 3 && (isEli5
                    ? "If 2 contacts team up to peek at your secret, they still can't - they need 3 pieces. But if 2 contacts are unavailable, you're still okay!"
                    : "Information-theoretic security: 2 shares reveal zero bits about the secret. System remains functional with up to 2 guardian failures.")}
                  {creationStep === 4 && (isEli5
                    ? "You pick who holds the pieces. Could be all family, all friends, or a mix. EchoLock can be ONE of the 5, but doesn't have to be."
                    : "Guardian selection is user-controlled. EchoLock is an optional guardian with no special privileges.")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ARMED PHASE */}
        {phase === 'armed' && demoSwitch && (
          <div className="space-y-6">
            {/* Toggle */}
            <div className="flex justify-end">
              <ModeToggle mode={mode} setMode={setMode} />
            </div>

            <div className="mb-4">
              <h1 className="text-3xl font-extrabold text-black mb-2">
                {isEli5 ? "Your Switch is Active!" : "Switch Armed"}
              </h1>
              <p className="text-black/70">
                {isEli5
                  ? "Check in before time runs out to keep your secret safe. Or let the timer expire to see what happens!"
                  : "Check in to reset the timer, or let it expire to observe the release process."}
              </p>
            </div>

            {/* Timer card */}
            <div className="bg-white border-2 border-black">
              <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">
                  {isEli5 ? "Timer Running" : "Active - Monitoring"}
                </span>
                <span className="bg-white text-green-500 px-3 py-1 text-xs font-bold uppercase">
                  {isEli5 ? "Safe" : "Armed"}
                </span>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-black mb-2 font-mono">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-black/50 text-sm">
                    {isEli5 ? "Time left to check in" : "Until release triggered"}
                  </p>
                </div>

                <div className="h-4 bg-black/10 mb-6 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${progress < 30 ? 'bg-red-500' : progress < 60 ? 'bg-orange' : 'bg-green-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* What's happening */}
                <div className="bg-blue-light border-2 border-black p-4 mb-6">
                  <h4 className="font-bold text-black mb-2 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-orange" />
                    {isEli5 ? "What's happening right now" : "Current activity"}
                  </h4>
                  <ul className="text-sm text-black/70 space-y-1">
                    {isEli5 ? (
                      <>
                        <li>• Your trusted contacts are watching for your check-ins</li>
                        <li>• Each contact has their puzzle piece ready</li>
                        <li>• If you don't check in, they'll share their pieces</li>
                        <li>• Your recipient will then be able to read your secret</li>
                      </>
                    ) : (
                      <>
                        <li>• All guardians monitoring Nostr relays for your heartbeat</li>
                        <li>• Each guardian holds one encrypted share</li>
                        <li>• Missing heartbeat triggers independent share release</li>
                        <li>• Recipients reconstruct key once threshold is met</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Secret preview */}
                <div className="bg-black/5 border-2 border-black p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-black/50">
                      {isEli5 ? "Your Secret (Locked)" : "Encrypted Secret"}
                    </p>
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-xs flex items-center gap-1 text-black/50 hover:text-black"
                    >
                      {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showSecret ? 'Hide' : 'Peek'}
                    </button>
                  </div>
                  <p className={`text-black font-mono text-sm whitespace-pre-wrap ${showSecret ? '' : 'blur-sm select-none'}`}>
                    {demoSwitch.secret}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleCheckIn}
                className="flex-1 bg-green-500 text-white px-6 py-4 font-bold hover:bg-green-600 transition-colors border-2 border-black"
              >
                <CheckCircle className="h-5 w-5 inline mr-2" strokeWidth={2} />
                {isEli5 ? "I'm OK! (Check In)" : "Check In"}
              </button>
              <button
                onClick={resetDemo}
                className="bg-white text-black px-6 py-4 font-bold hover:bg-black hover:text-white transition-colors border-2 border-black"
              >
                <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Reset
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white border-2 border-black p-4">
                <div className="text-2xl font-bold text-black">{demoSwitch.checkInCount}</div>
                <div className="text-xs text-black/50 uppercase tracking-wider">Check-ins</div>
              </div>
              <div className="bg-white border-2 border-black p-4">
                <div className="text-2xl font-bold text-black">5</div>
                <div className="text-xs text-black/50 uppercase tracking-wider">
                  {isEli5 ? "Contacts" : "Guardians"}
                </div>
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
            {/* Toggle */}
            <div className="flex justify-end">
              <ModeToggle mode={mode} setMode={setMode} />
            </div>

            <div className="mb-4">
              <h1 className="text-3xl font-extrabold text-red-500 mb-2">
                {isEli5 ? "Time's Up! Release Starting..." : "Switch Triggered"}
              </h1>
              <p className="text-black/70">
                {isEli5
                  ? "You didn't check in, so your contacts are now sharing their puzzle pieces..."
                  : "No heartbeat detected. Guardians are releasing their shares..."}
              </p>
            </div>

            <div className="bg-white border-2 border-red-500">
              <div className="bg-red-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">
                  {isEli5 ? "Releasing..." : "Release In Progress"}
                </span>
                <span className="bg-white text-red-500 px-3 py-1 text-xs font-bold uppercase animate-pulse">
                  Active
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
                      <h3 className="font-bold text-black">
                        {isEli5 ? "Contacts Notice You Didn't Check In" : "Guardians Detect Missing Heartbeat"}
                      </h3>
                      <p className="text-sm text-black/70">
                        {isEli5
                          ? "All 5 of your contacts independently notice you haven't checked in. They don't need to talk to each other - each one decides on their own."
                          : "Each guardian independently observes no heartbeat on Nostr for the configured period. No coordination required - they act autonomously."}
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
                      <h3 className="font-bold text-black">
                        {isEli5 ? "Contacts Share Their Pieces" : "Guardians Publish Shares"}
                      </h3>
                      <p className="text-sm text-black/70 mb-2">
                        {isEli5
                          ? "Each contact shares their puzzle piece. The pieces are wrapped so only your recipient can open them."
                          : "Guardians publish their encrypted shares to Nostr relays. Shares are encrypted to recipients' public keys."}
                      </p>
                      {triggerStep >= 2 && (
                        <div className="space-y-1">
                          {demoSwitch.guardians.slice(0, 3).map((guardian, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="bg-red-500 text-white px-2 py-0.5">
                                Released
                              </span>
                              <span className="text-black/70">{guardian.name}</span>
                            </div>
                          ))}
                          <div className="text-xs text-black/50 italic mt-2">
                            {isEli5
                              ? "Enough pieces released - that's the threshold!"
                              : "Threshold met - sufficient shares released"}
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
                      <h3 className="font-bold text-black">
                        {isEli5 ? "Recipient Collects the Pieces" : "Recipient Reconstructs Key"}
                      </h3>
                      <p className="text-sm text-black/70">
                        {isEli5
                          ? "Your recipient gathers 3 pieces and puts them together to rebuild the encryption key."
                          : "Recipient collects 3+ shares from Nostr, decrypts them, and uses Shamir's algorithm to reconstruct the key."}
                      </p>
                      {triggerStep >= 3 && (
                        <code className="text-xs bg-black text-green-400 px-2 py-1 font-mono block mt-2">
                          {isEli5
                            ? "🔑 Key rebuilt from 3 pieces!"
                            : `Reconstructed: ${demoSwitch.encryptionKey}`}
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
                      <h3 className="font-bold text-black">
                        {isEli5 ? "Secret Unlocked!" : "Decrypt Message"}
                      </h3>
                      <p className="text-sm text-black/70">
                        {isEli5
                          ? "With the rebuilt key, your recipient can now unscramble and read your message!"
                          : "Recipient uses reconstructed key to decrypt the AES-256-GCM ciphertext."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={resetDemo}
              className="w-full bg-white text-black px-6 py-4 font-bold hover:bg-black hover:text-white transition-colors border-2 border-black"
            >
              <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
              Reset Demo
            </button>
          </div>
        )}

        {/* RELEASED PHASE */}
        {phase === 'released' && demoSwitch && (
          <div className="space-y-6">
            {/* Toggle */}
            <div className="flex justify-end">
              <ModeToggle mode={mode} setMode={setMode} />
            </div>

            <div className="mb-4">
              <h1 className="text-3xl font-extrabold text-green-600 mb-2">
                {isEli5 ? "Secret Delivered!" : "Release Complete"}
              </h1>
              <p className="text-black/70">
                {isEli5
                  ? "Your recipient now has your secret. The whole process worked without needing a central server!"
                  : "The complete lifecycle is finished. Recipients can now access the decrypted message."}
              </p>
            </div>

            <div className="bg-white border-2 border-green-500">
              <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">
                  {isEli5 ? "Done!" : "Complete"}
                </span>
                <span className="bg-white text-green-500 px-3 py-1 text-xs font-bold uppercase">
                  Success
                </span>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
                </div>

                <div className="bg-green-50 border-2 border-green-200 p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-green-600 mb-2">
                    {isEli5 ? "Your Secret (Now Readable)" : "Decrypted Message"}
                  </p>
                  <p className="text-black font-mono text-sm whitespace-pre-wrap">
                    {demoSwitch.secret}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-black/70">
                  <div>Check-ins: <strong>{demoSwitch.checkInCount}</strong></div>
                  <div>Total time: <strong>{formatTime(timeElapsed)}</strong></div>
                  <div>{isEli5 ? "Contacts responded" : "Guardians responded"}: <strong>3 of {demoSwitch.guardians.length}</strong></div>
                  <div>{isEli5 ? "Pieces used" : "Shares used"}: <strong>3 (threshold)</strong></div>
                </div>
              </div>
            </div>

            {/* Key takeaway - This is the money shot for Jack */}
            <div className="bg-black text-white p-6 border-2 border-orange">
              <h3 className="font-bold text-orange mb-3 text-lg">
                {isEli5 ? "The Magic: No Company Required" : "No Trusted Third Party"}
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-white/90">
                  {isEli5
                    ? "Everything just happened on Nostr - a public network that nobody owns. Your contacts watched for check-ins and released their pieces automatically."
                    : "This entire process ran on Nostr relays. Guardians monitored heartbeats independently. Shares were released to Nostr. Recipients reconstructed locally."}
                </p>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <p className="text-orange font-bold">
                    {isEli5
                      ? "If EchoLock disappeared tomorrow, this would still work exactly the same."
                      : "EchoLock is eliminable. The protocol works identically without us."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetDemo}
                className="flex-1 bg-orange text-black px-6 py-4 font-bold hover:bg-black hover:text-orange transition-colors border-2 border-black"
              >
                <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Try Again
              </button>
              <Link
                href="/auth/login"
                className="flex-1 bg-black text-white px-6 py-4 font-bold hover:bg-orange hover:text-black transition-colors border-2 border-black text-center"
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
            ECHOLOCK v1.0 | Open Source (AGPL-3.0)
          </p>
        </div>
      </footer>
    </div>
  )
}
