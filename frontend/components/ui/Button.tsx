import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium transition-colors border'

  const variants = {
    primary: 'bg-primary text-white border-primary hover:bg-[#0052A3]',
    secondary: 'bg-white text-secondary border-border hover:bg-surface',
    ghost: 'bg-transparent text-secondary border-transparent hover:bg-surface',
  }

  const sizes = {
    sm: 'px-grid-2 py-grid text-sm',
    md: 'px-grid-3 py-grid-2 text-base',
    lg: 'px-grid-4 py-grid-3 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
