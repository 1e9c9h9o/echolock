'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export interface ToastProps {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose: (id: string) => void
}

export default function Toast({ id, message, type = 'info', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const icons = {
    success: <CheckCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2} />,
    error: <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2} />,
    warning: <AlertTriangle className="h-5 w-5 flex-shrink-0" strokeWidth={2} />,
    info: <Info className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
  }

  const colors = {
    success: 'bg-green text-cream border-black',
    error: 'bg-red text-cream border-black',
    warning: 'bg-yellow text-black border-black',
    info: 'bg-blue text-cream border-black'
  }

  return (
    <div
      className={`${colors[type]} border-2 shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] p-4 mb-3 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {icons[type]}
          <p className="font-mono font-bold text-sm">{message}</p>
        </div>
        <button
          onClick={() => onClose(id)}
          className="hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
