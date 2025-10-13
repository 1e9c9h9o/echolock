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
        <label className="block text-sm font-bold mb-2 text-black">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3
          border-2 border-black
          bg-white text-black
          focus:outline-none focus:ring-2 focus:ring-blue
          disabled:bg-gray-100 disabled:text-gray-400
          text-base
          ${error ? 'border-red' : ''}
          ${className}
        `}
        {...props}
      />
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-600">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-sm font-bold text-red">{error}</p>
      )}
    </div>
  )
}
