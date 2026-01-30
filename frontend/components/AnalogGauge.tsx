'use client'

import { useEffect, useState } from 'react'
import { Circle, Triangle, Octagon } from 'lucide-react'

interface AnalogGaugeProps {
  targetDate: string // ISO timestamp (expiry)
  interval: number   // total interval in hours
  className?: string
  showDigital?: boolean // Show digital time alongside analog
}

type UrgencyLevel = 'safe' | 'warning' | 'critical'

/**
 * Calculate percentage of time remaining (0-100)
 */
function calculateRemaining(targetDate: string, totalInterval: number): number {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const totalIntervalMs = totalInterval * 60 * 60 * 1000

  const timeRemaining = target - now
  const percentage = Math.max(0, Math.min(100, (timeRemaining / totalIntervalMs) * 100))
  return percentage
}

/**
 * Get urgency level based on remaining percentage
 */
function getUrgencyLevel(percentRemaining: number): UrgencyLevel {
  if (percentRemaining < 10) return 'critical'
  if (percentRemaining < 25) return 'warning'
  return 'safe'
}

/**
 * Format time remaining as human readable
 */
function formatTimeRemaining(targetDate: string): string {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const diff = target - now

  if (diff <= 0) return 'EXPIRED'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h`
  }

  return `${hours}h ${minutes}m`
}

/**
 * High Performance HMI Analog Gauge
 *
 * Design principle: Humans process visual patterns faster than numbers.
 * The user should scan 10 switches and instantly identify which is "low"
 * based on the physical position of the marker, without reading text.
 *
 * - Linear gauge with marker showing position
 * - Color zones: green (safe) → amber (warning) → red (critical)
 * - Redundant shape coding on the marker
 * - Digital time available but secondary
 */
export default function AnalogGauge({
  targetDate,
  interval,
  className = '',
  showDigital = true,
}: AnalogGaugeProps) {
  const [percentRemaining, setPercentRemaining] = useState<number>(
    calculateRemaining(targetDate, interval)
  )

  useEffect(() => {
    // Update every 10 seconds
    const timer = setInterval(() => {
      setPercentRemaining(calculateRemaining(targetDate, interval))
    }, 10000)

    // Immediate update
    setPercentRemaining(calculateRemaining(targetDate, interval))

    return () => clearInterval(timer)
  }, [targetDate, interval])

  const urgency = getUrgencyLevel(percentRemaining)
  const timeString = formatTimeRemaining(targetDate)

  // Get shape icon for redundant coding
  const getMarkerIcon = () => {
    switch (urgency) {
      case 'critical':
        return <Octagon className="h-3 w-3 fill-red-500 text-red-600" strokeWidth={2} />
      case 'warning':
        return <Triangle className="h-3 w-3 fill-amber-500 text-amber-600" strokeWidth={2} />
      default:
        return <Circle className="h-3 w-3 fill-emerald-500 text-emerald-600" strokeWidth={2} />
    }
  }

  // Marker position (inverted: 100% remaining = right side, 0% = left side)
  const markerPosition = percentRemaining

  return (
    <div className={`${className}`}>
      {/* Gauge container */}
      <div className="relative">
        {/* Background track with color zones */}
        <div className="relative w-full h-3 bg-slate-200 overflow-hidden">
          {/* Color zones (left to right: critical → warning → safe) */}
          <div className="absolute inset-0 flex">
            {/* Critical zone: 0-10% */}
            <div className="w-[10%] h-full bg-red-200" />
            {/* Warning zone: 10-25% */}
            <div className="w-[15%] h-full bg-amber-200" />
            {/* Safe zone: 25-100% */}
            <div className="w-[75%] h-full bg-emerald-200" />
          </div>

          {/* Marker line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-800 transition-all duration-500"
            style={{ left: `${markerPosition}%` }}
          />
        </div>

        {/* Marker indicator (above the gauge) */}
        <div
          className="absolute -top-4 transition-all duration-500 -translate-x-1/2"
          style={{ left: `${markerPosition}%` }}
        >
          {getMarkerIcon()}
        </div>

        {/* Scale markers */}
        <div className="flex justify-between mt-1 text-[8px] font-mono text-slate-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Digital time (secondary, for precision) */}
      {showDigital && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">
            Time remaining
          </span>
          <span className={`text-sm font-mono font-bold ${
            urgency === 'critical' ? 'text-red-600' :
            urgency === 'warning' ? 'text-amber-600' :
            'text-slate-600'
          }`}>
            {timeString}
          </span>
        </div>
      )}
    </div>
  )
}
