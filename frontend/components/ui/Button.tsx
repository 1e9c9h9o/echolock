import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-orange text-black border-2 border-black hover:bg-yellow active:scale-95',
    secondary: 'bg-black text-white border-2 border-black hover:bg-white hover:text-black active:scale-95',
    danger: 'bg-orange text-black border-2 border-black hover:bg-yellow active:scale-95',
    success: 'bg-orange text-black border-2 border-black hover:bg-yellow active:scale-95',
  }

  return (
    <button
      className={`px-6 py-3 font-bold uppercase text-xs transition-all duration-100 font-mono ${variants[variant]} ${className}`}
      style={{ letterSpacing: '0.06em' }}
      {...props}
    >
      {children}
    </button>
  )
}
