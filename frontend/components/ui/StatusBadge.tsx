import React from 'react'

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'cancelled'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-blue text-white border-2 border-black',
    expired: 'bg-red text-white border-2 border-black',
    cancelled: 'bg-black text-white border-2 border-black',
  }

  return (
    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase ${styles[status]}`}>
      {status}
    </span>
  )
}
