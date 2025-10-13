import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'urgent'
}

export default function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(33,33,33,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] transition-all',
    urgent: 'bg-red text-cream border-2 border-black shadow-[6px_6px_0px_0px_rgba(33,33,33,1)]',
  }

  return (
    <div className={`${variants[variant]} p-8 ${className}`}>
      {children}
    </div>
  )
}
