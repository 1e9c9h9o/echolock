'use client'

import { Circle, Triangle, Octagon, Square, Pause } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  /**
   * Optional: For ARMED switches, pass time data to show urgency level
   */
  expiresAt?: string
  checkInHours?: number
}

type UrgencyLevel = 'safe' | 'warning' | 'critical' | 'inactive'

/**
 * Calculate urgency level for an armed switch
 */
function getUrgencyLevel(expiresAt?: string, checkInHours?: number): UrgencyLevel {
  if (!expiresAt || !checkInHours) return 'safe'

  const now = new Date().getTime()
  const target = new Date(expiresAt).getTime()
  const hoursRemaining = (target - now) / (1000 * 60 * 60)
  const percentRemaining = (hoursRemaining / checkInHours) * 100

  if (hoursRemaining <= 0 || percentRemaining < 10) return 'critical'
  if (percentRemaining < 25) return 'warning'
  return 'safe'
}

/**
 * High Performance HMI Status Badge
 *
 * Implements redundant coding: Every status has both a COLOR and a SHAPE
 * so users can determine urgency even in grayscale or with color blindness.
 *
 * - Safe: Circle (green) - smooth, no edges = calm
 * - Warning: Triangle (amber) - pointed = attention
 * - Critical: Octagon (red) - stop sign shape = immediate action
 * - Inactive: Square (gray) - neutral, static
 */
export default function StatusBadge({ status, expiresAt, checkInHours }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase()

  // Determine visual treatment based on status and urgency
  const getConfig = () => {
    switch (normalizedStatus) {
      case 'ARMED':
      case 'ACTIVE': {
        const urgency = getUrgencyLevel(expiresAt, checkInHours)
        switch (urgency) {
          case 'critical':
            return {
              bg: 'bg-red-100 border-red-500',
              text: 'text-red-700',
              icon: <Octagon className="h-3 w-3 fill-red-500 text-red-600" strokeWidth={2} />,
              label: 'CRITICAL'
            }
          case 'warning':
            return {
              bg: 'bg-amber-100 border-amber-500',
              text: 'text-amber-700',
              icon: <Triangle className="h-3 w-3 fill-amber-500 text-amber-600" strokeWidth={2} />,
              label: 'WARNING'
            }
          default:
            return {
              bg: 'bg-emerald-100 border-emerald-500',
              text: 'text-emerald-700',
              icon: <Circle className="h-3 w-3 fill-emerald-500 text-emerald-600" strokeWidth={2} />,
              label: 'ACTIVE'
            }
        }
      }

      case 'PAUSED':
        return {
          bg: 'bg-slate-100 border-slate-400',
          text: 'text-slate-600',
          icon: <Pause className="h-3 w-3 text-slate-500" strokeWidth={2} />,
          label: 'PAUSED'
        }

      case 'TRIGGERED':
        return {
          bg: 'bg-red-100 border-red-500',
          text: 'text-red-700',
          icon: <Octagon className="h-3 w-3 fill-red-500 text-red-600" strokeWidth={2} />,
          label: 'TRIGGERED'
        }

      case 'CANCELLED':
      case 'EXPIRED':
      default:
        return {
          bg: 'bg-slate-100 border-slate-300',
          text: 'text-slate-500',
          icon: <Square className="h-3 w-3 text-slate-400" strokeWidth={2} />,
          label: normalizedStatus
        }
    }
  }

  const config = getConfig()

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  )
}
