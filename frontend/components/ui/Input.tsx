import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wide mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-3
          border-2 border-black
          bg-white text-black
          focus:outline-none focus:ring-2 focus:ring-black
          disabled:bg-gray-100 disabled:text-gray-400
          text-sm
          ${error ? 'border-warning' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-warning font-bold uppercase">{error}</p>
      )}
    </div>
  )
}
