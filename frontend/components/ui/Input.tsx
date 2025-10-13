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
        <label className="block text-sm font-bold uppercase mb-3 text-black font-sans">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-4
          border-2 border-black
          bg-white text-black
          focus:outline-none focus:ring-4 focus:ring-blue/30 focus:border-blue
          disabled:bg-gray-100 disabled:text-gray-400
          text-base
          font-mono
          transition-all duration-200
          hover:shadow-[4px_4px_0px_0px_rgba(93,93,255,0.2)]
          focus:shadow-[4px_4px_0px_0px_rgba(93,93,255,0.4)]
          ${error ? 'border-red focus:ring-red/30' : ''}
          ${className}
        `}
        {...props}
      />
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-700 font-mono">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-sm font-bold text-red font-mono">{error}</p>
      )}
    </div>
  )
}
