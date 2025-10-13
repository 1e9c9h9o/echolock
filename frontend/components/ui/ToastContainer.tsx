'use client'

import { useEffect, useState } from 'react'
import Toast, { ToastProps } from './Toast'

export interface ToastData {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

let toastIdCounter = 0
const toastListeners: ((toast: ToastData) => void)[] = []

export function showToast(message: string, type: ToastData['type'] = 'info', duration = 5000) {
  const toast: ToastData = {
    id: `toast-${++toastIdCounter}`,
    message,
    type,
    duration
  }
  toastListeners.forEach(listener => listener(toast))
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const listener = (toast: ToastData) => {
      setToasts(prev => [...prev, toast])
    }
    toastListeners.push(listener)
    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) toastListeners.splice(index, 1)
    }
  }, [])

  const handleClose = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={handleClose} />
        ))}
      </div>
    </div>
  )
}
