'use client'

import { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'

type DemoStep =
  | 'idle'
  | 'typing'
  | 'encrypting'
  | 'encrypted'
  | 'countdown'
  | 'releasing'
  | 'decrypting'
  | 'complete'

const SECRET_MESSAGE = "The backup codes are in the safe. Combination: 24-15-36. Tell my family I love them."
const ENCRYPTED_TEXT = "U2FsdGVkX1+vupppZksvRf9Dz3Q4nVK8mHPxzB7tJYqRwE5gN2xKvL8..."

export default function InteractiveDemo() {
  const [step, setStep] = useState<DemoStep>('idle')
  const [countdown, setCountdown] = useState(8)
  const [typedMessage, setTypedMessage] = useState('')
  const [encryptedDisplay, setEncryptedDisplay] = useState('')
  const [decryptedMessage, setDecryptedMessage] = useState('')
  const [checkInPulse, setCheckInPulse] = useState(false)
  const cancelRef = useRef(false)

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const resetDemo = () => {
    cancelRef.current = true
    setStep('idle')
    setCountdown(8)
    setTypedMessage('')
    setEncryptedDisplay('')
    setDecryptedMessage('')
    setCheckInPulse(false)
    setTimeout(() => {
      cancelRef.current = false
    }, 100)
  }

  // Typing animation effect
  useEffect(() => {
    if (step !== 'typing') return

    let index = 0
    const typeInterval = setInterval(() => {
      if (cancelRef.current) {
        clearInterval(typeInterval)
        return
      }
      if (index < SECRET_MESSAGE.length) {
        setTypedMessage(SECRET_MESSAGE.slice(0, index + 1))
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 50)

    return () => clearInterval(typeInterval)
  }, [step])

  // Check-in button pulse effect during countdown
  useEffect(() => {
    if (step !== 'countdown') return

    const pulseInterval = setInterval(() => {
      setCheckInPulse(prev => !prev)
    }, 800)

    return () => clearInterval(pulseInterval)
  }, [step])

  const runDemo = async () => {
    cancelRef.current = false

    // Step 1: Show message being typed
    setStep('typing')
    await sleep(SECRET_MESSAGE.length * 50 + 1000) // Wait for typing to finish + pause
    if (cancelRef.current) return

    // Step 2: Encrypt the message
    setStep('encrypting')
    await sleep(1500)
    if (cancelRef.current) return

    // Step 3: Show encrypted result
    setEncryptedDisplay(ENCRYPTED_TEXT)
    setStep('encrypted')
    await sleep(2000)
    if (cancelRef.current) return

    // Step 4: Countdown with check-in button NOT being pressed
    setStep('countdown')
    for (let i = 8; i > 0; i--) {
      if (cancelRef.current) return
      setCountdown(i)
      await sleep(1000)
    }
    if (cancelRef.current) return

    // Step 5: Timer expired - releasing
    setStep('releasing')
    await sleep(2000)
    if (cancelRef.current) return

    // Step 6: Decrypting - show message being revealed
    setStep('decrypting')
    let decIndex = 0
    const decryptInterval = setInterval(() => {
      if (cancelRef.current) {
        clearInterval(decryptInterval)
        return
      }
      if (decIndex < SECRET_MESSAGE.length) {
        setDecryptedMessage(SECRET_MESSAGE.slice(0, decIndex + 1))
        decIndex++
      } else {
        clearInterval(decryptInterval)
      }
    }, 30)
    await sleep(SECRET_MESSAGE.length * 30 + 500)
    if (cancelRef.current) return

    // Step 7: Complete
    setStep('complete')
  }

  return (
    <div className="border-2 border-black bg-white p-8 neo-brutal-shadow max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Try It Live</h3>
        <p className="text-black opacity-70">
          See exactly how a dead man's switch protects and releases your message
        </p>
      </div>

      {step === 'idle' && (
        <div className="text-center space-y-6">
          <div className="bg-cream/50 p-6 border-2 border-black">
            <p className="text-lg mb-4">
              Watch the complete lifecycle in 20 seconds:
            </p>
            <ul className="text-left space-y-3 max-w-md mx-auto text-base">
              <li className="flex items-center gap-2">
                <span className="text-blue font-bold">1.</span>
                <span>Type a secret message</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue font-bold">2.</span>
                <span>Encrypt it (unreadable to anyone)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue font-bold">3.</span>
                <span>Timer counts down, <strong>check-in NOT pressed</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue font-bold">4.</span>
                <span>Message automatically decrypted and released</span>
              </li>
            </ul>
          </div>
          <Button variant="primary" onClick={runDemo}>
            Start Demo
          </Button>
        </div>
      )}

      {step === 'typing' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <span className="text-lg font-bold">Step 1: Writing Secret Message</span>
          </div>
          <div className="bg-cream p-6 border-2 border-black">
            <label className="block text-sm font-bold mb-2 opacity-70">Your Secret:</label>
            <div className="bg-white p-4 border-2 border-black min-h-[80px] font-mono text-base">
              {typedMessage}
              <span className="inline-block w-2 h-5 bg-black animate-pulse ml-1"></span>
            </div>
          </div>
          <p className="text-sm opacity-60 text-center">
            This message will only be released if you don't check in...
          </p>
        </div>
      )}

      {step === 'encrypting' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3 text-green-600">
            <span className="text-2xl">✓</span>
            <span className="text-lg">Message written</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-bold">Step 2: Encrypting Message...</span>
          </div>
          <div className="bg-cream p-4 border-2 border-black">
            <div className="font-mono text-sm opacity-70 mb-3">{typedMessage}</div>
            <div className="text-center text-2xl animate-bounce">⬇️</div>
            <div className="text-center text-sm opacity-70 mt-2">
              Applying AES-256-GCM encryption...
            </div>
          </div>
        </div>
      )}

      {step === 'encrypted' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3 text-green-600">
            <span className="text-2xl">✓</span>
            <span className="text-lg font-bold">Message Encrypted</span>
          </div>
          <div className="bg-black text-green-400 p-4 border-2 border-green-600 font-mono text-sm">
            <div className="opacity-70 mb-2">// Encrypted output:</div>
            <div className="break-all">{encryptedDisplay}</div>
          </div>
          <div className="bg-blue/10 p-3 border-2 border-blue text-sm text-center">
            <strong>Now unreadable.</strong> Only the encryption key can decrypt this.
          </div>
        </div>
      )}

      {step === 'countdown' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3 text-green-600">
            <span className="text-2xl">✓</span>
            <span className="text-lg">Message encrypted and stored</span>
          </div>

          <div className="bg-cream/50 p-6 border-2 border-black text-center">
            <p className="text-lg font-bold mb-4">Step 3: Dead Man's Switch Active</p>
            <div className="text-5xl font-bold text-red mb-2">{countdown}</div>
            <p className="text-base opacity-70 mb-6">seconds until release</p>

            {/* The key visual: CHECK-IN button that ISN'T being pressed */}
            <div className="relative">
              <button
                disabled
                className={`
                  px-8 py-4 bg-green-600 text-white font-bold text-xl border-4 border-black
                  opacity-80 cursor-not-allowed
                  ${checkInPulse ? 'scale-105 shadow-lg' : 'scale-100'}
                  transition-all duration-300
                `}
              >
                CHECK IN
              </button>
              <div className="absolute -top-3 -right-3 bg-red text-white px-2 py-1 text-xs font-bold border-2 border-black rotate-12">
                NOT PRESSED
              </div>
            </div>

            <p className="text-sm text-red font-bold mt-4 animate-pulse">
              User is not checking in...
            </p>
          </div>

          <p className="text-xs opacity-60 text-center">
            In real use, this timer would be 24-72+ hours
          </p>
        </div>
      )}

      {step === 'releasing' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="bg-red/20 p-4 border-2 border-red text-center">
            <p className="text-xl font-bold text-red">TIMER EXPIRED</p>
            <p className="text-base opacity-70 mt-2">No check-in received. Releasing message...</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-green-600">
              <span>✓</span>
              <span>Retrieving encryption key fragments...</span>
            </div>
            <div className="flex items-center gap-3 text-green-600">
              <span>✓</span>
              <span>Reconstructing decryption key...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-3 border-blue border-t-transparent rounded-full animate-spin"></div>
              <span>Decrypting message...</span>
            </div>
          </div>
        </div>
      )}

      {step === 'decrypting' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔓</span>
            <span className="text-lg font-bold">Step 4: Decrypting Message</span>
          </div>
          <div className="bg-cream p-6 border-2 border-black">
            <label className="block text-sm font-bold mb-2 opacity-70">Revealed Message:</label>
            <div className="bg-white p-4 border-2 border-green-600 min-h-[80px] font-mono text-base text-green-700">
              {decryptedMessage}
              <span className="inline-block w-2 h-5 bg-green-600 animate-pulse ml-1"></span>
            </div>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="bg-green-600 text-white p-6 border-2 border-black text-center">
            <p className="text-2xl font-bold mb-2">Message Released</p>
            <p className="text-base opacity-90">Your secret has been automatically delivered</p>
          </div>
          <div className="bg-cream p-6 border-2 border-black">
            <p className="text-sm font-bold mb-3 opacity-70">Final Decrypted Message:</p>
            <p className="text-lg leading-relaxed font-mono">
              {SECRET_MESSAGE}
            </p>
          </div>
          <div className="bg-blue/10 p-4 border-2 border-blue">
            <p className="font-bold mb-3">What happened:</p>
            <ol className="text-sm space-y-2 opacity-80 list-decimal list-inside">
              <li>You wrote a secret message</li>
              <li>It was encrypted (unreadable without the key)</li>
              <li>The check-in button was <strong>NOT pressed</strong></li>
              <li>Timer expired → message automatically decrypted</li>
            </ol>
          </div>
          <div className="bg-cream/50 p-4 border border-black/20 text-sm">
            <p className="font-bold mb-2 opacity-70">How it works:</p>
            <p className="opacity-70 leading-relaxed">
              A <a href="https://en.wikipedia.org/wiki/Dead_man%27s_switch" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue">dead man's switch</a> activates when you stop responding.
              Your message is encrypted with <a href="https://en.wikipedia.org/wiki/Galois/Counter_Mode" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue">AES-256-GCM</a>, then the key is split via <a href="https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue">Shamir's Secret Sharing</a> (no single fragment reveals anything; combined they reconstruct the key).
              Fragments are distributed across a decentralized network. No check-in → timer expires → fragments retrieved → key reconstructed → message decrypted.
            </p>
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
