'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

const LOADING_MESSAGES = [
  '🔐 Encrypting your secret...',
  '✂️ Splitting into fragments...',
  '📡 Distributing to relays...',
  '🔗 Establishing connections...',
  '🛡️ Securing your data...',
  '🎲 Generating cryptographic randomness...',
  '⚡ Almost there...',
  '🔑 Creating encryption keys...',
  '📝 Preparing secure message...',
  '🌐 Connecting to network...',
  '✨ Finalizing setup...',
]

interface LoadingMessageProps {
  message?: string // Override default rotating messages
  rotationInterval?: number // Milliseconds between message changes
  className?: string
  showSpinner?: boolean
}

/**
 * Loading component with rotating fun messages
 */
export default function LoadingMessage({
  message,
  rotationInterval = 2000,
  className = '',
  showSpinner = true,
}: LoadingMessageProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  useEffect(() => {
    // Only rotate if using default messages
    if (message) return

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, rotationInterval)

    return () => clearInterval(interval)
  }, [message, rotationInterval])

  const displayMessage = message || LOADING_MESSAGES[currentMessageIndex]

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {showSpinner && <Loader2 className="h-6 w-6 mr-3 animate-spin text-blue" strokeWidth={2} />}
      <p className="text-base font-mono font-bold text-black">{displayMessage}</p>
    </div>
  )
}
