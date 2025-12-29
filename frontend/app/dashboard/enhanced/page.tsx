'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, RefreshCw, Bell, BellOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import CountdownTimer from '@/components/CountdownTimer'
import ProgressBar from '@/components/ProgressBar'
import CheckInButton from '@/components/CheckInButton'
import LoadingMessage from '@/components/LoadingMessage'
import SwitchFilters, { type FilterState } from '@/components/SwitchFilters'
import BatchActions, { SelectionCheckbox } from '@/components/BatchActions'
import { QRCodeButton } from '@/components/QRCodeModal'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import { switchesAPI } from '@/lib/api'
import { useSwitchStore } from '@/lib/store'
import { showToast } from '@/components/ui/ToastContainer'
import { useKeyboardShortcuts, DASHBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'
import { wsService, useWebSocket } from '@/lib/websocket'
import { notificationService, useNotificationPermission } from '@/lib/notifications'

interface Switch {
  id: string
  title: string
  checkInHours: number
  expiresAt: string
  status: string  // API returns 'ARMED', 'EXPIRED', 'CANCELLED', etc.
  createdAt: string
  recipientCount: number
}

export default function EnhancedDashboardPage() {
  const router = useRouter()
  const { switches, setSwitches } = useSwitchStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    searchQuery: '',
    sortBy: 'created',
    sortOrder: 'desc',
  })

  const { permission, requestPermission, isSupported } = useNotificationPermission()

  // Load switches
  const loadSwitches = useCallback(async () => {
    try {
      const data = await switchesAPI.getAll()
      setSwitches(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load switches')
    } finally {
      setLoading(false)
    }
  }, [setSwitches])

  useEffect(() => {
    loadSwitches()
  }, [loadSwitches])

  // WebSocket real-time updates
  useWebSocket('switch_update', (data: unknown) => {
    console.log('Switch updated:', data)
    loadSwitches()
  })

  useWebSocket('switch_triggered', (data: { title: string; id: string }) => {
    console.log('Switch triggered:', data)
    notificationService.showSwitchTriggered(data.title, data.id)
    loadSwitches()
  })

  // Handle check-in
  const handleCheckIn = async (id: string) => {
    try {
      await switchesAPI.checkIn(id)
      showToast('Check-in successful! Timer reset.', 'success')
      await loadSwitches()

      // Send notification
      const sw = switches.find((s) => s.id === id)
      if (sw) {
        notificationService.showCheckInSuccess(sw.title, sw.checkInHours)
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Check-in failed. Please try again.'
      showToast(msg, 'error')
    }
  }

  // Handle batch delete
  const handleBatchDelete = async (ids: string[]) => {
    for (const id of ids) {
      await switchesAPI.delete(id)
    }
    setSelectedIds([])
    await loadSwitches()
  }

  // Filtering and sorting logic
  const filteredSwitches = useMemo(() => {
    let result = [...switches]

    // Filter by status (case-insensitive, API returns uppercase)
    if (filters.status !== 'all') {
      const statusMap: Record<string, string> = {
        'active': 'ARMED',
        'expired': 'EXPIRED',
        'cancelled': 'CANCELLED'
      }
      const apiStatus = statusMap[filters.status] || filters.status
      result = result.filter((sw) => sw.status === apiStatus)
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter((sw) => sw.title.toLowerCase().includes(query))
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any

      switch (filters.sortBy) {
        case 'created':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case 'nextCheckIn':
          aVal = new Date(a.expiresAt).getTime()
          bVal = new Date(b.expiresAt).getTime()
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        default:
          return 0
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [switches, filters])

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedIds(filteredSwitches.map((sw) => sw.id))
  }

  const handleDeselectAll = () => {
    setSelectedIds([])
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    shortcuts: [
      {
        ...DASHBOARD_SHORTCUTS.CREATE_SWITCH,
        action: () => router.push('/dashboard/create-wizard'),
      },
      {
        ...DASHBOARD_SHORTCUTS.DEMO_MODE,
        action: () => router.push('/dashboard/demo'),
      },
      {
        ...DASHBOARD_SHORTCUTS.REFRESH,
        action: () => {
          loadSwitches()
          showToast('Switches refreshed', 'info')
        },
      },
      {
        ...DASHBOARD_SHORTCUTS.SELECT_ALL,
        action: handleSelectAll,
      },
      {
        ...DASHBOARD_SHORTCUTS.DESELECT_ALL,
        action: handleDeselectAll,
      },
      {
        ...DASHBOARD_SHORTCUTS.SETTINGS,
        action: () => router.push('/dashboard/settings'),
      },
    ],
  })

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-5xl font-bold">DASHBOARD</h1>
          <div className="flex gap-4">
            {/* Notification permission */}
            {isSupported && permission !== 'granted' && (
              <Button variant="secondary" onClick={requestPermission}>
                <Bell className="h-5 w-5 mr-2" strokeWidth={2} />
                Enable Notifications
              </Button>
            )}

            {/* Refresh */}
            <Button variant="secondary" onClick={() => loadSwitches()}>
              <RefreshCw className="h-5 w-5" strokeWidth={2} />
            </Button>

            {/* Demo */}
            <Link href="/dashboard/demo">
              <Button variant="secondary">
                <Sparkles className="h-5 w-5 mr-2" strokeWidth={2} />
                Try Demo
              </Button>
            </Link>

            {/* Create */}
            <Link href="/dashboard/create-wizard">
              <Button variant="primary">
                <Plus className="h-5 w-5 mr-2" strokeWidth={2} />
                Create Switch
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-lg font-mono">
          Real-time monitoring with advanced features
        </p>
      </div>

      {/* WebSocket status */}
      <div className="mb-6">
        {wsService.isConnected() ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 border-2 border-black text-sm font-mono">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
            <span>Real-time updates active</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border-2 border-black text-sm font-mono">
            <div className="w-2 h-2 bg-gray-600 rounded-full" />
            <span>Offline mode</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red text-cream p-6 mb-8 border-2 border-black">
          <p className="font-mono font-bold">{error}</p>
        </div>
      )}

      {/* Filters */}
      <SwitchFilters
        onFilterChange={setFilters}
        totalCount={switches.length}
        filteredCount={filteredSwitches.length}
      />

      {/* Empty state */}
      {switches.length === 0 && !error && (
        <Card className="text-center py-16">
          <div className="w-24 h-24 bg-blue mx-auto mb-8 flex items-center justify-center border-2 border-black">
            <Plus className="h-16 w-16 text-cream" strokeWidth={2} />
          </div>
          <h3 className="text-3xl font-bold mb-4">NO SWITCHES ACTIVE</h3>
          <p className="text-lg font-mono mb-8">Create your first dead man's switch</p>
          <Link href="/dashboard/create-wizard">
            <Button variant="primary">Create Switch</Button>
          </Link>
        </Card>
      )}

      {/* Switches grid */}
      {filteredSwitches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSwitches.map((sw) => (
            <Card key={sw.id} className="flex flex-col relative">
              {/* Selection checkbox */}
              <div className="absolute top-4 left-4 z-10">
                <SelectionCheckbox
                  checked={selectedIds.includes(sw.id)}
                  onChange={() => toggleSelection(sw.id)}
                />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between mb-4 ml-10">
                <h3 className="text-xl font-bold flex-1 break-words">{sw.title}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sw.status} />
                  <QRCodeButton switchId={sw.id} switchTitle={sw.title} />
                </div>
              </div>

              {/* Switch Info */}
              <div className="space-y-4 mb-6 flex-1">
                {/* Countdown Timer */}
                {sw.status === 'ARMED' && (
                  <CountdownTimer
                    targetDate={sw.expiresAt}
                    interval={sw.checkInHours}
                    showIcon={true}
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

                <p className="font-mono text-xs text-gray-600">
                  {sw.recipientCount} recipient(s) • Created{' '}
                  {new Date(sw.createdAt).toLocaleDateString()}
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

      {/* No results from filter */}
      {switches.length > 0 && filteredSwitches.length === 0 && (
        <Card className="text-center py-12">
          <h3 className="text-2xl font-bold mb-4">No switches match your filters</h3>
          <p className="text-base font-mono mb-6">Try adjusting your search or filters</p>
          <Button variant="secondary" onClick={() => setFilters({
            status: 'all',
            searchQuery: '',
            sortBy: 'created',
            sortOrder: 'desc',
          })}>
            Clear Filters
          </Button>
        </Card>
      )}

      {/* Batch actions */}
      <BatchActions
        selectedIds={selectedIds}
        totalCount={filteredSwitches.length}
        switches={switches}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDeleteSelected={handleBatchDelete}
      />

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsHelp />
    </div>
  )
}
