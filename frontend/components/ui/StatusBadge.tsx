import React from 'react'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase()

  const styles: Record<string, string> = {
    ARMED: 'bg-blue text-white border-2 border-black',
    PAUSED: 'bg-yellow text-black border-2 border-black',
    TRIGGERED: 'bg-red text-white border-2 border-black',
    CANCELLED: 'bg-black text-white border-2 border-black',
    // Legacy support
    ACTIVE: 'bg-blue text-white border-2 border-black',
    EXPIRED: 'bg-red text-white border-2 border-black',
  }

  const displayText = normalizedStatus === 'ARMED' ? 'ACTIVE' : normalizedStatus

  return (
    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase ${styles[normalizedStatus] || 'bg-gray-500 text-white border-2 border-black'}`}>
      {displayText}
    </span>
  )
}
