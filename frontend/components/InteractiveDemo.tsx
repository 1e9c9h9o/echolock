'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

type DemoStep =
  | 'idle'
  | 'creating'
  | 'encrypting'
  | 'distributing'
  | 'countdown'
  | 'releasing'
  | 'complete'

export default function InteractiveDemo() {
  const [step, setStep] = useState<DemoStep>('idle')
  const [countdown, setCountdown] = useState(10)
  const [switchId, setSwitchId] = useState('')
  const [message, setMessage] = useState('')

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const resetDemo = () => {
    setStep('idle')
    setCountdown(10)
    setSwitchId('')
    setMessage('')
  }

  const runDemo = async () => {
    // Step 1: Creating switch
    setStep('creating')
    await sleep(1500)
    const demoSwitchId = `demo-${Math.random().toString(36).substr(2, 9)}`
    setSwitchId(demoSwitchId)

    // Step 2: Encrypting
    setStep('encrypting')
    await sleep(2000)

    // Step 3: Distributing
    setStep('distributing')
    await sleep(2500)

    // Step 4: Countdown
    setStep('countdown')
    for (let i = 10; i > 0; i--) {
      setCountdown(i)
      await sleep(1000)
    }

    // Step 5: Releasing
    setStep('releasing')
    await sleep(3000)

    // Step 6: Complete
    setMessage("If you're reading this, the dead man's switch worked!\n\nThis message was encrypted with AES-256-GCM, split into 5 fragments using Shamir's Secret Sharing, distributed to Nostr relays, and automatically released when the timer expired.")
    setStep('complete')
  }

  return (
    <div className="border-2 border-black bg-white p-8 neo-brutal-shadow max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Try It Live</h3>
        <p className="text-black opacity-70">
          Watch how EchoLock encrypts, distributes, and automatically releases a secret
        </p>
      </div>

      {step === 'idle' && (
        <div className="text-center space-y-6">
          <div className="bg-cream/50 p-6 border-2 border-black">
            <p className="text-lg mb-4">
              This demo simulates the full dead man's switch workflow in 20 seconds.
            </p>
            <ul className="text-left space-y-2 max-w-md mx-auto text-base opacity-80">
              <li>✓ Encrypt secret message</li>
              <li>✓ Split key into 5 fragments</li>
              <li>✓ Distribute to Nostr relays</li>
              <li>✓ 10-second countdown timer</li>
              <li>✓ Automatic release on expiry</li>
            </ul>
          </div>
          <Button variant="primary" onClick={runDemo}>
            Start Demo
          </Button>
        </div>
      )}

      {step === 'creating' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-bold">Creating Dead Man's Switch...</span>
          </div>
          <p className="text-base opacity-70 ml-11">
            Generating switch with 10-second timer for demo
          </p>
        </div>
      )}

      {step === 'encrypting' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3 text-green-600">
            <span className="text-2xl">✓</span>
            <span className="text-lg font-bold">Switch Created!</span>
          </div>
          <div className="bg-cream/50 p-4 border-2 border-black font-mono text-sm">
            <div><span className="opacity-60">Switch ID:</span> {switchId}</div>
            <div><span className="opacity-60">Fragments:</span> 3-of-5 threshold</div>
            <div><span className="opacity-60">Status:</span> <span className="text-green-600 font-bold">ARMED</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-bold">Encrypting Message...</span>
          </div>
          <ul className="space-y-2 ml-11 text-base opacity-70">
            <li>• Encrypting with AES-256-GCM</li>
            <li>• Generating 256-bit encryption key</li>
            <li>• Splitting key using Shamir Secret Sharing</li>
          </ul>
        </div>
      )}

      {step === 'distributing' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3 text-green-600">
            <span className="text-2xl">✓</span>
            <span className="text-lg font-bold">Message Encrypted!</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-bold">Distributing Fragments...</span>
          </div>
          <ul className="space-y-2 ml-11 text-base opacity-70">
            <li>• Publishing to relay.damus.io ✓</li>
            <li>• Publishing to nos.lol ✓</li>
            <li>• Publishing to relay.nostr.band ✓</li>
            <li>• Publishing to nostr.wine ✓</li>
            <li>• Publishing to relay.snort.social ✓</li>
            <li className="font-bold text-green-600">• 5 fragments distributed successfully</li>
          </ul>
        </div>
      )}

      {step === 'countdown' && (
        <div className="space-y-6 animate-fade-in-up text-center">
          <div className="flex items-center gap-3 text-green-600 justify-center">
            <span className="text-2xl">✓</span>
            <span className="text-lg font-bold">Fragments Distributed!</span>
          </div>
          <div className="bg-cream/50 p-8 border-2 border-black">
            <p className="text-base opacity-70 mb-4">Waiting for timer to expire...</p>
            <div className="text-6xl font-bold text-blue mb-2">{countdown}</div>
            <p className="text-base opacity-70">seconds remaining</p>
          </div>
          <p className="text-sm opacity-60">
            In production, this would be 72+ hours
          </p>
        </div>
      )}

      {step === 'releasing' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="bg-red/10 p-4 border-2 border-red text-center">
            <p className="text-lg font-bold text-red">⚠️ Timer Expired - No Check-In Received</p>
            <p className="text-base opacity-70 mt-2">Initiating automatic release sequence...</p>
          </div>
          <div className="space-y-4 ml-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
              <span>Fetching encrypted fragments from Nostr relays...</span>
            </div>
            <div className="flex items-center gap-3 text-green-600 ml-9">
              <span>✓ Retrieved 5 fragments</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
              <span>Reconstructing encryption key...</span>
            </div>
            <div className="flex items-center gap-3 text-green-600 ml-9">
              <span>✓ Key reconstructed from 3 fragments</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
              <span>Decrypting message...</span>
            </div>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="bg-green-600 text-white p-6 border-2 border-black text-center">
            <p className="text-2xl font-bold mb-2">📨 Message Released!</p>
            <p className="text-base opacity-90">Decryption successful</p>
          </div>
          <div className="bg-cream p-6 border-2 border-black">
            <p className="text-lg font-bold mb-3">Decrypted Secret Message:</p>
            <p className="text-base leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
          <div className="bg-blue/10 p-4 border-2 border-blue">
            <p className="font-bold mb-2">✓ Demo Complete!</p>
            <ul className="text-sm space-y-1 opacity-80">
              <li>• Secret encrypted with AES-256-GCM</li>
              <li>• Key split into 5 fragments (3-of-5 threshold)</li>
              <li>• Fragments distributed to Nostr relays</li>
              <li>• Timer expired without check-in</li>
              <li>• Message automatically decrypted and released</li>
            </ul>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={resetDemo}>
              Run Demo Again
            </Button>
            <a href="/auth/signup">
              <Button variant="secondary">
                Create Real Switch
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
