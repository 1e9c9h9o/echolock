import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-border p-grid-4 ${className}`}>
      {children}
    </div>
  )
}
