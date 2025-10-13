'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import { switchesAPI } from '@/lib/api'
import { useSwitchStore } from '@/lib/store'

interface Switch {
  id: string
  title: string
  checkInHours: number
  nextCheckInAt: string
  status: 'active' | 'expired' | 'cancelled'
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
      await loadSwitches()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Check-in failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs uppercase font-bold tracking-wider">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b-2 border-black pb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-4xl font-bold uppercase">Dashboard</h1>
          <Link href="/dashboard/create">
            <Button variant="primary">
              <Plus className="h-5 w-5 inline mr-2" strokeWidth={2} />
              Create Switch
            </Button>
          </Link>
        </div>
        <p className="text-sm uppercase tracking-wide">
          Active switches and check-in status
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-warning text-white p-4 mb-6 border-2 border-warning">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-xs uppercase font-bold">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {switches.length === 0 && !error && (
        <Card className="text-center py-12">
          <div className="w-20 h-20 bg-black mx-auto mb-6 flex items-center justify-center">
            <Plus className="h-12 w-12 text-white" strokeWidth={2} />
          </div>
          <h3 className="text-2xl font-bold uppercase mb-3">
            No Switches Active
          </h3>
          <p className="text-sm uppercase mb-6 tracking-wide">
            Create your first dead man's switch
          </p>
          <Link href="/dashboard/create">
            <Button variant="primary">Create Switch</Button>
          </Link>
        </Card>
      )}

      {/* Switches list */}
      {switches.length > 0 && (
        <div className="space-y-4">
          {switches.map((sw) => (
            <Card key={sw.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <h3 className="text-xl font-bold uppercase">
                      {sw.title}
                    </h3>
                    <StatusBadge status={sw.status} />
                  </div>

                  <div className="space-y-2 text-xs uppercase tracking-wide">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" strokeWidth={2} />
                      <span>
                        Check-in every {sw.checkInHours} hours
                      </span>
                    </div>
                    {sw.status === 'active' && (
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" strokeWidth={2} />
                        <span>
                          Next check-in due{' '}
                          {formatDistanceToNow(new Date(sw.nextCheckInAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                    <p>{sw.recipientCount} recipient(s)</p>
                  </div>
                </div>

                <div className="flex space-x-3 ml-6">
                  {sw.status === 'active' && (
                    <Button
                      variant="primary"
                      onClick={() => handleCheckIn(sw.id)}
                    >
                      Check In
                    </Button>
                  )}
                  <Link href={`/dashboard/switches/${sw.id}`}>
                    <Button variant="secondary">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
