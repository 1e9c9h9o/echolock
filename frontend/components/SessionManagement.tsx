'use client'

import { useEffect, useState } from 'react'
import { Monitor, Smartphone, Tablet, MapPin, Clock, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { securityAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

interface Session {
  id: string
  ip_address: string
  user_agent: string
  device_name: string
  location: string
  is_current: boolean
  created_at: string
  last_active: string
  expires_at: string
  revoked: boolean
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await securityAPI.getSessions()
      setSessions(data.sessions || [])
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load sessions', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId)
      await securityAPI.revokeSession(sessionId)
      showToast('Session revoked successfully', 'success')
      await loadSessions()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to revoke session', 'error')
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeAll = async () => {
    if (!confirm('Revoke all other sessions? You will remain logged in on this device.')) {
      return
    }

    try {
      setRevoking('all')
      const result = await securityAPI.revokeAllSessions()
      showToast(`${result.data.revokedCount} session(s) revoked`, 'success')
      await loadSessions()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to revoke sessions', 'error')
    } finally {
      setRevoking(null)
    }
  }

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5" strokeWidth={2} />
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-5 w-5" strokeWidth={2} />
    }
    return <Monitor className="h-5 w-5" strokeWidth={2} />
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center mb-4">
          <Monitor className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className="text-xl font-bold">ACTIVE SESSIONS</h3>
        </div>
        <p className="font-mono text-sm">Loading sessions...</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Monitor className="h-5 w-5 mr-2" strokeWidth={2} />
          <h3 className="text-xl font-bold">ACTIVE SESSIONS</h3>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="secondary"
            onClick={handleRevokeAll}
            disabled={revoking === 'all'}
            className="!px-4 !py-2 text-xs"
          >
            {revoking === 'all' ? 'Revoking...' : 'Revoke All Others'}
          </Button>
        )}
      </div>

      <p className="font-mono text-sm mb-6 text-gray-600">
        Manage active login sessions across all your devices
      </p>

      {sessions.length === 0 ? (
        <div className="bg-gray-100 p-6 border-2 border-black text-center">
          <p className="font-mono text-sm">No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border-2 border-black ${
                session.is_current ? 'bg-green bg-opacity-10' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getDeviceIcon(session.user_agent)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold">
                        {session.device_name || 'Unknown Device'}
                      </h4>
                      {session.is_current && (
                        <span className="px-2 py-1 bg-green border border-black text-xs font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm font-mono">
                      {session.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-3 w-3" strokeWidth={2} />
                          <span>{session.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-3 w-3" strokeWidth={2} />
                        <span>
                          Last active:{' '}
                          {formatDistanceToNow(new Date(session.last_active), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        IP: {session.ip_address}
                      </div>
                    </div>
                  </div>
                </div>

                {!session.is_current && (
                  <Button
                    variant="danger"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revoking === session.id}
                    className="!px-4 !py-2 text-xs"
                  >
                    {revoking === session.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-6 p-4 bg-blue bg-opacity-10 border-2 border-black">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-blue flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="text-sm font-mono">
              <p className="font-bold mb-1">Security Tip</p>
              <p className="text-gray-700">
                If you see an unfamiliar session, revoke it immediately and change your password.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
