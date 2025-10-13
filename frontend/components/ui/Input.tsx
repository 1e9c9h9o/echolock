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
        <label className="block text-sm font-medium text-secondary mb-grid">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-grid-2 py-grid-2
          border border-border
          bg-white text-secondary
          focus:outline-none focus:border-primary
          disabled:bg-surface disabled:text-text-disabled
          ${error ? 'border-accent' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-grid text-sm text-accent">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-grid text-sm text-text-secondary">{helperText}</p>
      )}
    </div>
  )
}
