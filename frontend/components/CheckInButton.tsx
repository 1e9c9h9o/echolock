'use client'

import { useState, useEffect } from 'react'
import { Heart, Check, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CheckInButtonProps {
  targetDate: string // ISO timestamp
  status: string  // API returns 'ARMED', 'EXPIRED', 'CANCELLED', etc.
  onCheckIn: () => Promise<void>
  className?: string
}

/**
 * Calculate if button should show heartbeat animation
 */
function shouldShowHeartbeat(targetDate: string): boolean {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const hoursRemaining = (target - now) / (1000 * 60 * 60)

  // Show heartbeat when less than 6 hours remaining
  return hoursRemaining > 0 && hoursRemaining < 6
}

/**
 * Enhanced check-in button with heartbeat animation and states
 */
export default function CheckInButton({
  targetDate,
  status,
  onCheckIn,
  className = '',
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showHeartbeat, setShowHeartbeat] = useState(shouldShowHeartbeat(targetDate))

  useEffect(() => {
    // Check heartbeat status every 30 seconds
    const interval = setInterval(() => {
      setShowHeartbeat(shouldShowHeartbeat(targetDate))
    }, 30000)

    return () => clearInterval(interval)
  }, [targetDate])

  const handleClick = async () => {
    if (loading || (status !== 'ARMED' && status !== 'active')) return

    setLoading(true)
    try {
      await onCheckIn()
      setSuccess(true)
      // Reset success state after 2 seconds
      setTimeout(() => setSuccess(false), 2000)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setLoading(false)
    }
  }

  // Disabled states
  if (status === 'EXPIRED' || status === 'expired') {
    return (
      <Button variant="danger" disabled className={className}>
        <Heart className="h-5 w-5 mr-2" strokeWidth={2} />
        Expired
      </Button>
    )
  }

  if (status === 'CANCELLED' || status === 'cancelled') {
    return (
      <Button variant="secondary" disabled className={className}>
        Cancelled
      </Button>
    )
  }

  // Success state (briefly shown after check-in)
  if (success) {
    return (
      <Button variant="success" disabled className={className}>
        <Check className="h-5 w-5 mr-2" strokeWidth={2} />
        Checked In ✓
      </Button>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Button variant="primary" disabled className={className}>
        <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={2} />
        Checking In...
      </Button>
    )
  }

  // Active state (default)
  return (
    <Button
      variant="primary"
      onClick={handleClick}
      className={`${className} ${showHeartbeat ? 'animate-pulse-glow' : ''}`}
    >
      {showHeartbeat && <Heart className="h-5 w-5 mr-2 animate-pulse" strokeWidth={2} />}
      Check In
    </Button>
  )
}
