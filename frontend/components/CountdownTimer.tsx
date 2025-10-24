'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  targetDate: string // ISO timestamp
  interval: number // total interval in hours
  className?: string
  showIcon?: boolean
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalHours: number
  percentageElapsed: number
}

/**
 * Calculates time remaining until target date
 */
function calculateTimeRemaining(targetDate: string, totalInterval: number): TimeRemaining {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const difference = target - now

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalHours: 0,
      percentageElapsed: 100,
    }
  }

  const seconds = Math.floor((difference / 1000) % 60)
  const minutes = Math.floor((difference / 1000 / 60) % 60)
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
  const days = Math.floor(difference / (1000 * 60 * 60 * 24))
  const totalHours = difference / (1000 * 60 * 60)

  // Calculate percentage elapsed
  const totalIntervalMs = totalInterval * 60 * 60 * 1000
  const elapsed = totalIntervalMs - difference
  const percentageElapsed = Math.max(0, Math.min(100, (elapsed / totalIntervalMs) * 100))

  return {
    days,
    hours,
    minutes,
    seconds,
    totalHours,
    percentageElapsed,
  }
}

/**
 * Determines urgency level and color based on time remaining
 */
function getUrgencyLevel(totalHours: number): {
  level: 'safe' | 'moderate' | 'warning' | 'critical'
  color: string
  bgColor: string
  shouldPulse: boolean
} {
  if (totalHours > 24) {
    return {
      level: 'safe',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      shouldPulse: false,
    }
  } else if (totalHours > 6) {
    return {
      level: 'moderate',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      shouldPulse: false,
    }
  } else if (totalHours > 1) {
    return {
      level: 'warning',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      shouldPulse: false,
    }
  } else {
    return {
      level: 'critical',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      shouldPulse: true,
    }
  }
}

/**
 * Real-time countdown timer with urgency indicators
 */
export default function CountdownTimer({
  targetDate,
  interval,
  className = '',
  showIcon = true,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate, interval)
  )

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate, interval))
    }, 1000)

    // Cleanup on unmount
    return () => clearInterval(timer)
  }, [targetDate, interval])

  const urgency = getUrgencyLevel(timeRemaining.totalHours)

  // Format display text
  const formatTime = () => {
    const parts: string[] = []
    if (timeRemaining.days > 0) parts.push(`${timeRemaining.days}d`)
    if (timeRemaining.hours > 0) parts.push(`${timeRemaining.hours}h`)
    if (timeRemaining.minutes > 0) parts.push(`${timeRemaining.minutes}m`)
    parts.push(`${timeRemaining.seconds}s`)
    return parts.join(' ')
  }

  const isExpired = timeRemaining.totalHours <= 0

  return (
    <div className={`font-mono ${className}`}>
      <div className="flex items-center gap-2">
        {showIcon && (
          <Clock
            className={`h-5 w-5 ${urgency.color} ${urgency.shouldPulse ? 'animate-pulse' : ''}`}
            strokeWidth={2}
          />
        )}
        <div>
          {isExpired ? (
            <span className="text-red-700 font-bold">EXPIRED</span>
          ) : (
            <>
              <span className="text-black text-sm">Next check-in due in: </span>
              <span
                className={`${urgency.color} font-bold ${urgency.shouldPulse ? 'animate-pulse' : ''}`}
              >
                {formatTime()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
