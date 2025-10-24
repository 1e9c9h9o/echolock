'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-3 border-2 border-black dark:border-white bg-white dark:bg-gray-900 hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-black" strokeWidth={2} />
      ) : (
        <Sun className="h-5 w-5 text-white" strokeWidth={2} />
      )}
    </button>
  )
}
