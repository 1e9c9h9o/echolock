import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

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
  type,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordType = type === 'password'
  const inputType = isPasswordType && showPassword ? 'text' : type

  return (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-black">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          className={`
            w-full px-4 py-3
            border-2 border-black
            bg-white text-black
            focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange
            disabled:bg-gray-100 disabled:text-gray-400
            text-sm
            font-mono
            transition-all duration-150
            ${isPasswordType ? 'pr-12' : ''}
            ${error ? 'border-orange focus:ring-orange' : ''}
            ${className}
          `}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/50 hover:text-black transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p className="mt-2 text-xs text-black/60 font-mono">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-xs font-bold text-orange font-mono">{error}</p>
      )}
    </div>
  )
}
