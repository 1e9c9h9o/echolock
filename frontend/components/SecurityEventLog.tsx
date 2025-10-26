'use client'

import { useEffect, useState } from 'react'
import { Shield, Lock, Unlock, Key, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Card from '@/components/ui/Card'
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

export default function SecurityEventLog({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const limit = compact ? 10 : 50
      const data = await securityAPI.getAuditLog(limit, 0)
      setEvents(data.events || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load audit log', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN':
      case 'SIGNUP':
        return { icon: <User className="h-4 w-4" strokeWidth={2} />, color: 'text-green' }
      case 'LOGOUT':
        return { icon: <Unlock className="h-4 w-4" strokeWidth={2} />, color: 'text-gray-500' }
      case 'CREATE_SWITCH':
        return { icon: <Key className="h-4 w-4" strokeWidth={2} />, color: 'text-blue' }
      case 'CHECK_IN':
        return { icon: <CheckCircle className="h-4 w-4" strokeWidth={2} />, color: 'text-green' }
      case 'SESSION_REVOKED':
      case 'SESSIONS_REVOKED_ALL':
        return { icon: <XCircle className="h-4 w-4" strokeWidth={2} />, color: 'text-red' }
      case 'EMERGENCY_PAUSE_ALL':
        return { icon: <AlertCircle className="h-4 w-4" strokeWidth={2} />, color: 'text-red' }
      case 'PASSWORD_RESET':
      case 'EMAIL_VERIFIED':
        return { icon: <Shield className="h-4 w-4" strokeWidth={2} />, color: 'text-blue' }
      default:
        return { icon: <Lock className="h-4 w-4" strokeWidth={2} />, color: 'text-gray-600' }
    }
  }

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  if (loading) {
    return (
      <Card className={compact ? '!p-4' : ''}>
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>
            {compact ? 'RECENT ACTIVITY' : 'SECURITY EVENT LOG'}
          </h3>
        </div>
        <p className="font-mono text-sm">Loading events...</p>
      </Card>
    )
  }

  return (
    <Card className={compact ? '!p-4' : ''}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>
            {compact ? 'RECENT ACTIVITY' : 'SECURITY EVENT LOG'}
          </h3>
        </div>
        {!compact && events.length > 0 && (
          <span className="px-3 py-1 bg-gray-200 border border-black text-xs font-bold font-mono">
            {events.length} EVENTS
          </span>
        )}
      </div>

      {!compact && (
        <p className="font-mono text-sm mb-6 text-gray-600">
          Recent security events and account activity
        </p>
      )}

      {events.length === 0 ? (
        <div className="bg-gray-100 p-6 border-2 border-black text-center">
          <p className="font-mono text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const { icon, color } = getEventIcon(event.event_type)
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className={`mt-0.5 ${color}`}>{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm">
                      {formatEventType(event.event_type)}
                    </p>
                    <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(event.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-600 mt-1 space-y-0.5">
                    {event.ip_address && (
                      <p className="truncate">IP: {event.ip_address}</p>
                    )}
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <p className="truncate">
                        {JSON.stringify(event.event_data).length > 100
                          ? JSON.stringify(event.event_data).substring(0, 100) + '...'
                          : JSON.stringify(event.event_data)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
