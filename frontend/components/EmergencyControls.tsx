'use client'

import { useState } from 'react'
import { AlertTriangle, Pause, Shield } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { securityAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

export default function EmergencyControls({ onPauseComplete }: { onPauseComplete?: () => void }) {
  const [pausing, setPausing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handlePauseAll = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    try {
      setPausing(true)
      const result = await securityAPI.pauseAllSwitches()
      showToast(
        `${result.data.pausedCount} switch(es) paused`,
        'success'
      )
      setShowConfirm(false)
      if (onPauseComplete) {
        onPauseComplete()
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to pause switches',
        'error'
      )
    } finally {
      setPausing(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  return (
    <Card className="!bg-red !bg-opacity-10 border-2 border-red">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-6 w-6 mr-2 text-red" strokeWidth={2} />
        <h3 className="text-xl font-bold text-red">EMERGENCY CONTROLS</h3>
      </div>

      <p className="font-mono text-sm mb-6 text-gray-700">
        Immediately pause all active switches if you suspect your account has been compromised or
        if you need to prevent any switches from triggering.
      </p>

      {!showConfirm ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow bg-opacity-20 border-2 border-black">
            <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="text-sm font-mono">
              <p className="font-bold mb-1">What happens when you pause all switches?</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>All ARMED switches will be set to PAUSED</li>
                <li>No messages will be sent if timers expire</li>
                <li>You can resume switches individually later</li>
                <li>This action is logged in your audit trail</li>
              </ul>
            </div>
          </div>

          <Button
            variant="danger"
            onClick={handlePauseAll}
            disabled={pausing}
            className="w-full"
          >
            <Pause className="h-5 w-5 inline mr-2" strokeWidth={2} />
            PAUSE ALL SWITCHES
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-6 bg-red text-cream border-2 border-black">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 flex-shrink-0" strokeWidth={2} />
              <div>
                <p className="font-bold text-lg mb-2">Are you sure?</p>
                <p className="font-mono text-sm">
                  This will immediately pause ALL active switches. Your encrypted messages will NOT
                  be sent even if check-in timers expire.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={pausing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handlePauseAll}
              disabled={pausing}
              className="flex-1"
            >
              {pausing ? 'Pausing...' : 'Yes, Pause All'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
