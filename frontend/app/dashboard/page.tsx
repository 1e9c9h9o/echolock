'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Clock, AlertCircle, Users, Sparkles, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import CountdownTimer from '@/components/CountdownTimer'
import ProgressBar from '@/components/ProgressBar'
import CheckInButton from '@/components/CheckInButton'
import LoadingMessage from '@/components/LoadingMessage'
import NostrRelayHealth from '@/components/NostrRelayHealth'
import SecurityStrengthIndicator from '@/components/SecurityStrengthIndicator'
import { switchesAPI } from '@/lib/api'
import { useSwitchStore } from '@/lib/store'
import { showToast } from '@/components/ui/ToastContainer'

interface Switch {
  id: string
  title: string
  checkInHours: number
  expiresAt: string  // Changed from nextCheckInAt to match API
  status: string      // Changed to string to accept 'ARMED', 'PAUSED', etc.
  createdAt: string
  recipientCount: number
}

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
    <div>
      {/* Header */}
      <div className="mb-8 lg:mb-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl lg:text-5xl font-bold">DASHBOARD</h1>
            <p className="text-base lg:text-lg font-mono mt-2">
              Active switches and check-in status
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <Link href="/dashboard/demo" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto whitespace-nowrap">
                <Sparkles className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Try Demo
              </Button>
            </Link>
            <Link href="/dashboard/create" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto whitespace-nowrap">
                <Plus className="h-5 w-5 inline mr-2" strokeWidth={2} />
                Create Switch
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-orange text-black p-6 mb-8 border-2 border-black">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="font-mono font-bold">{error}</p>
          </div>
        </div>
      )}

      {/* System Status - show when there are switches */}
      {switches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <NostrRelayHealth />
          <div className="space-y-6">
            <SecurityStrengthIndicator compact={false} />
            <Card className="bg-blue-light">
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 mr-2 text-orange" strokeWidth={2} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Active Protection</h4>
              </div>
              <div className="space-y-2 font-mono text-sm">
                <p><strong>{switches.length}</strong> switch{switches.length !== 1 ? 'es' : ''} monitored</p>
                <p><strong>{switches.filter(s => s.status === 'ARMED').length}</strong> currently active</p>
                <p><strong>10+</strong> Nostr relays</p>
                <p><strong>5</strong> encrypted fragments per switch</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Empty state */}
      {switches.length === 0 && !error && (
        <Card className="text-center py-16">
          <div className="w-24 h-24 bg-orange mx-auto mb-8 flex items-center justify-center border-2 border-black">
            <Plus className="h-16 w-16 text-black" strokeWidth={2} />
          </div>
          <h3 className="text-3xl font-bold mb-4">
            NO SWITCHES ACTIVE
          </h3>
          <p className="text-lg font-mono mb-8">
            Create your first dead man's switch
          </p>
          <Link href="/dashboard/create">
            <Button variant="primary">Create Switch</Button>
          </Link>
        </Card>
      )}

      {/* Switches list */}
      {switches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {switches.map((sw) => (
            <Card key={sw.id} className="flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold flex-1 break-words">
                  {sw.title}
                </h3>
                <StatusBadge status={sw.status} />
              </div>

              {/* Security Badge */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <div className="px-2 py-1 bg-orange border-2 border-black text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                  <Shield className="h-3 w-3" strokeWidth={2} />
                  AES-256
                </div>
                <div className="px-2 py-1 bg-yellow text-black border-2 border-black text-[10px] font-bold uppercase tracking-wider">
                  SHAMIR 3/5
                </div>
                <div className="px-2 py-1 bg-black text-white border-2 border-black text-[10px] font-bold uppercase tracking-wider">
                  NOSTR
                </div>
              </div>

              {/* Switch Info */}
              <div className="space-y-4 mb-6 flex-1">
                <div className="flex items-center font-mono text-sm">
                  <Clock className="h-4 w-4 mr-2 flex-shrink-0" strokeWidth={2} />
                  <span>Every {sw.checkInHours}h</span>
                </div>

                <div className="flex items-center font-mono text-sm">
                  <Users className="h-4 w-4 mr-2 flex-shrink-0" strokeWidth={2} />
                  <span>{sw.recipientCount} recipient(s)</span>
                </div>

                {/* Countdown Timer */}
                {sw.status === 'ARMED' && (
                  <CountdownTimer
                    targetDate={sw.expiresAt}
                    interval={sw.checkInHours}
                    showIcon={false}
                  />
                )}

                {/* Progress Bar */}
                {sw.status === 'ARMED' && (
                  <ProgressBar
                    targetDate={sw.expiresAt}
                    interval={sw.checkInHours}
                    showPercentage={true}
                  />
                )}

                {/* Created date */}
                <p className="font-mono text-xs text-gray-600">
                  Created {formatDistanceToNow(new Date(sw.createdAt), { addSuffix: true })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-auto pt-4 border-t-2 border-black">
                {sw.status === 'ARMED' && (
                  <CheckInButton
                    targetDate={sw.expiresAt}
                    status={sw.status}
                    onCheckIn={async () => handleCheckIn(sw.id)}
                  />
                )}
                <Link href={`/dashboard/switches/${sw.id}`}>
                  <Button variant="secondary" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
