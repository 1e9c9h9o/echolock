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
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-grid-6">
        <div className="flex items-center justify-between mb-grid-3">
          <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
          <Link href="/dashboard/create">
            <Button variant="primary">
              <Plus className="h-5 w-5 inline mr-grid" strokeWidth={1.5} />
              Create switch
            </Button>
          </Link>
        </div>
        <p className="text-text-secondary">
          Manage your dead man's switches
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-accent bg-opacity-10 border border-accent p-grid-3 mb-grid-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-accent mr-grid-2 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-accent text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {switches.length === 0 && !error && (
        <Card className="text-center py-grid-6">
          <Shield className="h-16 w-16 text-text-disabled mx-auto mb-grid-3" strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-secondary mb-grid-2">
            No switches yet
          </h3>
          <p className="text-text-secondary mb-grid-4">
            Create your first dead man's switch to get started
          </p>
          <Link href="/dashboard/create">
            <Button variant="primary">Create your first switch</Button>
          </Link>
        </Card>
      )}

      {/* Switches list */}
      {switches.length > 0 && (
        <div className="grid gap-grid-4">
          {switches.map((sw) => (
            <Card key={sw.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-grid-3 mb-grid-2">
                    <h3 className="text-lg font-bold text-secondary">
                      {sw.title}
                    </h3>
                    <StatusBadge status={sw.status} />
                  </div>

                  <div className="space-y-grid text-sm text-text-secondary">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-grid" strokeWidth={1.5} />
                      <span>
                        Check-in every {sw.checkInHours} hours
                      </span>
                    </div>
                    {sw.status === 'active' && (
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-grid" strokeWidth={1.5} />
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

                <div className="flex space-x-grid-2 ml-grid-4">
                  {sw.status === 'active' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCheckIn(sw.id)}
                    >
                      Check in
                    </Button>
                  )}
                  <Link href={`/dashboard/switches/${sw.id}`}>
                    <Button variant="secondary" size="sm">
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
