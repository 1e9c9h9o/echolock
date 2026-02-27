'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type UIMode = 'simple' | 'advanced'

interface UIPreferencesContextType {
  uiMode: UIMode
  setUIMode: (mode: UIMode) => void
  toggleUIMode: () => void
}

const UIPreferencesContext = createContext<UIPreferencesContextType | undefined>(undefined)

const STORAGE_KEY = 'echolock-ui-mode'

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [uiMode, setUIModeState] = useState<UIMode>('simple')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY) as UIMode
    if (saved === 'simple' || saved === 'advanced') {
      setUIModeState(saved)
    }
  }, [])

  const setUIMode = (mode: UIMode) => {
    setUIModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  const toggleUIMode = () => {
    const newMode = uiMode === 'simple' ? 'advanced' : 'simple'
    setUIMode(newMode)
  }

  if (!mounted) {
    return null
  }

  return (
    <UIPreferencesContext.Provider value={{ uiMode, setUIMode, toggleUIMode }}>
      {children}
    </UIPreferencesContext.Provider>
  )
}

export function useUIPreferences() {
  const context = useContext(UIPreferencesContext)
  if (context === undefined) {
    throw new Error('useUIPreferences must be used within a UIPreferencesProvider')
  }
  return context
}
