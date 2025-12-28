import React from 'react'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase()

  const styles: Record<string, string> = {
    ARMED: 'bg-orange text-black border-2 border-black',
    PAUSED: 'bg-yellow text-black border-2 border-black',
    TRIGGERED: 'bg-black text-white border-2 border-black',
    CANCELLED: 'bg-black text-white border-2 border-black',
    // Legacy support
    ACTIVE: 'bg-orange text-black border-2 border-black',
    EXPIRED: 'bg-black text-white border-2 border-black',
  }

  const displayText = normalizedStatus === 'ARMED' ? 'ACTIVE' : normalizedStatus

  return (
    <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[normalizedStatus] || 'bg-black text-white border-2 border-black'}`}>
      {displayText}
    </span>
  )
}
