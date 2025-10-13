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
        <p className="text-base font-mono font-bold">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-5xl font-bold">DASHBOARD</h1>
          <Link href="/dashboard/create">
            <Button variant="primary">
              <Plus className="h-5 w-5 inline mr-2" strokeWidth={2} />
              Create Switch
            </Button>
          </Link>
        </div>
        <p className="text-lg font-mono">
          Active switches and check-in status
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red text-cream p-6 mb-8 border-2 border-black">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="font-mono font-bold">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {switches.length === 0 && !error && (
        <Card className="text-center py-16">
          <div className="w-24 h-24 bg-blue mx-auto mb-8 flex items-center justify-center border-2 border-black">
            <Plus className="h-16 w-16 text-cream" strokeWidth={2} />
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
        <div className="space-y-6">
          {switches.map((sw) => (
            <Card key={sw.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-2xl font-bold">
                      {sw.title}
                    </h3>
                    <StatusBadge status={sw.status} />
                  </div>

                  <div className="space-y-3 font-mono text-base">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-3" strokeWidth={2} />
                      <span>
                        Check-in every {sw.checkInHours} hours
                      </span>
                    </div>
                    {sw.status === 'active' && (
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 mr-3" strokeWidth={2} />
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

                <div className="flex gap-4 ml-8">
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
