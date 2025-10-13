import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'urgent'
}

export default function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)]',
    urgent: 'bg-red text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)]',
  }

  return (
    <div className={`${variants[variant]} p-6 ${className}`}>
      {children}
    </div>
  )
}
