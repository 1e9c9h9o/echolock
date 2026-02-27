'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Clock, AlertCircle, Users, Sparkles, Shield, Heart, Briefcase, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import SystemHealthHeader from '@/components/SystemHealthHeader'
import AnalogGauge from '@/components/AnalogGauge'
import Sparkline, { generateMockSparklineData } from '@/components/Sparkline'
import CheckInButton from '@/components/CheckInButton'
import LoadingMessage from '@/components/LoadingMessage'
import { switchesAPI } from '@/lib/api'
import { useSwitchStore } from '@/lib/store'
import { showToast } from '@/components/ui/ToastContainer'

type UrgencyLevel = 'critical' | 'warning' | 'safe' | 'inactive'

function getUrgencyLevel(sw: Switch): UrgencyLevel {
  if (sw.status !== 'ARMED' && sw.status !== 'active') return 'inactive'
  if (!sw.checkInHours) return 'safe'

  const now = Date.now()
  const target = new Date(sw.expiresAt).getTime()
  const hoursRemaining = (target - now) / (1000 * 60 * 60)
  const percentRemaining = (hoursRemaining / sw.checkInHours) * 100

  if (hoursRemaining <= 0 || percentRemaining < 10) return 'critical'
  if (percentRemaining < 25) return 'warning'
  return 'safe'
}

function getUrgencyScore(sw: Switch): number {
  const level = getUrgencyLevel(sw)
  switch (level) {
    case 'critical': return 0
    case 'warning': return 1
    case 'safe': return 2
    case 'inactive': return 3
  }
}

function getUrgencyBorderColor(sw: Switch): string {
  const level = getUrgencyLevel(sw)
  switch (level) {
    case 'critical': return 'border-l-red-500'
    case 'warning': return 'border-l-amber-500'
    case 'safe': return 'border-l-emerald-500'
    case 'inactive': return 'border-l-slate-300'
  }
}

interface Switch {
  id: string
  title: string
  checkInHours: number
  expiresAt: string
  status: string
  createdAt: string
  recipientCount: number
}

/**
 * High Performance HMI Dashboard
 *
 * Design principles applied:
 * 1. Mute-Structural, Loud-Alert - Gray structural elements, color only for status
 * 2. Analog over Digital - Linear gauges for pattern recognition
 * 3. Redundant Coding - Shapes + colors for accessibility
 * 4. Sparklines - Behavior trends over time
 * 5. Level 1 Header - System health at a glance
 * 6. Animation only for Unacknowledged Alerts
 */
export default function DashboardPage() {
  const { switches, setSwitches } = useSwitchStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSwitches()
  }, [])

  const loadSwitches = async () => {
    try {
      const data = await switchesAPI.getAll()
      setSwitches(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load switches')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (id: string) => {
    try {
      await switchesAPI.checkIn(id)
      showToast('Check-in successful! Timer reset.', 'success')
      await loadSwitches()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Check-in failed. Please try again.'
      showToast(msg, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingMessage />
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen -m-6 p-6">
      {/* Header - Muted structural styling */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
              Switch Monitor
            </h1>
            <p className="text-sm font-mono text-slate-500 mt-1">
              System status and check-in management
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/demo">
              <button className="px-4 py-2 bg-slate-200 border border-slate-300 text-slate-600 font-bold text-sm uppercase tracking-wider hover:bg-slate-300 transition-colors flex items-center gap-2">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
                Demo
              </button>
            </Link>
            <Link href="/dashboard/create-wizard">
              <button className="px-4 py-2 bg-slate-800 border border-slate-800 text-white font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" strokeWidth={2} />
                New Switch
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-300 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="font-mono text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Level 1: System Health Header */}
      <SystemHealthHeader switches={switches} />

      {/* Empty state - welcoming first-time experience */}
      {switches.length === 0 && !error && (
        <div className="bg-white border border-slate-200 py-16 px-6">
          <div className="max-w-lg mx-auto text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 flex items-center justify-center">
              <Shield className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
            </div>

            {/* Welcome message */}
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Welcome to EchoLock
            </h2>
            <p className="text-slate-500 mb-8">
              Create your first dead man's switch to protect important information
              and ensure it reaches the right people at the right time.
            </p>

            {/* Purpose-driven options */}
            <div className="grid gap-3 mb-8 text-left">
              <Link href="/dashboard/create-wizard">
                <div className="p-4 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <Heart className="h-5 w-5 text-slate-400 mt-0.5 group-hover:text-slate-600" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-bold text-sm text-slate-700">Protect Your Family</h3>
                      <p className="text-xs text-slate-500 mt-1">Share passwords, accounts, or final wishes</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/create-wizard">
                <div className="p-4 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-slate-400 mt-0.5 group-hover:text-slate-600" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-bold text-sm text-slate-700">Business Continuity</h3>
                      <p className="text-xs text-slate-500 mt-1">Ensure critical access is never lost</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/demo">
                <div className="p-4 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <Play className="h-5 w-5 text-slate-400 mt-0.5 group-hover:text-slate-600" strokeWidth={1.5} />
                    <div>
                      <h3 className="font-bold text-sm text-slate-700">Just Exploring</h3>
                      <p className="text-xs text-slate-500 mt-1">Try the demo first to see how it works</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard/create-wizard">
                <button className="w-full sm:w-auto px-6 py-3 bg-slate-800 text-white font-bold text-sm uppercase tracking-wider hover:bg-slate-700 transition-colors">
                  Create Switch
                </button>
              </Link>
              <Link href="/dashboard/demo">
                <button className="w-full sm:w-auto px-6 py-3 bg-slate-100 border border-slate-300 text-slate-600 font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-colors">
                  Try Demo
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      {switches.length > 0 && (
        <SummaryBar switches={switches} />
      )}

      {/* Switch cards grid - sorted by urgency */}
      {switches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...switches].sort((a, b) => getUrgencyScore(a) - getUrgencyScore(b)).map((sw) => (
            <SwitchCard
              key={sw.id}
              sw={sw}
              onCheckIn={() => handleCheckIn(sw.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Summary bar showing switch status overview
 */
function SummaryBar({ switches }: { switches: Switch[] }) {
  const active = switches.filter(s => s.status === 'ARMED' || s.status === 'active')
  const needsAttention = active.filter(s => {
    const level = getUrgencyLevel(s)
    return level === 'critical' || level === 'warning'
  })

  return (
    <div className="mb-4 px-4 py-3 bg-white border border-slate-200 font-mono text-sm text-slate-600 flex items-center gap-2">
      <span>{active.length} active switch{active.length !== 1 ? 'es' : ''}</span>
      <span className="text-slate-300">·</span>
      {needsAttention.length > 0 ? (
        <span className="text-amber-600 font-bold">
          {needsAttention.length} need{needsAttention.length === 1 ? 's' : ''} check-in soon
        </span>
      ) : (
        <span className="text-emerald-600">All switches healthy</span>
      )}
    </div>
  )
}

/**
 * Individual Switch Card with HMI principles
 */
function SwitchCard({
  sw,
  onCheckIn,
}: {
  sw: Switch
  onCheckIn: () => Promise<void>
}) {
  // Generate mock sparkline data based on switch ID for demo consistency
  // In production, this would come from actual check-in history
  const sparklinePatterns = ['stable', 'degrading', 'improving'] as const
  const patternIndex = sw.id.charCodeAt(0) % 3
  const sparklineData = generateMockSparklineData(sparklinePatterns[patternIndex])

  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${getUrgencyBorderColor(sw)} flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800 flex-1 break-words">
            {sw.title}
          </h3>
          <StatusBadge
            status={sw.status}
            expiresAt={sw.expiresAt}
            checkInHours={sw.checkInHours}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="p-4 flex-1 space-y-4">
        {/* Metadata - muted styling */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {sw.checkInHours}h interval
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" strokeWidth={2} />
            {sw.recipientCount} recipient{sw.recipientCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Analog Gauge - Primary visual indicator */}
        {sw.status === 'ARMED' && (
          <div className="py-2">
            <AnalogGauge
              targetDate={sw.expiresAt}
              interval={sw.checkInHours}
              showDigital={true}
            />
          </div>
        )}

        {/* Sparkline - Behavior trend */}
        {sw.status === 'ARMED' && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
              Check-in Trend (last 5 cycles)
            </div>
            <Sparkline data={sparklineData} height={28} showTrend={true} />
          </div>
        )}

        {/* Created date - subtle */}
        <p className="font-mono text-[10px] text-slate-400">
          Created {formatDistanceToNow(new Date(sw.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        {sw.status === 'ARMED' && (
          <CheckInButton
            targetDate={sw.expiresAt}
            status={sw.status}
            onCheckIn={onCheckIn}
            checkInHours={sw.checkInHours}
          />
        )}
        <Link href={`/dashboard/switches/${sw.id}`} className="block">
          <button className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors">
            View Details
          </button>
        </Link>
      </div>
    </div>
  )
}
