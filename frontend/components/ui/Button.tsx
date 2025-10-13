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
    primary: 'bg-blue text-cream border-2 border-black hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
    secondary: 'bg-cream text-blue border-2 border-black hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
    danger: 'bg-red text-cream border-2 border-black hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
  }

  return (
    <button
      className={`px-8 py-4 font-bold uppercase text-sm transition-all shadow-[6px_6px_0px_0px_rgba(33,33,33,1)] font-sans ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
