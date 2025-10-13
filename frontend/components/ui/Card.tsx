import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'urgent'
}

export default function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-white border-2 border-black',
    urgent: 'bg-warning text-white border-2 border-warning',
  }

  return (
    <div className={`${variants[variant]} p-6 ${className}`}>
      {children}
    </div>
  )
}
