import React from 'react'

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'cancelled'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-success text-white border-2 border-success',
    expired: 'bg-warning text-white border-2 border-warning',
    cancelled: 'bg-black text-white border-2 border-black',
  }

  return (
    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  )
}
