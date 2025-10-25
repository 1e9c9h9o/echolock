'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, RotateCcw, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import CountdownTimer from '@/components/CountdownTimer'
import ProgressBar from '@/components/ProgressBar'
import CheckInButton from '@/components/CheckInButton'
import { showToast } from '@/components/ui/ToastContainer'

type DemoPhase = 'intro' | 'armed' | 'triggered' | 'released'

interface DemoSwitch {
  id: string
  secret: string
  status: 'active' | 'expired' | 'cancelled'
  checkInInterval: number // minutes (accelerated)
  nextCheckInAt: string
  createdAt: string
  checkInCount: number
}

const DEMO_SECRET = 'This is a demo secret message. In real use, this could be critical information, passwords, or instructions that will be released if you stop checking in!'

const DEMO_INTERVAL_MINUTES = 1 // 1 minute for demo (vs 24+ hours in real use)

export default function DemoPage() {
  const [phase, setPhase] = useState<DemoPhase>('intro')
  const [demoSwitch, setDemoSwitch] = useState<DemoSwitch | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0) // seconds

  useEffect(() => {
    // Timer to track elapsed time
    if (phase !== 'intro') {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [phase])

  useEffect(() => {
    // Check if demo switch has expired
    if (demoSwitch && demoSwitch.status === 'active') {
      const now = new Date().getTime()
      const target = new Date(demoSwitch.nextCheckInAt).getTime()

      if (now >= target) {
        // Trigger the switch
        setDemoSwitch({
          ...demoSwitch,
          status: 'expired',
        })
        setPhase('triggered')
        showToast('⚠️ Demo switch triggered! Secret will be released in 1 minute.', 'warning')
      }
    }
  }, [demoSwitch, timeElapsed])

  useEffect(() => {
    // Auto-progress from triggered to released after 5 more minutes
    if (phase === 'triggered' && demoSwitch) {
      const releaseTimer = setTimeout(() => {
        setPhase('released')
        showToast('✅ Demo complete! Secret has been released.', 'success')
      }, DEMO_INTERVAL_MINUTES * 60 * 1000) // 1 minute

      return () => clearTimeout(releaseTimer)
    }
  }, [phase, demoSwitch])

  const startDemo = () => {
    const now = new Date()
    const nextCheckIn = new Date(now.getTime() + DEMO_INTERVAL_MINUTES * 60 * 1000)

    const newSwitch: DemoSwitch = {
      id: 'demo-' + Date.now(),
      secret: DEMO_SECRET,
      status: 'active',
      checkInInterval: DEMO_INTERVAL_MINUTES,
      nextCheckInAt: nextCheckIn.toISOString(),
      createdAt: now.toISOString(),
      checkInCount: 0,
    }

    setDemoSwitch(newSwitch)
    setPhase('armed')
    setTimeElapsed(0)
    showToast('🚀 Demo started! This is an accelerated 1-minute lifecycle.', 'info')
  }

  const resetDemo = () => {
    setDemoSwitch(null)
    setPhase('intro')
    setTimeElapsed(0)
    showToast('Demo reset', 'info')
  }

  const handleCheckIn = async () => {
    if (!demoSwitch) return

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const now = new Date()
    const nextCheckIn = new Date(now.getTime() + DEMO_INTERVAL_MINUTES * 60 * 1000)

    setDemoSwitch({
      ...demoSwitch,
      nextCheckInAt: nextCheckIn.toISOString(),
      checkInCount: demoSwitch.checkInCount + 1,
    })

    showToast('Check-in successful! Timer reset to 1 minute.', 'success')
  }

  // Format time elapsed
  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue hover:text-red text-sm md:text-base font-mono font-bold mb-4 md:mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2 md:mb-3">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">DEMO MODE</h1>
          <span className="bg-blue text-cream px-3 py-1 md:px-4 md:py-2 border-2 border-black text-xs md:text-sm font-bold">
            ACCELERATED
          </span>
        </div>
        <p className="text-base md:text-lg font-mono break-words">
          Experience the full lifecycle of a dead man's switch in just 2 minutes
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-100 border-2 border-black p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start">
          <Sparkles className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 flex-shrink-0 text-yellow-700" strokeWidth={2} />
          <div className="font-mono text-sm md:text-base">
            <p className="font-bold mb-2">This is a demonstration with accelerated timers:</p>
            <ul className="list-disc list-inside space-y-1 text-xs md:text-sm break-words">
              <li>Check-in interval: 1 minute (vs 24+ hours in real use)</li>
              <li>Data stored in browser session (not saved to database)</li>
              <li>Demo will auto-complete the full lifecycle</li>
              <li>Try checking in to reset the timer, or let it expire naturally</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Intro Phase */}
      {phase === 'intro' && (
        <Card className="text-center py-8 md:py-12 px-4">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-blue mx-auto mb-6 md:mb-8 flex items-center justify-center border-2 border-black">
            <Play className="h-16 w-16 md:h-20 md:w-20 text-cream" strokeWidth={2} />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">START DEMO</h2>
          <p className="text-base md:text-lg font-mono mb-6 md:mb-8 max-w-2xl mx-auto break-words px-2">
            Click below to create a demo switch and watch the full lifecycle in action.
            You'll see the ARMED, TRIGGERED, and RELEASED states.
          </p>
          <Button variant="primary" onClick={startDemo}>
            <Play className="h-5 w-5 mr-2" strokeWidth={2} />
            Start Demo
          </Button>
        </Card>
      )}

      {/* Armed Phase */}
      {phase === 'armed' && demoSwitch && (
        <div className="space-y-8">
          {/* Status Card */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold">DEMO SWITCH STATUS</h2>
              <StatusBadge status={demoSwitch.status} />
            </div>

            <div className="space-y-6">
              <div className="bg-cream p-6 border-2 border-black">
                <p className="font-mono text-sm font-bold mb-2">SECRET MESSAGE (ENCRYPTED)</p>
                <p className="font-mono text-base blur-sm select-none">
                  {demoSwitch.secret.substring(0, 50)}...
                </p>
                <p className="font-mono text-xs mt-3 text-gray-600">
                  This message is encrypted and will only be visible if triggered
                </p>
              </div>

              <div>
                <CountdownTimer
                  targetDate={demoSwitch.nextCheckInAt}
                  interval={demoSwitch.checkInInterval / 60} // Convert to hours for component
                  showIcon={true}
                />
              </div>

              <div>
                <ProgressBar
                  targetDate={demoSwitch.nextCheckInAt}
                  interval={demoSwitch.checkInInterval / 60}
                  showPercentage={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                <div>
                  <span className="text-gray-600">Check-ins: </span>
                  <span className="font-bold">{demoSwitch.checkInCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Time elapsed: </span>
                  <span className="font-bold">{formatElapsed(timeElapsed)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Explanation Card */}
          <Card variant="info">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">WHAT'S HAPPENING?</h3>
            <div className="font-mono text-xs md:text-sm space-y-2 md:space-y-3 break-words">
              <p>✅ Your switch is ARMED and monitoring for check-ins</p>
              <p>⏱️ You must check in within 1 minute to reset the timer</p>
              <p>⚠️ If you don't check in, the switch will TRIGGER</p>
              <p>📧 Once triggered, your secret will be released after another 1 minute</p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <CheckInButton
              targetDate={demoSwitch.nextCheckInAt}
              status={demoSwitch.status}
              onCheckIn={handleCheckIn}
            />
            <Button variant="secondary" onClick={resetDemo}>
              <RotateCcw className="h-5 w-5 mr-2" strokeWidth={2} />
              Reset Demo
            </Button>
          </div>
        </div>
      )}

      {/* Triggered Phase */}
      {phase === 'triggered' && demoSwitch && (
        <div className="space-y-6 md:space-y-8">
          <Card variant="urgent">
            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold">SWITCH TRIGGERED!</h2>
              <StatusBadge status={demoSwitch.status} />
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="bg-red-100 p-4 md:p-6 border-2 border-black">
                <p className="font-mono text-xs md:text-sm font-bold mb-2">⚠️ TIMER EXPIRED</p>
                <p className="font-mono text-sm md:text-base break-words">
                  You didn't check in within the 1-minute window. The switch has been triggered
                  and your secret will be released shortly.
                </p>
              </div>

              <div className="bg-cream p-4 md:p-6 border-2 border-black">
                <p className="font-mono text-xs md:text-sm font-bold mb-2">SECRET MESSAGE (STILL ENCRYPTED)</p>
                <p className="font-mono text-sm md:text-base blur-sm select-none break-all">
                  {demoSwitch.secret.substring(0, 50)}...
                </p>
                <p className="font-mono text-xs mt-3 text-gray-600">
                  Retrieving fragments from relays... Release in ~1 minute
                </p>
              </div>

              <div className="font-mono text-xs md:text-sm">
                <span className="text-gray-600">Time elapsed: </span>
                <span className="font-bold">{formatElapsed(timeElapsed)}</span>
              </div>
            </div>
          </Card>

          <Card variant="urgent">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">WHAT'S HAPPENING?</h3>
            <div className="font-mono text-xs md:text-sm space-y-2 md:space-y-3 break-words">
              <p>❌ Check-in deadline was missed</p>
              <p>📡 Retrieving encrypted fragments from Nostr relays</p>
              <p>🔓 Reconstructing secret message</p>
              <p>📧 Preparing to release secret to recipients</p>
              <p className="text-xs md:text-sm opacity-90 mt-3 md:mt-4">
                In real use, this process can take 5-60 minutes depending on configuration
              </p>
            </div>
          </Card>

          <Button variant="secondary" onClick={resetDemo}>
            <RotateCcw className="h-5 w-5 mr-2" strokeWidth={2} />
            Reset Demo
          </Button>
        </div>
      )}

      {/* Released Phase */}
      {phase === 'released' && demoSwitch && (
        <div className="space-y-6 md:space-y-8">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold">SECRET RELEASED</h2>
              <span className="bg-green-600 text-white px-3 py-1 md:px-4 md:py-2 border-2 border-black text-xs font-bold uppercase">
                COMPLETE
              </span>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="bg-green-100 p-4 md:p-6 border-2 border-black">
                <p className="font-mono text-xs md:text-sm font-bold mb-2">✅ DEMO COMPLETE</p>
                <p className="font-mono text-sm md:text-base break-words">
                  The full lifecycle has completed. In real use, your secret would now be
                  delivered to all recipients.
                </p>
              </div>

              <div className="bg-white p-4 md:p-6 border-2 border-black">
                <p className="font-mono text-xs md:text-sm font-bold mb-3">SECRET MESSAGE (DECRYPTED)</p>
                <p className="font-mono text-sm md:text-base break-words">
                  {demoSwitch.secret}
                </p>
              </div>

              <div className="font-mono text-xs md:text-sm">
                <span className="text-gray-600">Total demo time: </span>
                <span className="font-bold">{formatElapsed(timeElapsed)}</span>
              </div>
            </div>
          </Card>

          <Card variant="info">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">DEMO SUMMARY</h3>
            <div className="font-mono text-xs md:text-sm space-y-2 md:space-y-3 break-words">
              <p>✅ Switch created and armed</p>
              <p>✅ {demoSwitch.checkInCount > 0 ? `${demoSwitch.checkInCount} check-in(s) performed` : 'No check-ins (let it expire naturally)'}</p>
              <p>✅ Timer expired and switch triggered</p>
              <p>✅ Secret fragments retrieved and reconstructed</p>
              <p>✅ Secret released to recipients</p>
              <p className="text-xs md:text-sm opacity-90 mt-3 md:mt-4">
                In production, this lifecycle typically takes 24-168 hours (1-7 days)
              </p>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Button variant="primary" onClick={resetDemo}>
              <RotateCcw className="h-5 w-5 mr-2" strokeWidth={2} />
              Try Again
            </Button>
            <Link href="/dashboard/create">
              <Button variant="secondary">Create Real Switch</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
