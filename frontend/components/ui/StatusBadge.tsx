import React from 'react'

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'cancelled'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-success text-white',
    expired: 'bg-accent text-white',
    cancelled: 'bg-text-disabled text-white',
  }

  return (
    <span className={`inline-block px-grid-2 py-grid text-xs font-medium uppercase ${styles[status]}`}>
      {status}
    </span>
  )
}
