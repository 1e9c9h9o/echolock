'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  Plane,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronRight
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { showToast } from '@/components/ui/ToastContainer'

interface VacationModeProps {
  switchId: string
  switchTitle: string
  currentExpiresAt: Date
  isVacationModeActive: boolean
  vacationModeUntil?: Date
  onClose: () => void
  onUpdate: (newExpiresAt: Date) => void
}

type DurationOption = {
  label: string
  hours: number
  description: string
}

const DURATION_OPTIONS: DurationOption[] = [
  { label: '3 Days', hours: 72, description: 'Short weekend trip' },
  { label: '1 Week', hours: 168, description: 'Vacation or business trip' },
  { label: '2 Weeks', hours: 336, description: 'Extended vacation' },
  { label: '1 Month', hours: 720, description: 'Maximum duration' },
]

export default function VacationMode({
  switchId,
  switchTitle,
  currentExpiresAt,
  isVacationModeActive,
  vacationModeUntil,
  onClose,
  onUpdate
}: VacationModeProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customDate, setCustomDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [useCustomDate, setUseCustomDate] = useState(false)

  const enableVacationMode = async () => {
    if (!selectedDuration && !customDate) {
      showToast('Please select a duration', 'warning')
      return
    }

    setLoading(true)
    try {
      const body: any = { enabled: true }
      if (useCustomDate && customDate) {
        body.until = new Date(customDate).toISOString()
      } else if (selectedDuration) {
        body.extendHours = selectedDuration
      }

      const response = await fetch(`/api/switches/${switchId}/vacation-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to enable vacation mode')
      }

      const data = await response.json()
      showToast('Vacation mode enabled', 'success')
      onUpdate(new Date(data.data.newExpiresAt))
      onClose()
    } catch (error: any) {
      showToast(error.message || 'Failed to enable vacation mode', 'error')
    } finally {
      setLoading(false)
    }
  }

  const disableVacationMode = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/switches/${switchId}/vacation-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: false })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to disable vacation mode')
      }

      const data = await response.json()
      showToast('Vacation mode disabled. Normal check-in schedule resumed.', 'success')
      onUpdate(new Date(data.data.newExpiresAt))
      onClose()
    } catch (error: any) {
      showToast(error.message || 'Failed to disable vacation mode', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black w-full max-w-md">
        {/* Header */}
        <div className="bg-black text-white py-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">
              Vacation Mode
            </span>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isVacationModeActive ? (
            // Vacation mode is active - show disable option
            <>
              <div className="bg-blue/10 border-2 border-blue p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">Vacation Mode Active</p>
                    <p className="text-sm">
                      Check-ins paused for <strong>"{switchTitle}"</strong> until{' '}
                      {vacationModeUntil?.toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm mb-6">
                Your switch will not require check-ins until the vacation period ends.
                You can disable vacation mode early to resume normal check-in requirements.
              </p>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Keep Active
                </Button>
                <Button
                  variant="primary"
                  onClick={disableVacationMode}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Disabling...' : 'End Vacation Mode'}
                </Button>
              </div>
            </>
          ) : (
            // Vacation mode is not active - show enable options
            <>
              <h2 className="text-xl font-bold mb-2">Enable Vacation Mode</h2>
              <p className="text-sm text-gray-600 mb-6">
                Going on vacation? Extend your check-in window temporarily so you don't
                need to worry about checking in while you're away.
              </p>

              <div className="bg-orange/10 border-2 border-orange p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">Important</p>
                    <p>
                      While in vacation mode, your switch timer is paused.
                      If something happens to you during this time, your message
                      won't be released until the vacation period ends.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wide mb-3">
                  Select Duration
                </p>
                <div className="space-y-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.hours}
                      onClick={() => {
                        setSelectedDuration(option.hours)
                        setUseCustomDate(false)
                      }}
                      className={`w-full p-3 border-2 text-left transition-colors flex items-center justify-between ${
                        selectedDuration === option.hours && !useCustomDate
                          ? 'border-orange bg-orange/10'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                        <Clock className="h-4 w-4" />
                        {option.hours}h
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      setUseCustomDate(true)
                      setSelectedDuration(null)
                    }}
                    className={`w-full p-3 border-2 text-left transition-colors flex items-center justify-between ${
                      useCustomDate
                        ? 'border-orange bg-orange/10'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">Custom Date</p>
                      <p className="text-xs text-gray-500">Choose a specific return date</p>
                    </div>
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {useCustomDate && (
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={getMinDate()}
                    max={getMaxDate()}
                    className="w-full px-4 py-3 border-2 border-black font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum 30 days from today
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={enableVacationMode}
                  disabled={loading || (!selectedDuration && !customDate)}
                  className="flex-1"
                >
                  {loading ? 'Enabling...' : 'Enable'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
