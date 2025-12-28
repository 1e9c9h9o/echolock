import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export default function Input({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-black">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3
          border-2 border-black
          bg-white text-black
          focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange
          disabled:bg-gray-100 disabled:text-gray-400
          text-sm
          font-mono
          transition-all duration-150
          ${error ? 'border-orange focus:ring-orange' : ''}
          ${className}
        `}
        {...props}
      />
      {helperText && !error && (
        <p className="mt-2 text-xs text-black/60 font-mono">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-xs font-bold text-orange font-mono">{error}</p>
      )}
    </div>
  )
}
