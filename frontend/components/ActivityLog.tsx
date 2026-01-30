'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Key,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Settings,
  LogOut,
  LogIn,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  Edit,
  Eye,
  Mail,
  Calendar
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { securityAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

interface AuditEvent {
  id: string
  event_type: string
  event_data: any
  ip_address: string
  user_agent: string
  timestamp: string
}

interface ActivityLogProps {
  compact?: boolean
  showFilters?: boolean
  showExport?: boolean
  limit?: number
}

const EVENT_CATEGORIES = {
  auth: ['LOGIN', 'LOGOUT', 'SIGNUP', 'PASSWORD_RESET', 'EMAIL_VERIFIED', 'PASSWORD_CHANGED'],
  switches: ['SWITCH_CREATED', 'SWITCH_CANCELLED', 'SWITCH_TRIGGERED', 'SWITCH_UPDATED', 'CHECK_IN'],
  security: ['SESSION_REVOKED', 'SESSIONS_REVOKED_ALL', 'EMERGENCY_PAUSE_ALL', '2FA_ENABLED', '2FA_DISABLED'],
  settings: ['PROFILE_UPDATED', 'SETTINGS_CHANGED', 'EMAIL_CHANGED'],
  guardians: ['GUARDIAN_ADDED', 'GUARDIAN_REMOVED', 'GUARDIAN_ACK'],
}

const EVENT_ICONS: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  LOGIN: { icon: <LogIn className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  LOGOUT: { icon: <LogOut className="h-4 w-4" />, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  SIGNUP: { icon: <User className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  CHECK_IN: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  SWITCH_CREATED: { icon: <Key className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SWITCH_CANCELLED: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  SWITCH_TRIGGERED: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange', bgColor: 'bg-orange/20' },
  SESSION_REVOKED: { icon: <Shield className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  SESSIONS_REVOKED_ALL: { icon: <Shield className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  EMERGENCY_PAUSE_ALL: { icon: <Pause className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  PASSWORD_RESET: { icon: <Key className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  PASSWORD_CHANGED: { icon: <Key className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EMAIL_VERIFIED: { icon: <Mail className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  PROFILE_UPDATED: { icon: <Settings className="h-4 w-4" />, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  GUARDIAN_ADDED: { icon: <User className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  GUARDIAN_REMOVED: { icon: <User className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  VACATION_MODE_ENABLED: { icon: <Calendar className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  VACATION_MODE_DISABLED: { icon: <Calendar className="h-4 w-4" />, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  TEST_MODE_TRIGGERED: { icon: <Play className="h-4 w-4" />, color: 'text-orange', bgColor: 'bg-orange/20' },
}

const EVENT_DESCRIPTIONS: Record<string, (data: any) => string> = {
  LOGIN: () => 'Logged into account',
  LOGOUT: () => 'Logged out of account',
  SIGNUP: () => 'Created new account',
  CHECK_IN: (data) => data?.title ? `Checked in to "${data.title}"` : 'Checked in to a switch',
  SWITCH_CREATED: (data) => data?.title ? `Created switch "${data.title}"` : 'Created a new switch',
  SWITCH_CANCELLED: (data) => data?.title ? `Cancelled switch "${data.title}"` : 'Cancelled a switch',
  SWITCH_TRIGGERED: (data) => data?.title ? `Switch "${data.title}" was triggered` : 'A switch was triggered',
  SESSION_REVOKED: () => 'Revoked a session',
  SESSIONS_REVOKED_ALL: (data) => `Revoked ${data?.count || 'all other'} sessions`,
  EMERGENCY_PAUSE_ALL: (data) => `Emergency paused ${data?.count || 'all'} switches`,
  PASSWORD_RESET: () => 'Password was reset',
  PASSWORD_CHANGED: () => 'Password was changed',
  EMAIL_VERIFIED: () => 'Email address verified',
  PROFILE_UPDATED: () => 'Profile settings updated',
  GUARDIAN_ADDED: (data) => data?.name ? `Added guardian "${data.name}"` : 'Added a new guardian',
  GUARDIAN_REMOVED: (data) => data?.name ? `Removed guardian "${data.name}"` : 'Removed a guardian',
  VACATION_MODE_ENABLED: (data) => data?.until ? `Vacation mode enabled until ${data.until}` : 'Vacation mode enabled',
  VACATION_MODE_DISABLED: () => 'Vacation mode disabled',
  TEST_MODE_TRIGGERED: (data) => data?.title ? `Test drill for "${data.title}"` : 'Test drill triggered',
}

export default function ActivityLog({
  compact = false,
  showFilters = true,
  showExport = true,
  limit = 50
}: ActivityLogProps) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<string>('all')
  const pageSize = compact ? 10 : limit

  useEffect(() => {
    loadEvents()
  }, [page])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await securityAPI.getAuditLog(pageSize, page * pageSize)
      setEvents(data.events || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load activity log', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    const categoryEvents = EVENT_CATEGORIES[filter as keyof typeof EVENT_CATEGORIES] || []
    return events.filter(e => categoryEvents.includes(e.event_type))
  }, [events, filter])

  const getEventDisplay = (eventType: string) => {
    return EVENT_ICONS[eventType] || {
      icon: <Activity className="h-4 w-4" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  }

  const getEventDescription = (event: AuditEvent): string => {
    const descFn = EVENT_DESCRIPTIONS[event.event_type]
    if (descFn) {
      return descFn(event.event_data)
    }
    return event.event_type
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Event', 'Description', 'IP Address', 'Details']
    const rows = events.map(e => [
      format(new Date(e.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      e.event_type,
      getEventDescription(e),
      e.ip_address || '',
      JSON.stringify(e.event_data || {})
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echolock-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Activity log exported', 'success')
  }

  const totalPages = Math.ceil(total / pageSize)

  if (loading && events.length === 0) {
    return (
      <Card className={compact ? '!p-4' : ''}>
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>
            ACTIVITY LOG
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span className="font-mono text-sm">Loading activity...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={compact ? '!p-4' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Activity className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>
            ACTIVITY LOG
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {showExport && events.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold border-2 border-black hover:bg-gray-100 transition-colors"
              title="Export to CSV"
            >
              <Download className="h-3 w-3" />
              EXPORT
            </button>
          )}
          {!compact && (
            <span className="px-3 py-1 bg-gray-200 border border-black text-xs font-bold font-mono">
              {total} TOTAL
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && !compact && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              filter === 'all'
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:border-black'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter('auth')}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              filter === 'auth'
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:border-black'
            }`}
          >
            AUTH
          </button>
          <button
            onClick={() => setFilter('switches')}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              filter === 'switches'
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:border-black'
            }`}
          >
            SWITCHES
          </button>
          <button
            onClick={() => setFilter('security')}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              filter === 'security'
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:border-black'
            }`}
          >
            SECURITY
          </button>
          <button
            onClick={() => setFilter('guardians')}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              filter === 'guardians'
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:border-black'
            }`}
          >
            GUARDIANS
          </button>
        </div>
      )}

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-gray-100 p-6 border-2 border-black text-center">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-mono text-sm">No activity to display</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const { icon, color, bgColor } = getEventDisplay(event.event_type)
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className={`p-2 rounded ${bgColor} ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm">
                      {getEventDescription(event)}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-mono text-gray-500 whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-gray-500 mt-1">
                    {event.ip_address && (
                      <span>IP: {event.ip_address}</span>
                    )}
                    <span className="hidden sm:inline">
                      {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <span className="text-xs font-mono text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
