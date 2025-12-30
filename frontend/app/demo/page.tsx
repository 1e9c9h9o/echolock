'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, RotateCcw, Sparkles, Clock, Shield, CheckCircle } from 'lucide-react'

type DemoPhase = 'intro' | 'armed' | 'triggered' | 'released'

interface DemoSwitch {
  id: string
  secret: string
  status: string
  checkInInterval: number // seconds for demo
  nextCheckInAt: string
  createdAt: string
  checkInCount: number
}

const DEMO_SECRET = 'This is a demo secret message. In real use, this could be critical information, passwords, or instructions that will be released if you stop checking in.'

const DEMO_INTERVAL_SECONDS = 60 // 1 minute for demo

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

export default function PublicDemoPage() {
  const [phase, setPhase] = useState<DemoPhase>('intro')
  const [demoSwitch, setDemoSwitch] = useState<DemoSwitch | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    if (phase !== 'intro' && demoSwitch) {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1)

        const now = new Date().getTime()
        const target = new Date(demoSwitch.nextCheckInAt).getTime()
        const remaining = Math.max(0, Math.floor((target - now) / 1000))
        setTimeRemaining(remaining)

        // Check if expired
        if (remaining === 0 && phase === 'armed') {
          setPhase('triggered')
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [phase, demoSwitch])

  useEffect(() => {
    // Auto-progress from triggered to released after 10 seconds
    if (phase === 'triggered') {
      const releaseTimer = setTimeout(() => {
        setPhase('released')
      }, 10000)
      return () => clearTimeout(releaseTimer)
    }
  }, [phase])

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
    }

    setDemoSwitch(newSwitch)
    setPhase('armed')
    setTimeElapsed(0)
    setTimeRemaining(DEMO_INTERVAL_SECONDS)
  }

  const resetDemo = () => {
    setDemoSwitch(null)
    setPhase('intro')
    setTimeElapsed(0)
    setTimeRemaining(0)
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
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-black/70 hover:text-orange text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Home
        </Link>

        {/* Title */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-black">Live Demo</h1>
            <span className="bg-orange text-black px-3 py-1 text-xs font-bold uppercase">
              Accelerated
            </span>
          </div>
          <p className="text-black/70">
            Experience the full lifecycle of a dead man's switch in ~2 minutes
          </p>
        </div>

        {/* Info banner */}
        <div className="bg-white border-4 border-black p-6 mb-8">
          <div className="flex items-start gap-4">
            <Sparkles className="h-6 w-6 text-orange flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="font-bold text-black mb-2">This demo uses accelerated timers:</p>
              <ul className="text-sm text-black/70 space-y-1">
                <li>Check-in interval: <strong>1 minute</strong> (vs 24+ hours in real use)</li>
                <li>Release delay: <strong>10 seconds</strong> (vs hours in real use)</li>
                <li>Data stored in browser only (not saved anywhere)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Demo content */}
        {phase === 'intro' && (
          <div className="bg-white border-4 border-black p-8 text-center">
            <div className="w-24 h-24 bg-black mx-auto mb-6 flex items-center justify-center">
              <Play className="h-12 w-12 text-orange" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-black mb-4">Start the Demo</h2>
            <p className="text-black/70 mb-8 max-w-md mx-auto">
              Click below to create a demo switch. You'll see the ARMED, TRIGGERED, and RELEASED
              states. Try checking in to reset the timer, or let it expire.
            </p>
            <button
              onClick={startDemo}
              className="bg-orange text-black px-8 py-4 font-bold text-lg hover:bg-black hover:text-orange transition-colors border-4 border-black"
            >
              <Play className="h-5 w-5 inline mr-2" strokeWidth={2} />
              Start Demo
            </button>
          </div>
        )}

        {phase === 'armed' && demoSwitch && (
          <div className="space-y-6">
            {/* Status card */}
            <div className="bg-white border-4 border-black">
              <div className="bg-black text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">Switch Status</span>
                <span className="bg-green-500 text-white px-3 py-1 text-xs font-bold uppercase">
                  Armed
                </span>
              </div>
              <div className="p-6">
                {/* Timer display */}
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-black mb-2 font-mono">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-black/50 text-sm uppercase tracking-wider">Until trigger</p>
                </div>

                {/* Progress bar */}
                <div className="h-4 bg-black/10 mb-6">
                  <div
                    className="h-full bg-orange transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Secret preview */}
                <div className="bg-blue-light border-2 border-black p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-black/50 mb-2">Encrypted Secret</p>
                  <p className="text-black/30 blur-sm select-none">
                    {demoSwitch.secret.substring(0, 60)}...
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-black/50" />
                    <span className="text-black/70">Check-ins: <strong>{demoSwitch.checkInCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-black/50" />
                    <span className="text-black/70">Elapsed: <strong>{formatTime(timeElapsed)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleCheckIn}
                className="flex-1 bg-orange text-black px-6 py-4 font-bold hover:bg-black hover:text-orange transition-colors border-4 border-black"
              >
                <CheckCircle className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Check In Now
              </button>
              <button
                onClick={resetDemo}
                className="bg-white text-black px-6 py-4 font-bold hover:bg-black hover:text-white transition-colors border-4 border-black"
              >
                <RotateCcw className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Reset
              </button>
            </div>

            {/* Explanation */}
            <div className="bg-blue-light border-2 border-black p-6">
              <h3 className="font-bold text-black mb-3">What's happening?</h3>
              <ul className="text-sm text-black/70 space-y-2">
                <li>Your switch is <strong>ARMED</strong> and monitoring for check-ins</li>
                <li>You must check in before the timer reaches zero</li>
                <li>If you don't check in, the switch will <strong>TRIGGER</strong></li>
                <li>Once triggered, your secret will be released</li>
              </ul>
            </div>
          </div>
        )}

        {phase === 'triggered' && demoSwitch && (
          <div className="space-y-6">
            <div className="bg-white border-4 border-red-500">
              <div className="bg-red-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">Switch Triggered!</span>
                <span className="bg-white text-red-500 px-3 py-1 text-xs font-bold uppercase">
                  Releasing...
                </span>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-red-500 mb-2">
                    Timer Expired
                  </div>
                  <p className="text-black/50 text-sm">Retrieving fragments from guardians...</p>
                </div>

                <div className="bg-red-50 border-2 border-red-200 p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-red-400 mb-2">Secret (Still Encrypted)</p>
                  <p className="text-black/30 blur-sm select-none">
                    {demoSwitch.secret.substring(0, 60)}...
                  </p>
                </div>

                <div className="text-sm text-black/70">
                  <p>Reconstructing secret from Shamir shares...</p>
                  <p>Release in ~10 seconds</p>
                </div>
              </div>
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

        {phase === 'released' && demoSwitch && (
          <div className="space-y-6">
            <div className="bg-white border-4 border-green-500">
              <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-sm">Secret Released</span>
                <span className="bg-white text-green-500 px-3 py-1 text-xs font-bold uppercase">
                  Complete
                </span>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
                  <p className="text-black/50 text-sm">Demo lifecycle complete</p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-green-600 mb-2">Decrypted Secret</p>
                  <p className="text-black font-mono text-sm">
                    {demoSwitch.secret}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-black/70">
                  <div>Check-ins: <strong>{demoSwitch.checkInCount}</strong></div>
                  <div>Total time: <strong>{formatTime(timeElapsed)}</strong></div>
                </div>
              </div>
            </div>

            <div className="bg-blue-light border-2 border-black p-6">
              <h3 className="font-bold text-black mb-3">Demo Summary</h3>
              <ul className="text-sm text-black/70 space-y-2">
                <li>Switch created and armed</li>
                <li>{demoSwitch.checkInCount > 0 ? `${demoSwitch.checkInCount} check-in(s) performed` : 'No check-ins (timer expired naturally)'}</li>
                <li>Timer expired, switch triggered</li>
                <li>Guardians released shares, secret reconstructed</li>
                <li className="pt-2 border-t border-black/10 mt-2">
                  <strong>In production:</strong> This takes 24-168 hours, not 2 minutes
                </li>
              </ul>
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
            ECHOLOCK v1.0 | Fully Decentralized | No Server Required
          </p>
        </div>
      </footer>
    </div>
  )
}
