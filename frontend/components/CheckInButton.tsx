'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Loader2, Octagon, Triangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatTimeRemaining } from '@/lib/timeFormat'

interface CheckInButtonProps {
  targetDate: string // ISO timestamp
  status: string     // API returns 'ARMED', 'EXPIRED', 'CANCELLED', etc.
  onCheckIn: () => Promise<void>
  className?: string
  checkInHours?: number // Total interval for urgency calculation
}

type UrgencyLevel = 'safe' | 'warning' | 'critical'

/**
 * Calculate urgency level
 */
function getUrgencyLevel(targetDate: string, checkInHours?: number): UrgencyLevel {
  if (!checkInHours) return 'safe'

  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const hoursRemaining = (target - now) / (1000 * 60 * 60)
  const percentRemaining = (hoursRemaining / checkInHours) * 100

  if (hoursRemaining <= 0 || percentRemaining < 10) return 'critical'
  if (percentRemaining < 25) return 'warning'
  return 'safe'
}

/**
 * High Performance HMI Check-In Button
 *
 * Animation principle: Animation captures attention but creates anxiety
 * if permanent. Use pulsing only when a NEW critical status appears.
 * Once the user hovers or acknowledges, stop the animation.
 *
 * - Pulse only on unacknowledged critical state
 * - Hover stops animation (user has noticed)
 * - No decorative animation
 */
export default function CheckInButton({
  targetDate,
  status,
  onCheckIn,
  className = '',
  checkInHours,
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [urgency, setUrgency] = useState<UrgencyLevel>(() =>
    getUrgencyLevel(targetDate, checkInHours)
  )
  const prevUrgencyRef = useRef<UrgencyLevel>(urgency)

  // Track urgency changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newUrgency = getUrgencyLevel(targetDate, checkInHours)
      setUrgency(newUrgency)

      // If urgency escalated (got worse), reset acknowledged state
      // so animation plays again for the new alert
      if (
        (prevUrgencyRef.current === 'safe' && newUrgency !== 'safe') ||
        (prevUrgencyRef.current === 'warning' && newUrgency === 'critical')
      ) {
        setAcknowledged(false)
      }

      prevUrgencyRef.current = newUrgency
    }, 10000)

    return () => clearInterval(interval)
  }, [targetDate, checkInHours])

  const handleClick = async () => {
    if (loading || (status !== 'ARMED' && status !== 'active')) return

    setLoading(true)
    try {
      await onCheckIn()
      setSuccess(true)
      setAcknowledged(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setLoading(false)
    }
  }

  // Acknowledge on hover (user has noticed the alert)
  const handleMouseEnter = () => {
    if (urgency === 'critical' || urgency === 'warning') {
      setAcknowledged(true)
    }
  }

  // Should we show the pulse animation?
  // Only if: critical urgency AND not yet acknowledged
  const shouldPulse = urgency === 'critical' && !acknowledged && !loading && !success

  // Disabled states
  if (status === 'EXPIRED' || status === 'expired') {
    return (
      <button
        disabled
        className={`w-full px-4 py-3 bg-slate-100 border border-slate-300 text-slate-400 font-bold text-sm uppercase tracking-wider cursor-not-allowed ${className}`}
      >
        Expired
      </button>
    )
  }

  if (status === 'CANCELLED' || status === 'cancelled') {
    return (
      <button
        disabled
        className={`w-full px-4 py-3 bg-slate-100 border border-slate-300 text-slate-400 font-bold text-sm uppercase tracking-wider cursor-not-allowed ${className}`}
      >
        Cancelled
      </button>
    )
  }

  const timeRemaining = formatTimeRemaining(targetDate)

  // Success state (briefly shown after check-in)
  if (success) {
    return (
      <button
        disabled
        className={`w-full px-4 py-3 bg-emerald-100 border border-emerald-500 text-emerald-700 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 ${className}`}
      >
        <Check className="h-4 w-4" strokeWidth={2} />
        Checked In
      </button>
    )
  }

  // Loading state
  if (loading) {
    return (
      <button
        disabled
        className={`w-full px-4 py-3 bg-slate-200 border border-slate-400 text-slate-600 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        Checking In...
      </button>
    )
  }

  // Button styling based on urgency
  const getButtonStyles = () => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-700 hover:bg-red-200'
      case 'warning':
        return 'bg-amber-100 border-amber-500 text-amber-700 hover:bg-amber-200'
      default:
        return 'bg-slate-100 border-slate-400 text-slate-700 hover:bg-slate-200'
    }
  }

  const getTimeLabel = () => {
    if (urgency === 'critical') return `URGENT: ${timeRemaining} remaining`
    return `${timeRemaining} remaining`
  }

  const getTimeLabelColor = () => {
    switch (urgency) {
      case 'critical':
        return 'text-red-700'
      case 'warning':
        return 'text-amber-700'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      aria-label={`Check In - ${timeRemaining}`}
      className={`
        w-full px-4 py-3 border font-bold text-sm uppercase tracking-wider
        flex flex-col items-center justify-center gap-1 transition-colors
        ${getButtonStyles()}
        ${shouldPulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      <span className="flex items-center gap-2">
        {urgency === 'critical' && (
          <Octagon className="h-4 w-4" strokeWidth={2} />
        )}
        {urgency === 'warning' && (
          <Triangle className="h-4 w-4" strokeWidth={2} />
        )}
        Check In
      </span>
      <span className={`text-xs font-mono font-normal normal-case ${getTimeLabelColor()}`}>
        {getTimeLabel()}
      </span>
    </button>
  )
}
