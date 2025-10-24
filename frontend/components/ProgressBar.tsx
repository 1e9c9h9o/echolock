'use client'

import { useEffect, useState } from 'react'

interface ProgressBarProps {
  targetDate: string // ISO timestamp
  interval: number // total interval in hours
  className?: string
  showPercentage?: boolean
}

/**
 * Calculates progress percentage
 */
function calculateProgress(targetDate: string, totalInterval: number): number {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const totalIntervalMs = totalInterval * 60 * 60 * 1000

  // Calculate time elapsed since creation
  const timeRemaining = target - now
  const elapsed = totalIntervalMs - timeRemaining

  const percentage = Math.max(0, Math.min(100, (elapsed / totalIntervalMs) * 100))
  return percentage
}

/**
 * Get gradient colors based on progress
 */
function getProgressColor(percentage: number): {
  gradient: string
  textColor: string
} {
  if (percentage < 50) {
    // Green to yellow gradient
    return {
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-green-700',
    }
  } else if (percentage < 75) {
    // Yellow gradient
    return {
      gradient: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-700',
    }
  } else if (percentage < 90) {
    // Orange gradient
    return {
      gradient: 'bg-gradient-to-r from-orange-500 to-orange-600',
      textColor: 'text-orange-700',
    }
  } else {
    // Red gradient (critical)
    return {
      gradient: 'bg-gradient-to-r from-red-500 to-red-600',
      textColor: 'text-red-700',
    }
  }
}

/**
 * Visual progress bar showing time elapsed vs. total interval
 */
export default function ProgressBar({
  targetDate,
  interval,
  className = '',
  showPercentage = true,
}: ProgressBarProps) {
  const [progress, setProgress] = useState<number>(calculateProgress(targetDate, interval))

  useEffect(() => {
    // Update every 5 seconds (no need for 1-second updates on progress bar)
    const timer = setInterval(() => {
      setProgress(calculateProgress(targetDate, interval))
    }, 5000)

    // Also update immediately
    setProgress(calculateProgress(targetDate, interval))

    return () => clearInterval(timer)
  }, [targetDate, interval])

  const colors = getProgressColor(progress)
  const displayPercentage = Math.round(progress)

  return (
    <div className={`${className}`}>
      {/* Progress bar container */}
      <div className="relative w-full h-4 bg-cream border-2 border-black overflow-hidden">
        {/* Progress fill */}
        <div
          className={`h-full ${colors.gradient} transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Percentage display */}
      {showPercentage && (
        <div className="mt-2 text-right">
          <span className={`font-mono text-sm font-bold ${colors.textColor}`}>
            {displayPercentage}% elapsed
          </span>
        </div>
      )}
    </div>
  )
}
