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
    primary: 'bg-blue text-cream border-2 border-black hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none hover:brightness-110 active:scale-95',
    secondary: 'bg-cream text-blue border-2 border-black hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none hover:bg-white active:scale-95',
    danger: 'bg-red text-cream border-2 border-black hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none hover:brightness-110 active:scale-95',
  }

  return (
    <button
      className={`px-8 py-4 font-bold uppercase text-sm transition-all duration-200 shadow-[6px_6px_0px_0px_rgba(33,33,33,1)] font-sans relative overflow-hidden group ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </button>
  )
}
