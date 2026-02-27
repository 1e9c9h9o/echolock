import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'urgent' | 'info'
}

export default function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-white border-2 border-black',
    urgent: 'bg-orange text-black border-2 border-black',
    info: 'bg-blue text-black border-2 border-black',
  }

  return (
    <div className={`${variants[variant]} p-6 ${className}`}>
      {children}
    </div>
  )
}
