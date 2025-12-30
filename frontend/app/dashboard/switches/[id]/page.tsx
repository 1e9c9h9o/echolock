'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Clock, Users, AlertCircle, Trash2, Activity, Shield, Link as LinkIcon, Bitcoin } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import { switchesAPI } from '@/lib/api'

interface SwitchDetail {
  id: string
  title: string
  checkInHours: number
  expiresAt: string
  status: string  // API returns 'ARMED', 'EXPIRED', 'CANCELLED', etc.
  createdAt: string
  lastCheckInAt: string | null
  recipients: Array<{
    id: string
    email: string
    name: string
  }>
}

interface CheckIn {
  id: string
  timestamp: string
  ip_address: string
}

export default function SwitchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [switchData, setSwitchData] = useState<SwitchDetail | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSwitch()
  }, [id])

  const loadSwitch = async () => {
    try {
      const data = await switchesAPI.getOne(id)
      setSwitchData(data)

      // Load check-in history
      try {
        const history = await switchesAPI.getCheckIns(id)
        setCheckIns(history.checkIns || [])
      } catch (historyErr) {
        // Non-critical error, just log it
        console.error('Failed to load check-in history:', historyErr)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load switch')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      await switchesAPI.checkIn(id)
      await loadSwitch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Check-in failed')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this switch?')) return

    try {
      await switchesAPI.cancel(id)
      router.push('/dashboard')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel switch')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this switch? This action cannot be undone.')) return

    try {
      await switchesAPI.delete(id)
      router.push('/dashboard')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete switch')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (error || !switchData) {
    return (
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-text-secondary hover:text-secondary text-sm mb-grid-4"
        >
          <ArrowLeft className="h-4 w-4 mr-grid" strokeWidth={1.5} />
          Back to dashboard
        </Link>
        <Card className="text-center py-grid-6">
          <AlertCircle className="h-16 w-16 text-accent mx-auto mb-grid-3" strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-secondary mb-grid-2">
            Error loading switch
          </h3>
          <p className="text-text-secondary">{error || 'Switch not found'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-grid-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-text-secondary hover:text-secondary text-sm mb-grid-3"
        >
          <ArrowLeft className="h-4 w-4 mr-grid" strokeWidth={1.5} />
          Back to dashboard
        </Link>
        <div className="flex flex-col lg:flex-row items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-grid-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-secondary">
                {switchData.title}
              </h1>
              <StatusBadge status={switchData.status} />
            </div>
            <p className="text-text-secondary text-sm lg:text-base">
              Created {format(new Date(switchData.createdAt), 'PPP')}
            </p>
          </div>

          {(switchData.status === 'ARMED' || switchData.status === 'active') && (
            <Button variant="primary" onClick={handleCheckIn} className="w-full lg:w-auto whitespace-nowrap">
              Check in now
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-grid-6">
        {/* Timer information */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            Timer information
          </h2>
          <div className="space-y-grid-3">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-text-secondary mr-grid-2" strokeWidth={1.5} />
              <span className="text-secondary">
                Check-in interval: <strong>{switchData.checkInHours} hours</strong>
              </span>
            </div>

            {(switchData.status === 'ARMED' || switchData.status === 'active') && (
              <>
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-text-secondary mr-grid-2" strokeWidth={1.5} />
                  <span className="text-secondary">
                    Next check-in due:{' '}
                    <strong>
                      {formatDistanceToNow(new Date(switchData.expiresAt), {
                        addSuffix: true,
                      })}
                    </strong>
                  </span>
                </div>
                <div className="text-sm text-text-secondary">
                  Exact time: {format(new Date(switchData.expiresAt), 'PPpp')}
                </div>
              </>
            )}

            {switchData.lastCheckInAt && (
              <div className="text-sm text-text-secondary">
                Last check-in: {format(new Date(switchData.lastCheckInAt), 'PPpp')}
              </div>
            )}
          </div>
        </Card>

        {/* Recipients */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <Users className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Recipients ({switchData.recipients.length})
          </h2>
          <div className="space-y-grid-3">
            {switchData.recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between border border-border p-grid-3"
              >
                <div>
                  <p className="font-medium text-secondary">{recipient.name}</p>
                  <p className="text-sm text-text-secondary">{recipient.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Guardian Network Status */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <Shield className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Guardian Network
          </h2>
          <div className="space-y-grid-3">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="p-4 bg-background border border-border">
                <div className="text-2xl font-bold text-secondary">5</div>
                <div className="text-xs text-text-secondary uppercase tracking-wider">Guardians</div>
              </div>
              <div className="p-4 bg-background border border-border">
                <div className="text-2xl font-bold text-secondary">3</div>
                <div className="text-xs text-text-secondary uppercase tracking-wider">Threshold</div>
              </div>
              <div className="p-4 bg-background border border-border">
                <div className="text-2xl font-bold text-green-600">5</div>
                <div className="text-xs text-text-secondary uppercase tracking-wider">Online</div>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              Your secret is split across 5 guardians using Shamir's Secret Sharing.
              Any 3 guardians can trigger release if you stop checking in.
            </p>
          </div>
        </Card>

        {/* Nostr Heartbeat Status */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <LinkIcon className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Nostr Heartbeats
          </h2>
          <div className="space-y-grid-3">
            <div className="flex items-center justify-between">
              <span className="text-secondary">Publishing to:</span>
              <span className="text-text-secondary font-mono text-sm">10 relays</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Last heartbeat:</span>
              <span className="text-text-secondary font-mono text-sm">
                {switchData.lastCheckInAt
                  ? formatDistanceToNow(new Date(switchData.lastCheckInAt), { addSuffix: true })
                  : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Signature:</span>
              <span className="text-green-600 font-mono text-sm">BIP-340 Schnorr</span>
            </div>
            <p className="text-sm text-text-secondary pt-2 border-t border-border">
              Anyone can verify your heartbeats on Nostr. Guardians watch these relays independently.
            </p>
          </div>
        </Card>

        {/* Bitcoin Commitment (Optional) */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <Bitcoin className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Bitcoin Commitment
          </h2>
          <div className="space-y-grid-3">
            <div className="flex items-center justify-between">
              <span className="text-secondary">Status:</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase">
                Optional
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Bitcoin timelocks provide cryptographic proof of timer creation using OP_CHECKLOCKTIMEVERIFY.
              This is optional but recommended for maximum verifiability.
            </p>
            <Button variant="secondary" className="w-full">
              Create Bitcoin Commitment
            </Button>
          </div>
        </Card>

        {/* Activity History */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <Activity className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Activity history
          </h2>
          {checkIns.length === 0 ? (
            <p className="text-text-secondary">No check-ins recorded yet</p>
          ) : (
            <div className="space-y-grid-3">
              {checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-center justify-between border border-border p-grid-3"
                >
                  <div>
                    <p className="font-medium text-secondary">Check-in</p>
                    <p className="text-sm text-text-secondary">
                      {format(new Date(checkIn.timestamp), 'PPpp')}
                    </p>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {formatDistanceToNow(new Date(checkIn.timestamp), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Danger zone */}
        <Card className="border-accent">
          <h2 className="text-xl font-bold text-accent mb-grid-4">Danger zone</h2>
          <div className="space-y-grid-3">
            {(switchData.status === 'ARMED' || switchData.status === 'active') && (
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-grid-3 border-b border-border">
                <div className="flex-1">
                  <h3 className="font-medium text-secondary mb-grid">Cancel switch</h3>
                  <p className="text-sm text-text-secondary">
                    Stop the timer and prevent message delivery
                  </p>
                </div>
                <Button variant="secondary" onClick={handleCancel} className="w-full lg:w-auto whitespace-nowrap">
                  Cancel switch
                </Button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-secondary mb-grid">Delete switch</h3>
                <p className="text-sm text-text-secondary">
                  Permanently delete this switch and all data
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleDelete}
                className="w-full lg:w-auto whitespace-nowrap border-accent text-accent hover:bg-accent hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-grid" strokeWidth={1.5} />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
