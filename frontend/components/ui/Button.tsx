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
    primary: 'bg-blue text-white border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    secondary: 'bg-white text-black border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
    danger: 'bg-red text-white border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
  }

  return (
    <button
      className={`px-6 py-3 font-bold text-sm transition-all shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
