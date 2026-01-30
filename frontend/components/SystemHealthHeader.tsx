'use client'

import { Circle, Triangle, Octagon } from 'lucide-react'

interface Switch {
  id: string
  status: string
  expiresAt: string
  checkInHours: number
}

interface SystemHealthHeaderProps {
  switches: Switch[]
}

type HealthLevel = 'ok' | 'warning' | 'critical'

/**
 * Calculate hours remaining until expiry
 */
function getHoursRemaining(expiresAt: string): number {
  const now = new Date().getTime()
  const target = new Date(expiresAt).getTime()
  return (target - now) / (1000 * 60 * 60)
}

/**
 * Determine health level for a single switch
 */
function getSwitchHealth(sw: Switch): HealthLevel {
  if (sw.status !== 'ARMED') return 'ok' // Paused/cancelled don't contribute to alerts

  const hoursRemaining = getHoursRemaining(sw.expiresAt)
  const percentRemaining = (hoursRemaining / sw.checkInHours) * 100

  if (hoursRemaining <= 0 || percentRemaining < 10) return 'critical'
  if (percentRemaining < 25) return 'warning'
  return 'ok'
}

/**
 * Aggregate health across all switches
 */
function getSystemHealth(switches: Switch[]): {
  level: HealthLevel
  criticalCount: number
  warningCount: number
  okCount: number
} {
  let criticalCount = 0
  let warningCount = 0
  let okCount = 0

  switches.forEach(sw => {
    const health = getSwitchHealth(sw)
    if (health === 'critical') criticalCount++
    else if (health === 'warning') warningCount++
    else okCount++
  })

  let level: HealthLevel = 'ok'
  if (criticalCount > 0) level = 'critical'
  else if (warningCount > 0) level = 'warning'

  return { level, criticalCount, warningCount, okCount }
}

/**
 * Level 1 System Health Header
 *
 * High Performance HMI principle: Users should verify system safety
 * in under 1 second by looking at this header.
 *
 * - Muted gray when all OK (no cognitive load)
 * - Color only appears for warnings/critical
 * - Redundant shape coding for accessibility
 */
export default function SystemHealthHeader({ switches }: SystemHealthHeaderProps) {
  const { level, criticalCount, warningCount, okCount } = getSystemHealth(switches)

  // No switches = no header needed
  if (switches.length === 0) return null

  const configs = {
    ok: {
      bg: 'bg-slate-100 border-slate-300',
      icon: <Circle className="h-6 w-6 text-slate-500 fill-slate-400" strokeWidth={2} />,
      label: 'ALL SYSTEMS NOMINAL',
      labelColor: 'text-slate-600',
      detail: `${okCount} switch${okCount !== 1 ? 'es' : ''} monitored`
    },
    warning: {
      bg: 'bg-amber-50 border-amber-400',
      icon: <Triangle className="h-6 w-6 text-amber-600 fill-amber-500" strokeWidth={2} />,
      label: 'ATTENTION REQUIRED',
      labelColor: 'text-amber-700',
      detail: `${warningCount} switch${warningCount !== 1 ? 'es' : ''} approaching deadline`
    },
    critical: {
      bg: 'bg-red-50 border-red-500',
      icon: <Octagon className="h-6 w-6 text-red-600 fill-red-500" strokeWidth={2} />,
      label: 'IMMEDIATE ACTION REQUIRED',
      labelColor: 'text-red-700',
      detail: `${criticalCount} switch${criticalCount !== 1 ? 'es' : ''} critical`
    }
  }

  const config = configs[level]

  return (
    <div className={`p-4 border-2 ${config.bg} mb-6`}>
      <div className="flex items-center gap-4">
        {/* Primary indicator: Shape + Color */}
        <div className="flex-shrink-0">
          {config.icon}
        </div>

        {/* Status text */}
        <div className="flex-1">
          <div className={`font-bold text-sm uppercase tracking-wider ${config.labelColor}`}>
            {config.label}
          </div>
          <div className="text-slate-500 text-xs font-mono mt-0.5">
            {config.detail}
          </div>
        </div>

        {/* Quick counts (always visible for situational awareness) */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <Octagon className="h-3 w-3 fill-red-500" strokeWidth={2} />
              {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Triangle className="h-3 w-3 fill-amber-500" strokeWidth={2} />
              {warningCount}
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-500">
            <Circle className="h-3 w-3 fill-slate-400" strokeWidth={2} />
            {okCount}
          </span>
        </div>
      </div>
    </div>
  )
}
