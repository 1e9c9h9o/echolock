import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-black text-white border-2 border-black hover:bg-white hover:text-black',
    secondary: 'bg-white text-black border-2 border-black hover:bg-black hover:text-white',
    danger: 'bg-warning text-white border-2 border-warning hover:bg-white hover:text-warning',
  }

  return (
    <button
      className={`px-6 py-3 font-bold uppercase text-xs tracking-wider transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
