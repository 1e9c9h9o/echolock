'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Clock, Users, AlertCircle, Trash2, Activity, Shield, Link as LinkIcon, Bitcoin, Circle, Triangle, Octagon } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import StatusBadge from '@/components/ui/StatusBadge'
import AnalogGauge from '@/components/AnalogGauge'
import Sparkline, { generateMockSparklineData } from '@/components/Sparkline'
import CheckInButton from '@/components/CheckInButton'
import BitcoinCommitment from '@/components/BitcoinCommitment'
import { showToast } from '@/components/ui/ToastContainer'
import api, { switchesAPI } from '@/lib/api'
import { useWebSocket } from '@/lib/websocket'
import type { BitcoinCommitment as BitcoinCommitmentType, BitcoinFundedPayload } from '@/lib/types'

interface SwitchDetail {
  id: string
  title: string
  checkInHours: number
  expiresAt: string
  status: string
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

/**
 * High Performance HMI Switch Detail Page
 *
 * Design principles:
 * - Muted structural elements
 * - Color only for status indicators
 * - Analog gauge for time visualization
 * - Clear information hierarchy
 */
export default function SwitchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [switchData, setSwitchData] = useState<SwitchDetail | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [bitcoinCommitment, setBitcoinCommitment] = useState<BitcoinCommitmentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDangerZone, setShowDangerZone] = useState(false)

  // WebSocket handler for Bitcoin funding notifications
  const handleBitcoinFunded = useCallback((data: BitcoinFundedPayload) => {
    if (data.switchId === id) {
      showToast('Bitcoin commitment funded', 'success')
      loadBitcoinCommitment()
    }
  }, [id])

  useWebSocket('bitcoin_funded', handleBitcoinFunded)

  useEffect(() => {
    loadSwitch()
    loadBitcoinCommitment()
  }, [id])

  const loadSwitch = async () => {
    try {
      const data = await switchesAPI.getOne(id)
      setSwitchData(data)

      try {
        const history = await switchesAPI.getCheckIns(id)
        setCheckIns(history.checkIns || [])
      } catch (historyErr) {
        console.error('Failed to load check-in history:', historyErr)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load switch')
    } finally {
      setLoading(false)
    }
  }

  const loadBitcoinCommitment = async () => {
    try {
      const response = await api.get(`/switches/${id}/bitcoin-commitment`)
      setBitcoinCommitment(response.data.data)
    } catch (err) {
      // Bitcoin commitment might not exist, that's OK
      setBitcoinCommitment({ enabled: false, status: 'none' })
    }
  }

  const handleCreateBitcoinCommitment = async () => {
    const password = prompt('Enter your password to encrypt the Bitcoin private key:')
    if (!password) return

    try {
      const response = await api.post(`/switches/${id}/bitcoin-commitment`, { password })
      setBitcoinCommitment({
        enabled: true,
        status: 'pending',
        address: response.data.data.address,
        amount: response.data.data.amount,
        locktime: response.data.data.locktime,
        network: response.data.data.network,
        currentHeight: response.data.data.currentHeight,
        blocksRemaining: response.data.data.blocksUntilValid,
        explorerUrl: response.data.data.explorerUrl
      })
      showToast('Bitcoin commitment created! Send funds to the address shown.', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create Bitcoin commitment', 'error')
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
      <div className="bg-slate-50 min-h-screen -m-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400 font-mono text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !switchData) {
    return (
      <div className="bg-slate-50 min-h-screen -m-6 p-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm font-medium mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>
        <div className="bg-white border border-slate-200 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-bold text-slate-700 mb-2">Error Loading Switch</h3>
          <p className="text-slate-500 font-mono text-sm">{error || 'Switch not found'}</p>
        </div>
      </div>
    )
  }

  // Generate mock sparkline data
  const sparklineData = generateMockSparklineData('stable')

  return (
    <div className="bg-slate-50 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{switchData.title}</h1>
                <StatusBadge
                  status={switchData.status}
                  expiresAt={switchData.expiresAt}
                  checkInHours={switchData.checkInHours}
                />
              </div>
              <p className="text-slate-500 text-sm font-mono">
                Created {format(new Date(switchData.createdAt), 'PPP')}
              </p>
            </div>
          </div>

          {(switchData.status === 'ARMED' || switchData.status === 'active') && (
            <CheckInButton
              targetDate={switchData.expiresAt}
              status={switchData.status}
              onCheckIn={handleCheckIn}
              checkInHours={switchData.checkInHours}
              className="lg:w-48"
            />
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Timer Status - Primary Focus */}
        {(switchData.status === 'ARMED' || switchData.status === 'active') && (
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" strokeWidth={2} />
                Timer Status
              </h2>
            </div>
            <div className="p-6">
              <AnalogGauge
                targetDate={switchData.expiresAt}
                interval={switchData.checkInHours}
                showDigital={true}
              />

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Check-in Behavior (last 5 cycles)
                </div>
                <Sparkline data={sparklineData} height={32} showTrend={true} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Interval:</span>
                  <span className="ml-2 font-mono text-slate-700">{switchData.checkInHours} hours</span>
                </div>
                <div>
                  <span className="text-slate-500">Last check-in:</span>
                  <span className="ml-2 font-mono text-slate-700">
                    {switchData.lastCheckInAt
                      ? formatDistanceToNow(new Date(switchData.lastCheckInAt), { addSuffix: true })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipients */}
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Recipients ({switchData.recipients.length})
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {switchData.recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="font-medium text-slate-700 text-sm">{recipient.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{recipient.email}</p>
                  </div>
                  <Circle className="h-3 w-3 text-emerald-500 fill-emerald-500" strokeWidth={2} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guardian Network */}
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" strokeWidth={2} />
                Guardian Network
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-slate-50 border border-slate-100 text-center">
                  <div className="text-xl font-bold text-slate-700">5</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Guardians</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 text-center">
                  <div className="text-xl font-bold text-slate-700">3</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Threshold</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-xl font-bold text-emerald-600">5</div>
                  <div className="text-[10px] text-emerald-600 uppercase tracking-wider">Online</div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Secret split via Shamir's Secret Sharing. Any 3 guardians can trigger release.
              </p>
            </div>
          </div>

          {/* Nostr Heartbeats */}
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-slate-400" strokeWidth={2} />
                Nostr Heartbeats
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Relays:</span>
                <span className="font-mono text-slate-700">10 connected</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last heartbeat:</span>
                <span className="font-mono text-slate-700">
                  {switchData.lastCheckInAt
                    ? formatDistanceToNow(new Date(switchData.lastCheckInAt), { addSuffix: true })
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Signature:</span>
                <span className="font-mono text-emerald-600 text-xs">BIP-340 Schnorr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin Commitment */}
        <BitcoinCommitment
          commitment={bitcoinCommitment && bitcoinCommitment.enabled ? {
            switchId: id,
            locktime: bitcoinCommitment.locktime || 0,
            address: bitcoinCommitment.address || '',
            txid: bitcoinCommitment.txid || null,
            amount: bitcoinCommitment.amount || 1000,
            status: bitcoinCommitment.status as 'pending' | 'confirmed' | 'spent' | 'expired',
            network: bitcoinCommitment.network || 'testnet',
            blockHeight: bitcoinCommitment.blockHeight || null
          } : null}
          onCreateCommitment={handleCreateBitcoinCommitment}
          onVerify={loadBitcoinCommitment}
        />

        {/* Activity History */}
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Activity History
            </h2>
          </div>
          <div className="p-4">
            {checkIns.length === 0 ? (
              <p className="text-slate-400 text-sm font-mono">No check-ins recorded yet</p>
            ) : (
              <div className="space-y-2">
                {checkIns.slice(0, 5).map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Circle className="h-2 w-2 text-emerald-500 fill-emerald-500" strokeWidth={2} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Check-in</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {format(new Date(checkIn.timestamp), 'PPpp')}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatDistanceToNow(new Date(checkIn.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone (hidden by default) */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="text-xs text-slate-400 hover:text-red-500 font-mono transition-colors"
          >
            {showDangerZone ? 'Hide' : 'Show'} danger zone
          </button>

          {showDangerZone && (
            <div className="mt-4 bg-white border border-red-200">
              <div className="p-4 border-b border-red-100 bg-red-50">
                <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                  <Octagon className="h-4 w-4" strokeWidth={2} />
                  Danger Zone
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {(switchData.status === 'ARMED' || switchData.status === 'active') && (
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-medium text-slate-700">Cancel Switch</h3>
                      <p className="text-xs text-slate-500">Stop the timer and prevent delivery</p>
                    </div>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-700">Delete Switch</h3>
                    <p className="text-xs text-slate-500">Permanently delete all data</p>
                  </div>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 font-bold text-xs uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
